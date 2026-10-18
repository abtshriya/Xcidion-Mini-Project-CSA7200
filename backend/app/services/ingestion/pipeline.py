import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.entities import (
    NetworkEvent, Alert, Incident, IncidentAlert, Sensor, SystemEvent
)
from backend.app.services.detection.hybrid_engine import hybrid_engine_instance
from backend.app.services.correlation.attack_dna import attack_dna_correlator

logger = logging.getLogger("xcidion.ingestion")

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class IngestionPipeline:
    def __init__(self):
        self.hybrid_engine = hybrid_engine_instance
        self.correlator = attack_dna_correlator

    def normalise_event(self, raw: Dict[str, Any], source_type: str = "generic") -> Dict[str, Any]:
        """
        Normalises disparate log formats (Zeek, Suricata EVE, TShark, Synthetic)
        into a canonical NetworkEvent schema.
        """
        now = utcnow()
        
        # Suricata EVE JSON format
        if source_type == "suricata" or "event_type" in raw and "src_ip" in raw:
            src_ip = raw.get("src_ip", "0.0.0.0")
            dst_ip = raw.get("dest_ip", "0.0.0.0")
            src_port = raw.get("src_port")
            dst_port = raw.get("dest_port")
            proto = raw.get("proto", "TCP")
            evt_type = raw.get("event_type", "flow")
            payload = {
                "flow_id": raw.get("flow_id"),
                "app_proto": raw.get("app_proto"),
                "orig_bytes": raw.get("flow", {}).get("bytes_toserver", 0),
                "resp_bytes": raw.get("flow", {}).get("bytes_toclient", 0),
                "orig_pkts": raw.get("flow", {}).get("pkts_toserver", 1),
                "resp_pkts": raw.get("flow", {}).get("pkts_toclient", 0),
                "duration": raw.get("flow", {}).get("age", 0.1)
            }
            if "alert" in raw:
                payload["suricata_alert"] = raw["alert"]
                evt_type = "suricata_alert"

        # Zeek JSON format
        elif source_type == "zeek" or "id.orig_h" in raw:
            src_ip = raw.get("id.orig_h", "0.0.0.0")
            dst_ip = raw.get("id.resp_h", "0.0.0.0")
            src_port = raw.get("id.orig_p")
            dst_port = raw.get("id.resp_p")
            proto = raw.get("proto", "tcp").upper()
            evt_type = raw.get("_path", "conn")
            payload = {
                "uid": raw.get("uid"),
                "duration": float(raw.get("duration", 0.1) or 0.1),
                "orig_bytes": int(raw.get("orig_bytes", 0) or 0),
                "resp_bytes": int(raw.get("resp_bytes", 0) or 0),
                "orig_pkts": int(raw.get("orig_pkts", 1) or 1),
                "resp_pkts": int(raw.get("resp_pkts", 0) or 0),
                "conn_state": raw.get("conn_state"),
                "history": raw.get("history")
            }

        # Canonical / Synthetic / TShark format
        else:
            src_ip = raw.get("source_ip", "192.168.1.100")
            dst_ip = raw.get("destination_ip", "10.0.0.5")
            src_port = raw.get("source_port", 49152)
            dst_port = raw.get("destination_port", 80)
            proto = raw.get("protocol", "TCP").upper()
            evt_type = raw.get("event_type", "flow")
            payload = raw.get("normalised_payload", raw)

        return {
            "id": raw.get("id") or f"EVT-{uuid.uuid4().hex[:12].upper()}",
            "sensor_id": raw.get("sensor_id", "SENSOR-ETH0"),
            "event_timestamp": raw.get("event_timestamp") or now,
            "source_ip": str(src_ip),
            "destination_ip": str(dst_ip),
            "source_port": int(src_port) if src_port is not None else None,
            "destination_port": int(dst_port) if dst_port is not None else None,
            "protocol": str(proto),
            "event_type": str(evt_type),
            "normalised_payload": payload,
            "source_reference": raw.get("source_reference", source_type)
        }

    def process_and_persist(
        self,
        db: Session,
        raw_event: Dict[str, Any],
        source_type: str = "generic"
    ) -> Dict[str, Any]:
        """
        Executes end-to-end processing pipeline:
        1. Normalisation & Validation
        2. Network Event persistence
        3. Sensor last-seen update
        4. Hybrid Detection Engine execution
        5. Alert persistence
        6. Attack DNA incident correlation
        7. Returns summary of persisted events, alerts, and updated incidents
        """
        norm = self.normalise_event(raw_event, source_type)

        # 1. Persist NetworkEvent
        db_event = NetworkEvent(
            id=norm["id"],
            sensor_id=norm["sensor_id"],
            event_timestamp=norm["event_timestamp"],
            source_ip=norm["source_ip"],
            destination_ip=norm["destination_ip"],
            source_port=norm["source_port"],
            destination_port=norm["destination_port"],
            protocol=norm["protocol"],
            event_type=norm["event_type"],
            normalised_payload=norm["normalised_payload"],
            source_reference=norm["source_reference"]
        )
        db.add(db_event)

        # 2. Update Sensor health
        sensor = db.query(Sensor).filter(Sensor.id == norm["sensor_id"]).first()
        if sensor:
            sensor.last_event_at = utcnow()
            sensor.last_heartbeat_at = utcnow()
            sensor.status = "online"

        # 3. Hybrid Detection
        alert_candidates = self.hybrid_engine.process_event(norm)
        created_alerts = []

        for cand in alert_candidates:
            db_alert = Alert(
                id=cand["id"],
                event_id=cand["event_id"],
                sensor_id=cand["sensor_id"],
                title=cand["title"],
                description=cand["description"],
                detection_source=cand["detection_source"],
                detection_category=cand["detection_category"],
                severity=cand["severity"],
                confidence=cand["confidence"],
                status="new",
                rule_version=cand.get("rule_version"),
                model_version=cand.get("model_version"),
                evidence=cand.get("evidence", {})
            )
            db.add(db_alert)
            created_alerts.append(cand)

        db.commit()

        # 4. Correlation & Incident Management
        correlated_incidents = []
        if created_alerts:
            # Fetch recent alerts and events for correlation
            recent_alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(100).all()
            alert_dicts = [
                {
                    "id": a.id,
                    "event_id": a.event_id,
                    "title": a.title,
                    "description": a.description,
                    "detection_source": a.detection_source,
                    "detection_category": a.detection_category,
                    "severity": a.severity,
                    "confidence": a.confidence,
                    "created_at": a.created_at
                }
                for a in recent_alerts
            ]

            event_ids = [a["event_id"] for a in alert_dicts if a.get("event_id")]
            events = db.query(NetworkEvent).filter(NetworkEvent.id.in_(event_ids)).all() if event_ids else []
            events_map = {
                e.id: {
                    "source_ip": e.source_ip,
                    "destination_ip": e.destination_ip,
                    "source_port": e.source_port,
                    "destination_port": e.destination_port,
                    "protocol": e.protocol
                }
                for e in events
            }

            grouped_incidents = self.correlator.correlate_alerts_into_incidents(alert_dicts, events_map)

            for g_inc in grouped_incidents:
                # Check if incident already exists with shared alerts
                existing = None
                for aid in g_inc["alert_ids"]:
                    link = db.query(IncidentAlert).filter(IncidentAlert.alert_id == aid).first()
                    if link:
                        existing = db.query(Incident).filter(Incident.id == link.incident_id).first()
                        if existing:
                            break
                
                if existing:
                    existing.last_observed_at = g_inc["last_observed_at"]
                    existing.severity = g_inc["severity"]
                    existing.correlation_evidence = g_inc["correlation_evidence"]
                    # Add missing alert links
                    for aid in g_inc["alert_ids"]:
                        has_link = db.query(IncidentAlert).filter(
                            IncidentAlert.incident_id == existing.id,
                            IncidentAlert.alert_id == aid
                        ).first()
                        if not has_link:
                            db.add(IncidentAlert(
                                incident_id=existing.id,
                                alert_id=aid,
                                relationship_type="correlated_evidence"
                            ))
                    correlated_incidents.append(existing.id)
                else:
                    new_inc = Incident(
                        id=g_inc["id"],
                        title=g_inc["title"],
                        description=g_inc["description"],
                        severity=g_inc["severity"],
                        status="open",
                        first_observed_at=g_inc["first_observed_at"],
                        last_observed_at=g_inc["last_observed_at"],
                        correlation_method=g_inc["correlation_method"],
                        correlation_evidence=g_inc["correlation_evidence"],
                        correlation_confidence=g_inc["correlation_confidence"]
                    )
                    db.add(new_inc)
                    for aid in g_inc["alert_ids"]:
                        db.add(IncidentAlert(
                            incident_id=new_inc.id,
                            alert_id=aid,
                            relationship_type="correlated_evidence"
                        ))
                    correlated_incidents.append(new_inc.id)

            db.commit()

        return {
            "event_id": norm["id"],
            "alerts_created": len(created_alerts),
            "alerts": created_alerts,
            "incidents_affected": correlated_incidents
        }

ingestion_pipeline = IngestionPipeline()
