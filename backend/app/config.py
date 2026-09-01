import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    PROJECT_NAME: str = "SettleIQ"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    
    # Server configuration
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite:///./settleiq.db"
    
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
