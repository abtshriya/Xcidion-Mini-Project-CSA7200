from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.core.security import get_current_user
from backend.app.models.entities import User, Device
from backend.app.schemas.schemas import DeviceResponse, DeviceInvestigationResponse
from backend.app.services.devices.device_service import DeviceService

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("", response_model=List[DeviceResponse])
def list_devices(
    risk_level: str = Query(None, description="Filter by risk level (low, medium, high, critical)"),
    status: str = Query(None, description="Filter by status (online, offline)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns discovered devices in the inventory.
    Accessible to all authenticated users (Admin, Analyst, Viewer).
    """
    # Auto sync devices from traffic if inventory is empty
    if db.query(Device).count() == 0:
        DeviceService.sync_devices_from_traffic(db)

    query = db.query(Device)
    if risk_level:
        query = query.filter(Device.risk_level == risk_level.lower())
    if status:
        query = query.filter(Device.status == status.lower())

    return query.order_by(Device.last_seen.desc()).all()

@router.post("/resync", response_model=List[DeviceResponse])
def resync_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers inventory synchronization from network event telemetry.
    """
    return DeviceService.sync_devices_from_traffic(db)

@router.get("/{ip_or_id}", response_model=DeviceResponse)
def get_device(
    ip_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns single device by IP or unique ID.
    """
    dev = db.query(Device).filter(
        (Device.ip_address == ip_or_id) | (Device.id == ip_or_id)
    ).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found in inventory")
    return dev

@router.get("/{ip_or_id}/investigate", response_model=DeviceInvestigationResponse)
def investigate_device(
    ip_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deep Device Investigation dossier:
    - Profile & open ports
    - Associated alerts
    - Attack DNA timeline (confirmed events vs inferred relationships)
    - Threat Trajectory (probabilistic prediction)
    """
    investigation_data = DeviceService.investigate_device(db, ip_or_id)
    return investigation_data
