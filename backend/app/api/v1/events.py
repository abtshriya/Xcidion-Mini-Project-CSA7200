import os
import shutil
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import NetworkEvent, User, AuditLog
from backend.app.schemas.schemas import NetworkEventResponse
from backend.app.core.security import get_current_user, require_role
from backend.app.services.ingestion.pipeline import ingestion_pipeline
from backend.app.services.ingestion.demo_generator import generate_demo_scenario
from backend.app.services.ingestion.pcap_processor import pcap_processor
from backend.app.core.config import settings

router = APIRouter(prefix="/events", tags=["Network Events"])

@router.get("", response_model=List[NetworkEventResponse])
def get_network_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    protocol: Optional[str] = None,
    source_ip: Optional[str] = None,
    destination_ip: Optional[str] = None,
    sensor_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(NetworkEvent)
    
    if protocol:
        query = query.filter(NetworkEvent.protocol.ilike(f"%{protocol}%"))
    if source_ip:
        query = query.filter(NetworkEvent.source_ip == source_ip)
    if destination_ip:
        query = query.filter(NetworkEvent.destination_ip == destination_ip)
    if sensor_id:
        query = query.filter(NetworkEvent.sensor_id == sensor_id)
    if search:
        query = query.filter(
            (NetworkEvent.source_ip.contains(search)) |
            (NetworkEvent.destination_ip.contains(search)) |
            (NetworkEvent.protocol.contains(search)) |
            (NetworkEvent.id.contains(search))
        )
        
    events = query.order_by(NetworkEvent.event_timestamp.desc()).offset(skip).limit(limit).all()
    return events

@router.get("/statistics")
def get_event_statistics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(NetworkEvent).count()
    flows = db.query(NetworkEvent).filter(NetworkEvent.event_type == "flow").count()
    suricata = db.query(NetworkEvent).filter(NetworkEvent.event_type == "suricata_alert").count()
    pcap = db.query(NetworkEvent).filter(NetworkEvent.event_type == "pcap_packet").count()
    return {
        "total_events": total,
        "standard_flows": flows,
        "suricata_alerts": suricata,
        "pcap_packets": pcap
    }

@router.get("/{event_id}", response_model=NetworkEventResponse)
def get_network_event_by_id(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(NetworkEvent).filter(NetworkEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Network event not found")
    return event

@router.post("/import")
def import_network_event(
    event_payload: Dict[str, Any],
    source_type: str = "generic",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    res = ingestion_pipeline.process_and_persist(db, event_payload, source_type=source_type)
    return res

@router.post("/import-pcap")
async def import_pcap_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    if not file.filename.endswith((".pcap", ".pcapng", ".cap")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .pcap, .pcapng, and .cap files are permitted.")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    result = pcap_processor.process_pcap_file(db, temp_path)
    
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="pcap_import",
        resource_type="pcap",
        resource_id=file.filename,
        outcome="success" if result.get("status") == "success" else "warning",
        metadata_json=result
    ))
    db.commit()
    
    return result

@router.post("/demo-generate")
def trigger_demo_scenario(
    scenario: str = Query("complete_campaign", description="Scenario: normal, port_scan, brute_force, data_exfiltration, complete_campaign"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    res = generate_demo_scenario(db, scenario)
    return res
