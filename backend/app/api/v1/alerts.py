import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import Alert, NetworkEvent, User, AuditLog, IncidentAlert, Incident
from backend.app.schemas.schemas import AlertResponse, AlertUpdate
from backend.app.core.security import get_current_user, require_role

router = APIRouter(prefix="/alerts", tags=["Alerts"])

VALID_STATUSES = ["new", "acknowledged", "investigating", "resolved", "closed"]

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = None,
    status: Optional[str] = None,
    detection_source: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)
    
    if severity:
        query = query.filter(Alert.severity == severity.lower())
    if status:
        query = query.filter(Alert.status == status.lower())
    if detection_source:
        query = query.filter(Alert.detection_source == detection_source.lower())
    if category:
        query = query.filter(Alert.detection_category.ilike(f"%{category}%"))
    if search:
        query = query.filter(
            (Alert.title.contains(search)) |
            (Alert.description.contains(search)) |
            (Alert.id.contains(search))
        )
        
    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return alerts

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_by_id(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert_status(
    alert_id: str,
    data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if data.status:
        st = data.status.lower()
        if st not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status '{st}'. Permitted: {VALID_STATUSES}")
        old_status = alert.status
        alert.status = st
        alert.updated_at = datetime.datetime.now(datetime.timezone.utc)
        
        # Audit status transition
        db.add(AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            action="alert_status_update",
            resource_type="alert",
            resource_id=alert_id,
            outcome="success",
            metadata_json={"old_status": old_status, "new_status": st}
        ))

    if data.severity:
        alert.severity = data.severity.lower()

    db.commit()
    db.refresh(alert)
    return alert

@router.get("/{alert_id}/related-events")
def get_alert_related_events(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    event = db.query(NetworkEvent).filter(NetworkEvent.id == alert.event_id).first()
    if not event:
        return {"alert_id": alert_id, "primary_event": None, "correlated_events": []}
        
    # Find nearby events on same IP pair within 1 hour
    correlated = db.query(NetworkEvent).filter(
        (NetworkEvent.source_ip == event.source_ip) |
        (NetworkEvent.destination_ip == event.destination_ip)
    ).order_by(NetworkEvent.event_timestamp.desc()).limit(20).all()

    return {
        "alert_id": alert_id,
        "primary_event": event,
        "correlated_events": correlated
    }

@router.get("/{alert_id}/incident")
def get_alert_incident(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    link = db.query(IncidentAlert).filter(IncidentAlert.alert_id == alert_id).first()
    if not link:
        return {"incident_id": None, "incident": None}
    inc = db.query(Incident).filter(Incident.id == link.incident_id).first()
    return {"incident_id": link.incident_id, "incident": inc}
