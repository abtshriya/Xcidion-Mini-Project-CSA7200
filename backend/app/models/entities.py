import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="analyst", nullable=False)  # admin, analyst, viewer
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    hostname = Column(String(128), nullable=False)
    source_type = Column(String(64), nullable=False)  # zeek, suricata, tshark, synthetic
    status = Column(String(32), default="online", nullable=False)  # online, degraded, offline, unknown
    configuration_metadata = Column(JSON, default=dict)
    last_heartbeat_at = Column(DateTime, default=utcnow, nullable=False)
    last_event_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    events = relationship("NetworkEvent", back_populates="sensor", cascade="all, delete-orphan")

class NetworkEvent(Base):
    __tablename__ = "network_events"
    
    id = Column(String(64), primary_key=True, index=True)
    sensor_id = Column(String(64), ForeignKey("sensors.id"), index=True, nullable=True)
    event_timestamp = Column(DateTime, default=utcnow, index=True, nullable=False)
    source_ip = Column(String(45), index=True, nullable=False)
    destination_ip = Column(String(45), index=True, nullable=False)
    source_port = Column(Integer, index=True, nullable=True)
    destination_port = Column(Integer, index=True, nullable=True)
    protocol = Column(String(16), index=True, nullable=False)  # TCP, UDP, ICMP, etc.
    event_type = Column(String(64), index=True, default="flow")  # flow, alert, dns, http, connection
    normalised_payload = Column(JSON, default=dict)
    source_reference = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    
    sensor = relationship("Sensor", back_populates="events")
    alerts = relationship("Alert", back_populates="event")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), ForeignKey("network_events.id"), index=True, nullable=True)
    sensor_id = Column(String(64), ForeignKey("sensors.id"), nullable=True)
    title = Column(String(256), index=True, nullable=False)
    description = Column(Text, nullable=True)
    detection_source = Column(String(64), index=True, nullable=False)  # rule, suricata, ml, anomaly, manual
    detection_category = Column(String(64), index=True, nullable=False)  # Reconnaissance, Brute Force, DoS, Malware, etc.
    severity = Column(String(32), index=True, nullable=False)  # low, medium, high, critical
    confidence = Column(Float, default=1.0)
    status = Column(String(32), default="new", index=True, nullable=False)  # new, acknowledged, investigating, resolved, closed
    rule_version = Column(String(64), nullable=True)
    model_version = Column(String(64), nullable=True)
    evidence = Column(JSON, default=dict)  # Features, signature details, or SHAP contributions
    created_at = Column(DateTime, default=utcnow, index=True, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    event = relationship("NetworkEvent", back_populates="alerts")
    incident_links = relationship("IncidentAlert", back_populates="alert", cascade="all, delete-orphan")

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(32), index=True, default="medium", nullable=False)
    status = Column(String(32), default="open", index=True, nullable=False)  # open, investigating, contained, resolved, closed
    first_observed_at = Column(DateTime, default=utcnow, nullable=False)
    last_observed_at = Column(DateTime, default=utcnow, nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    correlation_method = Column(String(64), default="Attack DNA Graph")
    correlation_evidence = Column(JSON, default=dict)
    correlation_confidence = Column(Float, default=0.85)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    
    alerts = relationship("IncidentAlert", back_populates="incident", cascade="all, delete-orphan")
    notes = relationship("IncidentNote", back_populates="incident", cascade="all, delete-orphan")
    predictions = relationship("ThreatPrediction", back_populates="incident", cascade="all, delete-orphan")

class IncidentAlert(Base):
    __tablename__ = "incident_alerts"
    
    incident_id = Column(String(64), ForeignKey("incidents.id"), primary_key=True)
    alert_id = Column(String(64), ForeignKey("alerts.id"), primary_key=True)
    relationship_type = Column(String(64), default="correlated_ip")
    relationship_evidence = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    
    incident = relationship("Incident", back_populates="alerts")
    alert = relationship("Alert", back_populates="incident_links")

class IncidentNote(Base):
    __tablename__ = "incident_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    username = Column(String(64), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    
    incident = relationship("Incident", back_populates="notes")

class DetectionRule(Base):
    __tablename__ = "detection_rules"
    
    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False)
    severity = Column(String(32), default="medium", nullable=False)
    configuration = Column(JSON, default=dict)
    enabled = Column(Boolean, default=True, nullable=False)
    version = Column(String(32), default="1.0.0", nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

class MLModel(Base):
    __tablename__ = "ml_models"
    
    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    algorithm = Column(String(64), nullable=False)  # RandomForestClassifier, IsolationForest
    version = Column(String(32), default="1.0.0", nullable=False)
    feature_schema_version = Column(String(32), default="1.0", nullable=False)
    dataset_reference = Column(String(128), nullable=True)
    model_path = Column(String(256), nullable=False)
    metrics = Column(JSON, default=dict)
    status = Column(String(32), default="inactive", nullable=False)  # active, inactive, training, failed
    created_at = Column(DateTime, default=utcnow, nullable=False)

class ThreatPrediction(Base):
    __tablename__ = "threat_predictions"
    
    id = Column(String(64), primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"), index=True, nullable=False)
    model_id = Column(String(64), nullable=True)
    current_stage = Column(String(64), nullable=False)
    predicted_stage = Column(String(64), nullable=True)
    confidence = Column(Float, default=0.0)
    supporting_event_ids = Column(JSON, default=list)
    supporting_evidence = Column(JSON, default=dict)
    evaluation_status = Column(String(64), default="estimated")  # estimated, verified, insufficient_evidence
    feedback = Column(String(32), nullable=True)  # useful, incorrect, inconclusive
    created_at = Column(DateTime, default=utcnow, nullable=False)
    
    incident = relationship("Incident", back_populates="predictions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(64), nullable=False)
    action = Column(String(64), index=True, nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True, nullable=False)
    outcome = Column(String(32), default="success", nullable=False)  # success, failure, denied
    metadata_json = Column(JSON, default=dict)

class SystemEvent(Base):
    __tablename__ = "system_events"
    
    id = Column(Integer, primary_key=True, index=True)
    component = Column(String(64), index=True, nullable=False)
    severity = Column(String(32), default="info", nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=utcnow, index=True, nullable=False)

class ApprovedSubnet(Base):
    __tablename__ = "approved_subnets"
    
    id = Column(Integer, primary_key=True, index=True)
    cidr = Column(String(64), unique=True, nullable=False)  # e.g. 192.168.1.0/24, 127.0.0.1/32
    label = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String(64), primary_key=True, index=True)
    ip_address = Column(String(45), unique=True, index=True, nullable=False)
    mac_address = Column(String(48), nullable=True)
    hostname = Column(String(128), nullable=True)
    vendor = Column(String(128), nullable=True)
    os_hint = Column(String(128), nullable=True)
    status = Column(String(32), default="online", nullable=False)  # online, offline, scanning
    risk_level = Column(String(32), default="low", nullable=False)  # low, medium, high, critical
    open_ports = Column(JSON, default=list)  # [{"port": 80, "protocol": "TCP", "service": "http", "state": "open"}]
    suspicious_indicators = Column(JSON, default=list)  # ["Open DB Port", "Active NIDS Alerts"]
    first_seen = Column(DateTime, default=utcnow, nullable=False)
    last_seen = Column(DateTime, default=utcnow, nullable=False)
    scan_source = Column(String(64), default="network_traffic", nullable=False)  # scanner, traffic_ingestion, manual
    metadata_json = Column(JSON, default=dict)

class ScanJob(Base):
    __tablename__ = "scan_jobs"
    
    id = Column(String(64), primary_key=True, index=True)
    subnet = Column(String(64), nullable=False)
    initiated_by = Column(String(64), nullable=False)
    status = Column(String(32), default="running", nullable=False)  # running, completed, failed, blocked
    devices_found = Column(Integer, default=0, nullable=False)
    open_ports_found = Column(Integer, default=0, nullable=False)
    threats_found = Column(Integer, default=0, nullable=False)
    scanned_devices = Column(JSON, default=list)
    log_output = Column(JSON, default=list)  # [{"timestamp": "...", "level": "INFO", "message": "..."}]
    created_at = Column(DateTime, default=utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

