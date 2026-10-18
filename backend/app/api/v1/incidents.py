import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import (
    Incident, IncidentAlert, IncidentNote, Alert, NetworkEvent, User, AuditLog
)
from backend.app.schemas.schemas import (
    IncidentResponse, IncidentUpdate, IncidentCreate, IncidentNoteCreate,
    IncidentNoteResponse, AttackDNAResponse
)
from backend.app.core.security import get_current_user, require_role
from backend.app.services.correlation.attack_dna import attack_dna_correlator

router = APIRouter(prefix="/incidents", tags=["Incidents"])

VALID_INCIDENT_STATUSES = ["open", "investigating", "contained", "resolved", "closed"]

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)
    
    if severity:
        query = query.filter(Incident.severity == severity.lower())
    if status:
        query = query.filter(Incident.status == status.lower())
    if search:
        query = query.filter(
            (Incident.title.contains(search)) |
            (Incident.description.contains(search)) |
            (Incident.id.contains(search))
        )
        
    incidents = query.order_by(Incident.last_observed_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for inc in incidents:
        alert_count = db.query(IncidentAlert).filter(IncidentAlert.incident_id == inc.id).count()
        results.append({
            "id": inc.id,
            "title": inc.title,
            "description": inc.description,
            "severity": inc.severity,
            "status": inc.status,
            "first_observed_at": inc.first_observed_at,
            "last_observed_at": inc.last_observed_at,
            "assigned_user_id": inc.assigned_user_id,
            "correlation_method": inc.correlation_method,
            "correlation_evidence": inc.correlation_evidence,
            "correlation_confidence": inc.correlation_confidence,
            "created_at": inc.created_at,
            "updated_at": inc.updated_at,
            "alert_count": alert_count,
            "involved_ips": inc.correlation_evidence.get("adversary_sources", []) + inc.correlation_evidence.get("target_hosts", []) if inc.correlation_evidence else [],
            "notes": []
        })
    return results

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    alert_count = db.query(IncidentAlert).filter(IncidentAlert.incident_id == inc.id).count()
    notes = db.query(IncidentNote).filter(IncidentNote.incident_id == inc.id).order_by(IncidentNote.created_at.asc()).all()

    return {
        "id": inc.id,
        "title": inc.title,
        "description": inc.description,
        "severity": inc.severity,
        "status": inc.status,
        "first_observed_at": inc.first_observed_at,
        "last_observed_at": inc.last_observed_at,
        "assigned_user_id": inc.assigned_user_id,
        "correlation_method": inc.correlation_method,
        "correlation_evidence": inc.correlation_evidence,
        "correlation_confidence": inc.correlation_confidence,
        "created_at": inc.created_at,
        "updated_at": inc.updated_at,
        "alert_count": alert_count,
        "involved_ips": inc.correlation_evidence.get("adversary_sources", []) + inc.correlation_evidence.get("target_hosts", []) if inc.correlation_evidence else [],
        "notes": notes
    }

@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    data: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if data.status:
        st = data.status.lower()
        if st not in VALID_INCIDENT_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status '{st}'. Permitted: {VALID_INCIDENT_STATUSES}")
        old_status = inc.status
        inc.status = st
        inc.updated_at = datetime.datetime.now(datetime.timezone.utc)
        
        db.add(AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            action="incident_status_update",
            resource_type="incident",
            resource_id=incident_id,
            outcome="success",
            metadata_json={"old_status": old_status, "new_status": st}
        ))

    if data.severity:
        inc.severity = data.severity.lower()
    if data.assigned_user_id is not None:
        inc.assigned_user_id = data.assigned_user_id
    if data.title:
        inc.title = data.title
    if data.description:
        inc.description = data.description

    db.commit()
    db.refresh(inc)
    
    alert_count = db.query(IncidentAlert).filter(IncidentAlert.incident_id == inc.id).count()
    notes = db.query(IncidentNote).filter(IncidentNote.incident_id == inc.id).all()
    
    return {
        "id": inc.id,
        "title": inc.title,
        "description": inc.description,
        "severity": inc.severity,
        "status": inc.status,
        "first_observed_at": inc.first_observed_at,
        "last_observed_at": inc.last_observed_at,
        "assigned_user_id": inc.assigned_user_id,
        "correlation_method": inc.correlation_method,
        "correlation_evidence": inc.correlation_evidence,
        "correlation_confidence": inc.correlation_confidence,
        "created_at": inc.created_at,
        "updated_at": inc.updated_at,
        "alert_count": alert_count,
        "involved_ips": inc.correlation_evidence.get("adversary_sources", []) + inc.correlation_evidence.get("target_hosts", []) if inc.correlation_evidence else [],
        "notes": notes
    }

@router.post("/{incident_id}/notes", response_model=IncidentNoteResponse)
def add_incident_note(
    incident_id: str,
    data: IncidentNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    note = IncidentNote(
        incident_id=incident_id,
        user_id=current_user.id,
        username=current_user.username,
        note=data.note
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.get("/{incident_id}/timeline")
def get_incident_timeline(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    links = db.query(IncidentAlert).filter(IncidentAlert.incident_id == incident_id).all()
    alert_ids = [l.alert_id for l in links]
    alerts = db.query(Alert).filter(Alert.id.in_(alert_ids)).order_by(Alert.created_at.asc()).all() if alert_ids else []
    
    event_ids = [a.event_id for a in alerts if a.event_id]
    events = db.query(NetworkEvent).filter(NetworkEvent.id.in_(event_ids)).all() if event_ids else []
    events_map = {e.id: e for e in events}
    
    timeline = []
    for a in alerts:
        evt = events_map.get(a.event_id)
        timeline.append({
            "alert_id": a.id,
            "timestamp": a.created_at,
            "title": a.title,
            "severity": a.severity,
            "category": a.detection_category,
            "source": a.detection_source,
            "source_ip": evt.source_ip if evt else "N/A",
            "destination_ip": evt.destination_ip if evt else "N/A",
            "protocol": evt.protocol if evt else "N/A",
            "evidence": a.evidence
        })
        
    return {"incident_id": incident_id, "timeline": timeline}

@router.get("/{incident_id}/attack-dna", response_model=AttackDNAResponse)
def get_incident_attack_dna(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    links = db.query(IncidentAlert).filter(IncidentAlert.incident_id == incident_id).all()
    alert_ids = [l.alert_id for l in links]
    alerts = db.query(Alert).filter(Alert.id.in_(alert_ids)).all() if alert_ids else []
    
    event_ids = [a.event_id for a in alerts if a.event_id]
    events = db.query(NetworkEvent).filter(NetworkEvent.id.in_(event_ids)).all() if event_ids else []
    
    events_map = {
        e.id: {
            "source_ip": e.source_ip,
            "destination_ip": e.destination_ip,
            "source_port": e.source_port,
            "destination_port": e.destination_port,
            "protocol": e.protocol
        }
        for e in events
    }
    
    alert_dicts = [
        {
            "id": a.id,
            "event_id": a.event_id,
            "title": a.title,
            "description": a.description,
            "detection_source": a.detection_source,
            "detection_category": a.detection_category,
            "severity": a.severity,
            "confidence": a.confidence,
            "evidence": a.evidence,
            "created_at": a.created_at
        }
        for a in alerts
    ]
    
    graph_data = attack_dna_correlator.generate_incident_graph(incident_id, alert_dicts, events_map)
    return graph_data
