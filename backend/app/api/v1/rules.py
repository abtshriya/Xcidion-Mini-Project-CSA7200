import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import DetectionRule, User, AuditLog
from backend.app.schemas.schemas import RuleResponse, RuleCreate, RuleUpdate, RuleTestRequest, RuleTestResponse
from backend.app.core.security import get_current_user, require_role
from backend.app.services.detection.feature_extraction import extract_features_from_event
from backend.app.services.detection.rule_engine import RuleEngine

router = APIRouter(prefix="/rules", tags=["Detection Rules"])

@router.get("", response_model=List[RuleResponse])
def get_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DetectionRule).all()

@router.get("/{rule_id}", response_model=RuleResponse)
def get_rule_by_id(rule_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Detection rule not found")
    return rule

@router.patch("/{rule_id}", response_model=RuleResponse)
def update_rule(
    rule_id: str,
    data: RuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Detection rule not found")

    if data.name:
        rule.name = data.name
    if data.description:
        rule.description = data.description
    if data.severity:
        rule.severity = data.severity
    if data.configuration is not None:
        rule.configuration = data.configuration
    if data.enabled is not None:
        rule.enabled = data.enabled
        
    rule.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="rule_modification",
        resource_type="detection_rule",
        resource_id=rule_id,
        outcome="success",
        metadata_json={"enabled": rule.enabled, "severity": rule.severity}
    ))
    db.commit()
    db.refresh(rule)
    return rule

@router.post("/{rule_id}/test", response_model=RuleTestResponse)
def test_rule(
    rule_id: str,
    data: RuleTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    # Extract features safely
    vec, feat_dict = extract_features_from_event(data.event_payload)
    
    tester = RuleEngine(rules=[{
        "id": rule.id,
        "name": rule.name,
        "description": rule.description,
        "category": rule.category,
        "severity": rule.severity,
        "configuration": rule.configuration,
        "enabled": True,
        "version": rule.version
    }])
    
    matches = tester.evaluate_event(data.event_payload, feat_dict)
    matched = len(matches) > 0
    
    return {
        "matched": matched,
        "rule_id": rule.id,
        "rule_name": rule.name,
        "evidence": matches[0]["evidence"] if matched else None,
        "severity": matches[0]["severity"] if matched else None
    }
