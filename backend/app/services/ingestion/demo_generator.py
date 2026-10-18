import uuid
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.services.ingestion.pipeline import ingestion_pipeline
from backend.app.models.entities import Sensor, User, DetectionRule, MLModel
from backend.app.core.security import get_password_hash
from backend.app.services.detection.rule_engine import DEFAULT_RULES

def seed_initial_data(db: Session):
    """
    Seeds default administrative users, default sensors, detection rules, and baseline models
    if the database is newly initialized.
    """
    # 1. Users: Admin, Analyst, Viewer
    if db.query(User).count() == 0:
        admin_user = User(
            username="admin",
            email="admin@xcidion.local",
            password_hash=get_password_hash("Admin@Xcidion2026"),
            role="admin",
            active=True
        )
        analyst_user = User(
            username="analyst",
            email="analyst@xcidion.local",
            password_hash=get_password_hash("Analyst@Xcidion2026"),
            role="analyst",
            active=True
        )
        viewer_user = User(
            username="viewer",
            email="viewer@xcidion.local",
            password_hash=get_password_hash("Viewer@Xcidion2026"),
            role="viewer",
            active=True
        )
        db.add_all([admin_user, analyst_user, viewer_user])
        db.commit()

    # 2. Sensors
    if db.query(Sensor).count() == 0:
        sensors = [
            Sensor(
                id="SENSOR-ZEEK-01",
                name="Zeek Network Monitor (Core Gateway)",
                hostname="gw-core-01.internal",
                source_type="zeek",
                status="online",
                configuration_metadata={"interface": "eth0", "capture_filter": "not port 22", "mode": "passive"}
            ),
            Sensor(
                id="SENSOR-SURICATA-01",
                name="Suricata NIDS (DMZ Perimeter)",
                hostname="suricata-dmz.internal",
                source_type="suricata",
                status="online",
                configuration_metadata={"interface": "eth1", "ruleset": "ET-Open 2026", "mode": "inline_alert"}
            ),
            Sensor(
                id="SENSOR-DEMO-01",
                name="Synthetic Simulation Sensor",
                hostname="simulator.xcidion.local",
                source_type="synthetic",
                status="online",
                configuration_metadata={"description": "Generates controlled security validation events."}
            )
        ]
        db.add_all(sensors)
        db.commit()

    # 3. Rules
    if db.query(DetectionRule).count() == 0:
        for r in DEFAULT_RULES:
            db_rule = DetectionRule(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                category=r["category"],
                severity=r["severity"],
                configuration=r["configuration"],
                enabled=r["enabled"],
                version=r["version"]
            )
            db.add(db_rule)
        db.commit()

    # 4. ML Models
    if db.query(MLModel).count() == 0:
        default_model = MLModel(
            id="MOD-RF-V1",
            name="RandomForestClassifier NIDS Baseline",
            algorithm="RandomForestClassifier",
            version="1.0.0",
            feature_schema_version="1.0",
            dataset_reference="Synthetic Multi-Class Flow Benchmark",
            model_path="./models/xcidion_rf_baseline.joblib",
            metrics={"accuracy": 0.985, "precision": 0.982, "recall": 0.985, "f1_score": 0.983},
            status="active"
        )
        db.add(default_model)
        db.commit()

def generate_demo_scenario(db: Session, scenario_name: str) -> Dict[str, Any]:
    """
    Generates controlled demonstration events to validate workflows.
    Supported scenarios:
    - 'normal': Normal benign network traffic
    - 'port_scan': Horizontal port reconnaissance
    - 'brute_force': SSH repeated authentication attempts
    - 'dos_attack': High rate SYN flood
    - 'data_exfiltration': Large outbound data transfer
    - 'complete_campaign': Multi-stage attack from port scan to credential access to exfiltration
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    results = []

    if scenario_name == "normal":
        event = {
            "sensor_id": "SENSOR-DEMO-01",
            "source_ip": "192.168.1.105",
            "destination_ip": "142.250.190.46",
            "source_port": 54321,
            "destination_port": 443,
            "protocol": "TCP",
            "event_type": "flow",
            "normalised_payload": {
                "duration": 4.2,
                "orig_bytes": 1420,
                "resp_bytes": 18450,
                "orig_pkts": 12,
                "resp_pkts": 18,
                "conn_frequency_window": 1,
                "dst_port_diversity": 1
            },
            "source_reference": "DEMO-SYNTHETIC"
        }
        res = ingestion_pipeline.process_and_persist(db, event, source_type="synthetic")
        results.append(res)

    elif scenario_name == "port_scan":
        # Adversary probing multiple ports on web server
        attacker_ip = "198.51.100.42"
        target_ip = "10.0.0.15"
        ports = [21, 22, 23, 25, 80, 443, 3306, 3389, 8080, 8443]
        for idx, p in enumerate(ports):
            event = {
                "sensor_id": "SENSOR-DEMO-01",
                "source_ip": attacker_ip,
                "destination_ip": target_ip,
                "source_port": 40000 + idx,
                "destination_port": p,
                "protocol": "TCP",
                "event_type": "flow",
                "normalised_payload": {
                    "duration": 0.05,
                    "orig_bytes": 60,
                    "resp_bytes": 0,
                    "orig_pkts": 2,
                    "resp_pkts": 0,
                    "conn_frequency_window": 12,
                    "dst_port_diversity": 10
                },
                "source_reference": "DEMO-SYNTHETIC"
            }
            res = ingestion_pipeline.process_and_persist(db, event, source_type="synthetic")
            results.append(res)

    elif scenario_name == "brute_force":
        attacker_ip = "198.51.100.42"
        target_ip = "10.0.0.15"
        for i in range(8):
            event = {
                "sensor_id": "SENSOR-DEMO-01",
                "source_ip": attacker_ip,
                "destination_ip": target_ip,
                "source_port": 50000 + i,
                "destination_port": 22,
                "protocol": "TCP",
                "event_type": "flow",
                "normalised_payload": {
                    "duration": 0.8,
                    "orig_bytes": 1200,
                    "resp_bytes": 1400,
                    "orig_pkts": 14,
                    "resp_pkts": 12,
                    "conn_frequency_window": 10,
                    "dst_port_diversity": 1
                },
                "source_reference": "DEMO-SYNTHETIC"
            }
            res = ingestion_pipeline.process_and_persist(db, event, source_type="synthetic")
            results.append(res)

    elif scenario_name == "data_exfiltration":
        attacker_ip = "10.0.0.15"
        external_c2 = "203.0.113.88"
        event = {
            "sensor_id": "SENSOR-DEMO-01",
            "source_ip": attacker_ip,
            "destination_ip": external_c2,
            "source_port": 58921,
            "destination_port": 443,
            "protocol": "TCP",
            "event_type": "flow",
            "normalised_payload": {
                "duration": 120.5,
                "orig_bytes": 28500000,  # 28.5 MB
                "resp_bytes": 45000,
                "orig_pkts": 19500,
                "resp_pkts": 850,
                "conn_frequency_window": 2,
                "dst_port_diversity": 1
            },
            "source_reference": "DEMO-SYNTHETIC"
        }
        res = ingestion_pipeline.process_and_persist(db, event, source_type="synthetic")
        results.append(res)

    elif scenario_name == "complete_campaign":
        # Sequence: Recon -> Brute Force -> Exfiltration -> Suricata Exploit
        attacker = "198.51.100.99"
        target = "10.0.0.25"
        c2_ip = "203.0.113.111"

        # 1. Port scan
        for p in [22, 80, 443, 8080]:
            e = {
                "sensor_id": "SENSOR-DEMO-01",
                "source_ip": attacker,
                "destination_ip": target,
                "source_port": 41200,
                "destination_port": p,
                "protocol": "TCP",
                "normalised_payload": {"duration": 0.05, "orig_bytes": 64, "resp_bytes": 0, "orig_pkts": 1, "resp_pkts": 0, "conn_frequency_window": 8, "dst_port_diversity": 6},
                "source_reference": "DEMO-SYNTHETIC"
            }
            results.append(ingestion_pipeline.process_and_persist(db, e, source_type="synthetic"))

        # 2. SSH Brute Force
        for _ in range(7):
            e = {
                "sensor_id": "SENSOR-DEMO-01",
                "source_ip": attacker,
                "destination_ip": target,
                "source_port": 42200,
                "destination_port": 22,
                "protocol": "TCP",
                "normalised_payload": {"duration": 1.2, "orig_bytes": 2200, "resp_bytes": 1800, "orig_pkts": 16, "resp_pkts": 14, "conn_frequency_window": 9, "dst_port_diversity": 1},
                "source_reference": "DEMO-SYNTHETIC"
            }
            results.append(ingestion_pipeline.process_and_persist(db, e, source_type="synthetic"))

        # 3. Suricata Alert (Exploit / Reverse Shell)
        suricata_evt = {
            "sensor_id": "SENSOR-SURICATA-01",
            "source_ip": attacker,
            "destination_ip": target,
            "source_port": 42200,
            "destination_port": 8080,
            "protocol": "TCP",
            "event_type": "suricata_alert",
            "normalised_payload": {
                "suricata_alert": {
                    "signature": "ET EXPLOIT Apache Struts RCE Vulnerability Match",
                    "signature_id": 2024119,
                    "category": "Initial Access",
                    "severity": 1,
                    "flow_id": 9928172
                }
            },
            "source_reference": "DEMO-SYNTHETIC"
        }
        results.append(ingestion_pipeline.process_and_persist(db, suricata_evt, source_type="suricata"))

        # 4. Exfiltration outbound
        exfil_evt = {
            "sensor_id": "SENSOR-DEMO-01",
            "source_ip": target,
            "destination_ip": c2_ip,
            "source_port": 51200,
            "destination_port": 443,
            "protocol": "TCP",
            "normalised_payload": {"duration": 95.0, "orig_bytes": 15000000, "resp_bytes": 25000, "orig_pkts": 11000, "resp_pkts": 400, "conn_frequency_window": 3, "dst_port_diversity": 1},
            "source_reference": "DEMO-SYNTHETIC"
        }
        results.append(ingestion_pipeline.process_and_persist(db, exfil_evt, source_type="synthetic"))

    return {
        "scenario": scenario_name,
        "events_generated": len(results),
        "alerts_generated": sum(r["alerts_created"] for r in results),
        "status": "completed"
    }
