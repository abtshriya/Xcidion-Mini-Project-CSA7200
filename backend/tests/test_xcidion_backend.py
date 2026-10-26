import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.session import Base, get_db
from backend.app.main import app
from backend.app.services.detection.feature_extraction import extract_features_from_event
from backend.app.services.detection.rule_engine import RuleEngine
from backend.app.services.detection.ml_engine import ml_engine_instance
from backend.app.services.correlation.attack_dna import attack_dna_correlator
from backend.app.services.trajectory.threat_trajectory import threat_trajectory_engine

TEST_DB_URL = "sqlite:///./test_xcidion.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    from backend.app.services.ingestion.demo_generator import seed_initial_data, generate_demo_scenario
    seed_initial_data(db)
    generate_demo_scenario(db, "complete_campaign")
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "XCIDION"

def test_feature_extraction():
    evt = {
        "source_port": 50000,
        "destination_port": 22,
        "protocol": "TCP",
        "normalised_payload": {
            "duration": 2.5,
            "orig_bytes": 1000,
            "resp_bytes": 500,
            "orig_pkts": 10,
            "resp_pkts": 5,
            "conn_frequency_window": 8,
            "dst_port_diversity": 1
        }
    }
    vec, feat_dict = extract_features_from_event(evt)
    assert len(vec) == 12
    assert feat_dict["dst_port"] == 22.0
    assert feat_dict["duration"] == 2.5

def test_rule_engine_detection():
    engine = RuleEngine()
    evt = {"source_port": 40000, "destination_port": 80, "protocol": "TCP"}
    features = {
        "dst_port": 80,
        "dst_port_diversity": 12,
        "conn_frequency_window": 15,
        "pkts_per_sec": 10.0,
        "orig_bytes": 100.0,
        "resp_bytes": 0.0
    }
    matches = engine.evaluate_event(evt, features)
    assert len(matches) > 0
    assert any(m["rule_id"] == "RULE-PORT-SCAN" for m in matches)

def test_ml_detection_and_shap():
    # Synthetic malicious reconnaissance flow
    features = {
        "duration": 0.05,
        "orig_bytes": 60.0,
        "resp_bytes": 0.0,
        "orig_pkts": 2.0,
        "resp_pkts": 0.0,
        "src_port": 45000.0,
        "dst_port": 8080.0,
        "proto_code": 1.0,
        "bytes_per_sec": 1200.0,
        "pkts_per_sec": 40.0,
        "conn_frequency_window": 18.0,
        "dst_port_diversity": 15.0
    }
    import numpy as np
    from backend.app.services.detection.feature_extraction import FEATURE_NAMES
    vec = np.array([features[k] for k in FEATURE_NAMES], dtype=np.float32)
    
    res = ml_engine_instance.predict_and_explain(vec, features)
    assert res is not None
    assert "predicted_class" in res
    assert "shap_explanation" in res
    assert len(res["shap_explanation"]["all_features"]) > 0

def test_threat_trajectory_estimation():
    alerts = [
        {"id": "ALT-1", "detection_category": "Reconnaissance", "severity": "medium"},
        {"id": "ALT-2", "detection_category": "Credential Access", "severity": "high"}
    ]
    res = threat_trajectory_engine.estimate_trajectory("INC-TEST", alerts)
    assert res["current_stage"] == "Credential Access"
    assert res["confidence"] > 0.6
    assert len(res["ranked_candidates"]) > 0

def test_threat_trajectory_insufficient_evidence():
    res = threat_trajectory_engine.estimate_trajectory("INC-EMPTY", [])
    assert res["evaluation_status"] == "insufficient_evidence"
    assert res["confidence"] == 0.0
    assert "Insufficient evidence" in res["evidence_summary"]

def test_auth_login_and_me():
    res = client.post("/api/v1/auth/login", data={"username": "analyst", "password": "Analyst@Xcidion2026"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert token is not None

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "analyst"
    assert me_res.json()["role"] == "analyst"

def test_dashboard_summary_and_events():
    res = client.post("/api/v1/auth/login", data={"username": "analyst", "password": "Analyst@Xcidion2026"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    
    summary = client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    data = summary.json()
    assert data["total_events"] > 0
    assert data["active_alerts"] > 0

    events = client.get("/api/v1/events", headers=headers)
    assert events.status_code == 200
    assert len(events.json()) > 0

def test_attack_dna_graph():
    res = client.post("/api/v1/auth/login", data={"username": "analyst", "password": "Analyst@Xcidion2026"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    
    incidents = client.get("/api/v1/incidents", headers=headers).json()
    assert len(incidents) > 0
    inc_id = incidents[0]["id"]
    
    graph_res = client.get(f"/api/v1/incidents/{inc_id}/attack-dna", headers=headers)
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert "timeline" in graph_data

def test_devices_and_investigation():
    # Login as analyst
    res = client.post("/api/v1/auth/login", data={"username": "analyst", "password": "Analyst@Xcidion2026"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 1. Device listing
    devs_res = client.get("/api/v1/devices", headers=headers)
    assert devs_res.status_code == 200
    devices = devs_res.json()
    assert len(devices) > 0
    test_ip = devices[0]["ip_address"]

    # 2. Device deep investigation
    inv_res = client.get(f"/api/v1/devices/{test_ip}/investigate", headers=headers)
    assert inv_res.status_code == 200
    inv = inv_res.json()
    assert "device" in inv
    assert "associated_alerts" in inv
    assert "attack_dna_timeline" in inv
    assert "threat_trajectory" in inv
    # Verify that confirmed events and inferred relations are cleanly delineated
    assert "confirmed_events_count" in inv
    assert "inferred_relations_count" in inv
    for item in inv["attack_dna_timeline"]:
        assert "is_confirmed" in item
        assert "nature" in item

def test_authorized_scanning_and_permissions():
    # Login as admin
    admin_res = client.post("/api/v1/auth/login", data={"username": "admin", "password": "Admin@Xcidion2026"})
    admin_headers = {"Authorization": f"Bearer {admin_res.json()['access_token']}"}

    # Login as analyst (non-admin)
    analyst_res = client.post("/api/v1/auth/login", data={"username": "analyst", "password": "Analyst@Xcidion2026"})
    analyst_headers = {"Authorization": f"Bearer {analyst_res.json()['access_token']}"}

    # 1. Get approved subnets
    sub_res = client.get("/api/v1/scanning/approved-subnets", headers=admin_headers)
    assert sub_res.status_code == 200
    subnets = sub_res.json()
    assert len(subnets) > 0
    assert any("127.0.0.1" in s["cidr"] for s in subnets)

    # 2. Analyst trying to start scan should be rejected with 403
    scan_denied = client.post("/api/v1/scanning/start", json={"subnet": "127.0.0.1/32"}, headers=analyst_headers)
    assert scan_denied.status_code == 403

    # 3. Admin scanning an unapproved subnet should be rejected
    scan_blocked = client.post("/api/v1/scanning/start", json={"subnet": "8.8.8.0/24"}, headers=admin_headers)
    assert scan_blocked.status_code == 200
    assert scan_blocked.json()["status"] == "blocked"

    # 4. Admin scanning an approved subnet should succeed
    scan_ok = client.post("/api/v1/scanning/start", json={"subnet": "127.0.0.1/32"}, headers=admin_headers)
    assert scan_ok.status_code == 200
    assert scan_ok.json()["status"] == "completed"

def test_terminal_command_execution():
    res = client.post("/api/v1/auth/login", data={"username": "admin", "password": "Admin@Xcidion2026"})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # Execute status
    cmd_res = client.post("/api/v1/terminal/execute", json={"command": "status"}, headers=headers)
    assert cmd_res.status_code == 200
    lines = cmd_res.json()["output_lines"]
    assert any("SYSTEM POSTURE" in l["text"] for l in lines)

    # Execute devices
    dev_cmd = client.post("/api/v1/terminal/execute", json={"command": "devices"}, headers=headers)
    assert dev_cmd.status_code == 200
    assert len(dev_cmd.json()["output_lines"]) > 0

    # Execute help
    help_cmd = client.post("/api/v1/terminal/execute", json={"command": "help"}, headers=headers)
    assert help_cmd.status_code == 200
    assert any("status" in l["text"] for l in help_cmd.json()["output_lines"])

