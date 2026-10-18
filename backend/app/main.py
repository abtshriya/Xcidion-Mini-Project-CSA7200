import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.database.session import engine, get_db, SessionLocal
from backend.app.models.entities import Base, NetworkEvent
from backend.app.services.ingestion.demo_generator import seed_initial_data, generate_demo_scenario
from backend.app.websocket.manager import ws_manager

# API Routers
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.events import router as events_router
from backend.app.api.v1.alerts import router as alerts_router
from backend.app.api.v1.incidents import router as incidents_router
from backend.app.api.v1.trajectory import router as trajectory_router
from backend.app.api.v1.sensors import router as sensors_router
from backend.app.api.v1.rules import router as rules_router
from backend.app.api.v1.models import router as models_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.admin import router as admin_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("xcidion.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables are created and initial seed data is loaded
    logger.info("Initializing XCIDION database schema...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        seed_initial_data(db)
        # If database is fresh with no events, generate an initial complete demonstration campaign
        if db.query(NetworkEvent).count() == 0:
            logger.info("Fresh installation detected: seeding initial demonstration campaign...")
            generate_demo_scenario(db, "complete_campaign")
    finally:
        db.close()
    
    logger.info("XCIDION backend engine started successfully.")
    yield
    logger.info("XCIDION backend engine shutting down gracefully.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=f"{settings.PROJECT_FULL_NAME} — {settings.TAGLINE}",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under API v1
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1)
app.include_router(dashboard_router, prefix=api_v1)
app.include_router(events_router, prefix=api_v1)
app.include_router(alerts_router, prefix=api_v1)
app.include_router(incidents_router, prefix=api_v1)
app.include_router(trajectory_router, prefix=api_v1)
app.include_router(sensors_router, prefix=api_v1)
app.include_router(rules_router, prefix=api_v1)
app.include_router(models_router, prefix=api_v1)
app.include_router(analytics_router, prefix=api_v1)
app.include_router(audit_router, prefix=api_v1)
app.include_router(admin_router, prefix=api_v1)

# Health Root Endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "full_name": settings.PROJECT_FULL_NAME,
        "tagline": settings.TAGLINE,
        "version": "1.0.0"
    }

# Authenticated Real-time WebSocket Endpoint
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive client messages or queries
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection encountered exception: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
