"""
Database Connection & Session Factory
Manages the SQLAlchemy SQLite engine lifecycle, enforces relational foreign-key
constraints via SQLite PRAGMA hooks, and provides the get_db() dependency
generator for FastAPI request-scoped transaction management.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Configure SQLite engine with foreign key enforcement
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    echo=False
)

if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Enforces SQLite foreign key constraints on every new connection."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency yielding a thread-local database session.
    Guarantees session cleanup and connection return on request termination.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Idempotently initializes all registered SQLAlchemy tables in the database."""
    from app.database.base import Base
    import app.models  # Ensure all models are registered with Base.metadata
    Base.metadata.create_all(bind=engine)
