from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# Auth & User
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "analyst"  # admin, analyst, viewer

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

# Sensors
class SensorCreate(BaseModel):
    id: str
    name: str
    hostname: str
    source_type: str  # zeek, suricata, tshark, synthetic
    configuration_metadata: Optional[Dict[str, Any]] = None

class SensorUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    configuration_metadata: Optional[Dict[str, Any]] = None

class SensorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    hostname: str
    source_type: str
    status: str
    configuration_metadata: Optional[Dict[str, Any]] = None
    last_heartbeat_at: datetime
    last_event_at: Optional[datetime] = None
    created_at: datetime

# Network Events
class NetworkEventCreate(BaseModel):
    id: Optional[str] = None
    sensor_id: Optional[str] = None
    event_timestamp: Optional[datetime] = None
    source_ip: str
    destination_ip: str
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: str
    event_type: str = "flow"
    normalised_payload: Optional[Dict[str, Any]] = None
    source_reference: Optional[str] = None

class NetworkEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sensor_id: Optional[str] = None
    event_timestamp: datetime
    source_ip: str
    destination_ip: str
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: str
    event_type: str
    normalised_payload: Optional[Dict[str, Any]] = None
    source_reference: Optional[str] = None
    created_at: datetime

# Alerts
class AlertCreate(BaseModel):
    id: Optional[str] = None
    event_id: Optional[str] = None
    sensor_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    detection_source: str
    detection_category: str
    severity: str  # low, medium, high, critical
    confidence: float = 1.0
    status: str = "new"
    rule_version: Optional[str] = None
    model_version: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: Optional[str] = None
    sensor_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    detection_source: str
    detection_category: str
    severity: str
    confidence: float
    status: str
    rule_version: Optional[str] = None
    model_version: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    event: Optional[NetworkEventResponse] = None

# Incidents
class IncidentCreate(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    severity: str = "medium"
    status: str = "open"
    assigned_user_id: Optional[int] = None
    correlation_method: str = "Attack DNA Graph"
    correlation_evidence: Optional[Dict[str, Any]] = None
    alert_ids: Optional[List[str]] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assigned_user_id: Optional[int] = None

class IncidentNoteCreate(BaseModel):
    note: str

class IncidentNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: str
    user_id: int
    username: str
    note: str
    created_at: datetime

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    first_observed_at: datetime
    last_observed_at: datetime
    assigned_user_id: Optional[int] = None
    correlation_method: str
    correlation_evidence: Optional[Dict[str, Any]] = None
    correlation_confidence: float
    created_at: datetime
    updated_at: datetime
    alert_count: Optional[int] = 0
    involved_ips: Optional[List[str]] = []
    notes: Optional[List[IncidentNoteResponse]] = []

# Attack DNA Graph
class AttackDNANode(BaseModel):
    id: str
    label: str
    type: str  # host, alert, stage, event
    severity: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class AttackDNAEdge(BaseModel):
    source: str
    target: str
    relationship: str
    evidence: str
    confidence: float

class AttackDNAResponse(BaseModel):
    incident_id: str
    title: str
    nodes: List[AttackDNANode]
    edges: List[AttackDNAEdge]
    timeline: List[Dict[str, Any]]
    observed_events_count: int
    inferred_links_count: int

# Threat Trajectory
class ThreatTrajectoryCandidate(BaseModel):
    stage: str
    probability: float
    evidence_indicators: List[str]

class ThreatTrajectoryResponse(BaseModel):
    incident_id: str
    current_stage: str
    estimated_stage: str
    predicted_stage: Optional[str] = None
    confidence: float
    ranked_candidates: List[ThreatTrajectoryCandidate] = []
    supporting_events: List[Dict[str, Any]] = []
    evaluation_status: str  # estimated, verified, insufficient_evidence
    evidence_summary: str
    model_version: str
    prediction_timestamp: datetime
    feedback: Optional[str] = None

class TrajectoryFeedbackCreate(BaseModel):
    feedback: str  # useful, incorrect, inconclusive
    notes: Optional[str] = None

# Detection Rules
class RuleCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str
    severity: str = "medium"
    configuration: Dict[str, Any]
    enabled: bool = True
    version: str = "1.0.0"

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

class RuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    category: str
    severity: str
    configuration: Dict[str, Any]
    enabled: bool
    version: str
    created_at: datetime
    updated_at: datetime

class RuleTestRequest(BaseModel):
    event_payload: Dict[str, Any]

class RuleTestResponse(BaseModel):
    matched: bool
    rule_id: str
    rule_name: str
    evidence: Optional[Dict[str, Any]] = None
    severity: Optional[str] = None

# Datasets and Models
class DatasetResponse(BaseModel):
    id: str
    name: str
    record_count: int
    feature_count: int
    classes: List[str]
    description: str
    file_path: str
    ready_for_training: bool

class MLModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    algorithm: str
    version: str
    feature_schema_version: str
    dataset_reference: Optional[str] = None
    metrics: Dict[str, Any]
    status: str
    created_at: datetime

class ModelTrainRequest(BaseModel):
    algorithm: str = "RandomForestClassifier"  # RandomForestClassifier, IsolationForest
    dataset_id: str = "synthetic_train_v1"
    model_name: Optional[str] = None

# Audit Log
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    username: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    timestamp: datetime
    outcome: str
    metadata_json: Optional[Dict[str, Any]] = None
