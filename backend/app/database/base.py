"""
SQLAlchemy Declarative Base Registry
Provides the shared declarative Base class for all ORM database models across
the SettleIQ schema, facilitating table schema reflection and relationship mapping.
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()
