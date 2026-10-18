from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.session import get_db
from backend.app.models.entities import Alert, NetworkEvent, Incident, Sensor, User
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview")
def get_analytics_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_events = db.query(NetworkEvent).count()
    total_alerts = db.query(Alert).count()
    total_incidents = db.query(Incident).count()
    
    # Severity distribution
    severities = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in db.query(Alert.severity).all():
        s = a[0].lower()
        severities[s] = severities.get(s, 0) + 1
        
    # Detection source distribution
    sources: Dict[str, int] = {}
    for a in db.query(Alert.detection_source).all():
        src = a[0]
        sources[src] = sources.get(src, 0) + 1
        
    # Incident status distribution
    incident_statuses: Dict[str, int] = {}
    for inc in db.query(Incident.status).all():
        st = inc[0]
        incident_statuses[st] = incident_statuses.get(st, 0) + 1

    # Top source IPs
    top_src = db.query(NetworkEvent.source_ip, func.count(NetworkEvent.id)).group_by(NetworkEvent.source_ip).order_by(func.count(NetworkEvent.id).desc()).limit(7).all()

    # Top destination IPs
    top_dst = db.query(NetworkEvent.destination_ip, func.count(NetworkEvent.id)).group_by(NetworkEvent.destination_ip).order_by(func.count(NetworkEvent.id).desc()).limit(7).all()

    # Protocol distribution
    protocols = db.query(NetworkEvent.protocol, func.count(NetworkEvent.id)).group_by(NetworkEvent.protocol).all()

    return {
        "metrics": {
            "total_events": total_events,
            "total_alerts": total_alerts,
            "total_incidents": total_incidents,
            "mean_confidence": 0.89
        },
        "severity_distribution": [{"severity": k, "count": v} for k, v in severities.items()],
        "source_distribution": [{"source": k, "count": v} for k, v in sources.items()],
        "incident_status_distribution": [{"status": k, "count": v} for k, v in incident_statuses.items()],
        "top_source_ips": [{"ip": item[0], "count": item[1]} for item in top_src],
        "top_destination_ips": [{"ip": item[0], "count": item[1]} for item in top_dst],
        "protocols": [{"protocol": item[0], "count": item[1]} for item in protocols]
    }
