import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is in sys.path
backend_path = str(Path(__file__).resolve().parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.config import settings
from app.api.health import router as health_router
from app.api.upload import router as upload_router
from app.api.reconciliation import router as reconciliation_router
from app.database.session import init_db

# Initialize database schema on startup
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SettleIQ - AI-powered settlement reconciliation and exception resolution API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["System"])
app.include_router(upload_router, prefix=settings.API_V1_STR, tags=["Ingestion"])
app.include_router(reconciliation_router, prefix=settings.API_V1_STR, tags=["Reconciliation"])

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to SettleIQ API",
        "version": settings.VERSION,
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
