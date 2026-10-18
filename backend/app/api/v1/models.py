import os
import uuid
import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import MLModel, User, AuditLog
from backend.app.schemas.schemas import MLModelResponse, DatasetResponse, ModelTrainRequest
from backend.app.core.security import get_current_user, require_role
from backend.app.services.detection.ml_engine import ml_engine_instance
from backend.app.services.detection.feature_extraction import FEATURE_NAMES

router = APIRouter(tags=["Datasets & Models"])

DATASETS_REGISTRY = [
    {
        "id": "DS-BENCHMARK-FLOWS",
        "name": "XCIDION Multi-Class Flow Benchmark v1.0",
        "record_count": 1500,
        "feature_count": len(FEATURE_NAMES),
        "classes": ["Normal", "Reconnaissance", "Brute Force", "Denial of Service", "Exfiltration"],
        "description": "Standardized flow benchmark dataset containing balanced network traffic vectors spanning five core kill-chain categories.",
        "file_path": "./data/samples/flow_benchmark_v1.csv",
        "ready_for_training": True
    },
    {
        "id": "DS-UNSW-NB15-SUBSET",
        "name": "UNSW-NB15 Evaluation Subset",
        "record_count": 8500,
        "feature_count": len(FEATURE_NAMES),
        "classes": ["Normal", "Fuzzers", "Analysis", "Backdoors", "DoS", "Exploits", "Generic", "Reconnaissance"],
        "description": "Curated subset of the UNSW-NB15 network intrusion dataset mapped into XCIDION 12-dimensional flow feature schema.",
        "file_path": "./data/samples/unsw_nb15_sample.csv",
        "ready_for_training": True
    }
]

@router.get("/datasets", response_model=List[DatasetResponse])
def get_datasets(current_user: User = Depends(get_current_user)):
    return DATASETS_REGISTRY

@router.get("/models", response_model=List[MLModelResponse])
def get_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(MLModel).all()

@router.post("/models/train", response_model=MLModelResponse)
def train_new_model(
    request: ModelTrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    metrics = ml_engine_instance.train_model()
    
    new_version = f"1.{db.query(MLModel).count() + 1}.0"
    model_id = f"MOD-{uuid.uuid4().hex[:8].upper()}"
    
    # Deactivate older models
    db.query(MLModel).update({MLModel.status: "inactive"})
    
    new_model = MLModel(
        id=model_id,
        name=request.model_name or f"RandomForestClassifier {new_version}",
        algorithm=request.algorithm,
        version=new_version,
        feature_schema_version="1.0",
        dataset_reference=request.dataset_id,
        model_path=ml_engine_instance.model_path,
        metrics=metrics,
        status="active"
    )
    db.add(new_model)
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="model_training_and_activation",
        resource_type="ml_model",
        resource_id=model_id,
        outcome="success",
        metadata_json=metrics
    ))
    db.commit()
    db.refresh(new_model)
    return new_model

@router.post("/models/{model_id}/activate")
def activate_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    model = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    db.query(MLModel).update({MLModel.status: "inactive"})
    model.status = "active"
    
    db.add(AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="model_activation",
        resource_type="ml_model",
        resource_id=model_id,
        outcome="success"
    ))
    db.commit()
    return {"message": f"Model {model_id} activated successfully"}
