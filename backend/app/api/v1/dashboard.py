import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.session import get_db, engine
from backend.app.models.entities import (
    NetworkEvent, Alert, Incident, Sensor, User
)
from backend.app.core.security import get_current_user
from backend.app.services.ingestion.pcap_processor import pcap_processor
from backend.app.services.trajectory.threat_trajectory import threat_trajectory_engine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_events = db.query(NetworkEvent).count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["new", "acknowledged", "investigating"])).count()
    critical_alerts = db.query(Alert).filter(Alert.severity == "critical").count()
    open_incidents = db.query(Incident).filter(Incident.status.in_(["open", "investigating"])).count()
    
    # Monitored hosts: count distinct source and destination IPs
    src_ips = db.query(NetworkEvent.source_ip).distinct()
    dst_ips = db.query(NetworkEvent.destination_ip).distinct()
    unique_ips = len(set([ip[0] for ip in src_ips] + [ip[0] for ip in dst_ips]))
    
    # Sensor health
    sensors = db.query(Sensor).all()
    online_sensors = sum(1 for s in sensors if s.status == "online")
    total_sensors = len(sensors)

    return {
        "total_events": total_events,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "open_incidents": open_incidents,
        "monitored_hosts": unique_ips,
        "sensor_health": {
            "online": online_sensors,
            "total": total_sensors,
            "status": "healthy" if online_sensors == total_sensors and total_sensors > 0 else "degraded"
        }
    }

@router.get("/traffic")
def get_dashboard_traffic(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns time-bucketed event counts and protocol breakdown.
    """
    events = db.query(NetworkEvent).order_by(NetworkEvent.event_timestamp.desc()).limit(300).all()
    
    # Aggregate by hour
    buckets: Dict[str, int] = {}
    protocols: Dict[str, int] = {}
    
    for e in reversed(events):
        hour_str = e.event_timestamp.strftime("%H:%M")
        buckets[hour_str] = buckets.get(hour_str, 0) + 1
        proto = e.protocol.upper()
        protocols[proto] = protocols.get(proto, 0) + 1

    return {
        "timeline": [{"time": k, "count": v} for k, v in buckets.items()],
        "protocols": [{"protocol": k, "count": v} for k, v in protocols.items()]
    }

@router.get("/threats")
def get_dashboard_threats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(Alert).all()
    
    severities = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    categories: Dict[str, int] = {}
    sources: Dict[str, int] = {}

    for a in alerts:
        sev = a.severity.lower()
        severities[sev] = severities.get(sev, 0) + 1
        
        cat = a.detection_category
        categories[cat] = categories.get(cat, 0) + 1
        
        src = a.detection_source
        sources[src] = sources.get(src, 0) + 1

    return {
        "severity_distribution": [{"severity": k, "count": v} for k, v in severities.items()],
        "category_distribution": [{"category": k, "count": v} for k, v in categories.items()],
        "source_distribution": [{"source": k, "count": v} for k, v in sources.items()]
    }

@router.get("/recent-events")
def get_dashboard_recent_events(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    events = db.query(NetworkEvent).order_by(NetworkEvent.event_timestamp.desc()).limit(limit).all()
    results = []
    for e in events:
        # Check if an alert was triggered on this event
        alert = db.query(Alert).filter(Alert.event_id == e.id).first()
        results.append({
            "id": e.id,
            "timestamp": e.event_timestamp,
            "source_ip": e.source_ip,
            "destination_ip": e.destination_ip,
            "protocol": e.protocol,
            "source_port": e.source_port,
            "destination_port": e.destination_port,
            "detection_name": alert.title if alert else "Normal Flow",
            "severity": alert.severity if alert else "normal",
            "detection_source": alert.detection_source if alert else "baseline",
            "has_alert": alert is not None,
            "alert_id": alert.id if alert else None
        })
    return results

@router.get("/system-health")
def get_dashboard_system_health(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify DB connectivity
    db_ok = False
    try:
        with engine.connect() as conn:
            db_ok = True
    except Exception:
        db_ok = False

    tshark_ok = pcap_processor.is_tshark_available()
    sensors = db.query(Sensor).all()
    latest_event = db.query(NetworkEvent).order_by(NetworkEvent.created_at.desc()).first()

    return {
        "backend": "online",
        "database": "online" if db_ok else "offline",
        "database_type": engine.name,
        "tshark_available": tshark_ok,
        "zeek_integration": "active" if any(s.source_type == "zeek" and s.status == "online" for s in sensors) else "standby",
        "suricata_integration": "active" if any(s.source_type == "suricata" and s.status == "online" for s in sensors) else "standby",
        "sensors_active": sum(1 for s in sensors if s.status == "online"),
        "total_sensors": len(sensors),
        "last_event_received": latest_event.created_at if latest_event else None
    }
