import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "XCIDION"
    PROJECT_FULL_NAME: str = "Explainable Network Intrusion Detection System"
    TAGLINE: str = "From Raw Network Traffic to an Explainable Attack Story."
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True
    
    # Security & Auth
    SECRET_KEY: str = "xcidion-insecure-secret-key-change-in-production-726eff-59ffe7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # Database
    # Default is PostgreSQL, with seamless SQLite fallback if PostgreSQL is not running
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/xcidion"
    SQLITE_FALLBACK_URL: str = "sqlite:///./xcidion_dev.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Monitoring & Collectors
    ZEEK_LOG_DIR: str = "./data/zeek"
    SURICATA_EVE_PATH: str = "./data/suricata/eve.json"
    TSHARK_PATH: str = "tshark"
    UPLOAD_DIR: str = "./data/uploads"
    MODEL_DIR: str = "./models"
    SAMPLES_DIR: str = "./data/samples"
    
    # Performance & Limits
    MAX_UPLOAD_SIZE_MB: int = 100
    PCAP_PROCESSING_TIMEOUT_SEC: int = 120
    DEMO_MODE_DEFAULT: bool = True

settings = Settings()
