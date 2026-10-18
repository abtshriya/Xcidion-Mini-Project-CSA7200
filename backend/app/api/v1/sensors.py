import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import Sensor, NetworkEvent, User, AuditLog
from backend.app.schemas.schemas import SensorResponse, SensorCreate, SensorUpdate
from backend.app.core.security import get_current_user, require_role

router = APIRouter(prefix="/sensors", tags=["Sensors"])

@router.get("", response_model=List[SensorResponse])
def get_sensors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sensors = db.query(Sensor).all()
    # Check heartbeat freshness (if > 10 min without heartbeat, mark degraded)
    now = datetime.datetime.now(datetime.timezone.utc)
    for s in sensors:
        if s.status != "offline" and (now - s.last_heartbeat_at.replace(tzinfo=datetime.timezone.utc)).total_seconds() > 600:
            s.status = "degraded"
    db.commit()
    return sensors

@router.post("", response_model=SensorResponse)
def register_sensor(
    data: SensorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    existing = db.query(Sensor).filter(Sensor.id == data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sensor with this ID already registered")
        
    sensor = Sensor(
        id=data.id,
        name=data.name,
        hostname=data.hostname,
        source_type=data.source_type,
        status="online",
        configuration_metadata=data.configuration_metadata or {}
    )
    db.add(sensor)
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="sensor_registration",
        resource_type="sensor",
        resource_id=data.id,
        outcome="success"
    ))
    db.commit()
    db.refresh(sensor)
    return sensor

@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor_by_id(
    sensor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor

@router.patch("/{sensor_id}", response_model=SensorResponse)
def update_sensor(
    sensor_id: str,
    data: SensorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
        
    if data.name:
        sensor.name = data.name
    if data.status:
        sensor.status = data.status
    if data.configuration_metadata is not None:
        sensor.configuration_metadata = data.configuration_metadata
        
    sensor.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(sensor)
    return sensor

@router.get("/{sensor_id}/health")
def get_sensor_health(
    sensor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
        
    events_count = db.query(NetworkEvent).filter(NetworkEvent.sensor_id == sensor_id).count()
    return {
        "sensor_id": sensor.id,
        "name": sensor.name,
        "status": sensor.status,
        "total_events_received": events_count,
        "last_heartbeat": sensor.last_heartbeat_at,
        "last_event": sensor.last_event_at,
        "configuration": sensor.configuration_metadata
    }
