from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import (
    Incident, IncidentAlert, Alert, ThreatPrediction, User, AuditLog
)
from backend.app.schemas.schemas import ThreatTrajectoryResponse, TrajectoryFeedbackCreate
from backend.app.core.security import get_current_user, require_role
from backend.app.services.trajectory.threat_trajectory import threat_trajectory_engine

router = APIRouter(prefix="/trajectory", tags=["Threat Trajectory"])

@router.get("", response_model=List[ThreatTrajectoryResponse])
def get_all_trajectories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incidents = db.query(Incident).order_by(Incident.last_observed_at.desc()).limit(20).all()
    results = []
    
    for inc in incidents:
        links = db.query(IncidentAlert).filter(IncidentAlert.incident_id == inc.id).all()
        alert_ids = [l.alert_id for l in links]
        alerts = db.query(Alert).filter(Alert.id.in_(alert_ids)).all() if alert_ids else []
        alert_dicts = [
            {
                "id": a.id,
                "title": a.title,
                "detection_category": a.detection_category,
                "severity": a.severity,
                "created_at": a.created_at
            }
            for a in alerts
        ]
        
        # Check if analyst gave feedback
        pred_record = db.query(ThreatPrediction).filter(ThreatPrediction.incident_id == inc.id).first()
        feedback = pred_record.feedback if pred_record else None
        
        traj = threat_trajectory_engine.estimate_trajectory(inc.id, alert_dicts, feedback=feedback)
        results.append(traj)

    return results

@router.get("/{incident_id}", response_model=ThreatTrajectoryResponse)
def get_incident_trajectory(
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
    alert_dicts = [
        {
            "id": a.id,
            "title": a.title,
            "detection_category": a.detection_category,
            "severity": a.severity,
            "created_at": a.created_at
        }
        for a in alerts
    ]
    
    pred_record = db.query(ThreatPrediction).filter(ThreatPrediction.incident_id == incident_id).first()
    feedback = pred_record.feedback if pred_record else None

    traj = threat_trajectory_engine.estimate_trajectory(incident_id, alert_dicts, feedback=feedback)
    return traj

@router.post("/{incident_id}/feedback")
def submit_trajectory_feedback(
    incident_id: str,
    data: TrajectoryFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    valid_feedbacks = ["useful", "incorrect", "inconclusive"]
    if data.feedback not in valid_feedbacks:
        raise HTTPException(status_code=400, detail=f"Invalid feedback. Allowed: {valid_feedbacks}")

    pred = db.query(ThreatPrediction).filter(ThreatPrediction.incident_id == incident_id).first()
    if not pred:
        pred = ThreatPrediction(
            id=f"PRED-{incident_id}",
            incident_id=incident_id,
            current_stage="Estimated",
            feedback=data.feedback
        )
        db.add(pred)
    else:
        pred.feedback = data.feedback
        
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="trajectory_feedback_submission",
        resource_type="threat_prediction",
        resource_id=incident_id,
        outcome="success",
        metadata_json={"feedback": data.feedback, "notes": data.notes}
    ))
    db.commit()

    return {"message": "Analyst feedback recorded successfully", "feedback": data.feedback}
