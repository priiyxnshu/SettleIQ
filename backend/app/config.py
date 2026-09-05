"""
Application Configuration & Environment Settings
Defines the Pydantic BaseSettings specification for SettleIQ.
Loads local environment variables from backend/.env, managing database connection
strings, CORS origins, server bindings, and LLM provider credentials.
"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_DB_PATH = (_BACKEND_DIR / "settleiq.db").as_posix()

class Settings(BaseSettings):
    """
    Centralized runtime configuration for SettleIQ backend services.
    Automatically binds environment variables with fallback defaults.
    """
    model_config = SettingsConfigDict(
        env_file=(_BACKEND_DIR / ".env", ".env"),
        extra="ignore"
    )
    
    PROJECT_NAME: str = "SettleIQ"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    
    # Server configuration
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_PATH}"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # LLM Settings (for future AI phase)
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""

settings = Settings()
