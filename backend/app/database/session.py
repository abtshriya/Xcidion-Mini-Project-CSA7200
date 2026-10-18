import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

logger = logging.getLogger("xcidion.database")

Base = declarative_base()

def get_engine():
    # Attempt PostgreSQL if configured, otherwise fallback to SQLite for local zero-dependency execution
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("postgresql"):
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                connect_args={"connect_timeout": 3}
            )
            # Test connection
            with engine.connect() as conn:
                logger.info("Connected to PostgreSQL database successfully.")
            return engine
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL at {db_url} ({e}). "
            f"Falling back to local SQLite database at {settings.SQLITE_FALLBACK_URL} for local self-hosted operation."
        )
    
    # Fallback SQLite engine
    sqlite_engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    return sqlite_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
