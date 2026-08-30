from fastapi import APIRouter
from app.config import settings

router = APIRouter()

@router.get("/health", summary="System Health Check")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
