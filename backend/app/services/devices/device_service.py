import datetime
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.entities import Device, NetworkEvent, Alert, Incident, IncidentAlert
from backend.app.services.trajectory.threat_trajectory import threat_trajectory_engine, CATEGORY_TO_STAGE, TRANSITION_PRIORS

logger = logging.getLogger("xcidion.devices")

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class DeviceService:
    @staticmethod
    def sync_devices_from_traffic(db: Session) -> List[Device]:
        """
        Scans network_events table to discover all participating IPs and ensure
        they exist in the Device inventory with accurate statistics.
        """
        # Find unique IPs in events
        src_ips = db.query(NetworkEvent.source_ip).distinct().all()
        dst_ips = db.query(NetworkEvent.destination_ip).distinct().all()
        all_ips = set([ip[0] for ip in src_ips] + [ip[0] for ip in dst_ips])

        known_devices = {d.ip_address: d for d in db.query(Device).all()}

        for ip in all_ips:
            if not ip or ip == "unknown":
                continue

            events_query = db.query(NetworkEvent).filter(
                or_(NetworkEvent.source_ip == ip, NetworkEvent.destination_ip == ip)
            )
            first_evt = events_query.order_by(NetworkEvent.event_timestamp.asc()).first()
            last_evt = events_query.order_by(NetworkEvent.event_timestamp.desc()).first()
            
            # Check associated alerts
            alerts = db.query(Alert).join(
                NetworkEvent, Alert.event_id == NetworkEvent.id
            ).filter(
                or_(NetworkEvent.source_ip == ip, NetworkEvent.destination_ip == ip)
            ).all()

            risk = "low"
            suspicious = []
            if alerts:
                if any(a.severity == "critical" for a in alerts):
                    risk = "critical"
                    suspicious.append(f"Involved in {len(alerts)} NIDS alerts (Critical Severity)")
                elif any(a.severity == "high" for a in alerts):
                    risk = "high"
                    suspicious.append(f"Involved in {len(alerts)} NIDS alerts (High Severity)")
                else:
                    risk = "medium"
                    suspicious.append(f"Involved in {len(alerts)} NIDS alerts")

            # Determine hostname hint
            hostname = f"host-{ip.replace('.', '-')}.internal"
            if ip.startswith("192.168.1.10"):
                hostname = "web-prod-01.internal"
            elif ip.startswith("192.168.1.50"):
                hostname = "db-cluster-01.internal"
            elif ip.startswith("192.168.1.100"):
                hostname = "sec-workstation.internal"
            elif ip.startswith("10.0.0.15"):
                hostname = "edge-firewall.internal"
            elif ip.startswith("198.51.100"):
                hostname = "remote-adversary.node"

            first_seen = first_evt.event_timestamp if first_evt else utcnow()
            last_seen = last_evt.event_timestamp if last_evt else utcnow()

            # Discovered open ports from incoming destination events
            in_events = db.query(NetworkEvent.destination_port, NetworkEvent.protocol).filter(
                NetworkEvent.destination_ip == ip,
                NetworkEvent.destination_port != None
            ).distinct().all()

            open_ports = []
            for port, proto in in_events[:8]:
                open_ports.append({
                    "port": port,
                    "protocol": proto or "TCP",
                    "service": DeviceService.guess_service_name(port),
                    "state": "open"
                })

            if ip in known_devices:
                dev = known_devices[ip]
                dev.last_seen = last_seen
                if not dev.open_ports and open_ports:
                    dev.open_ports = open_ports
                if suspicious:
                    dev.suspicious_indicators = list(dict.fromkeys((dev.suspicious_indicators or []) + suspicious))
                if risk != "low":
                    dev.risk_level = risk
            else:
                dev = Device(
                    id=f"DEV-{ip.replace('.', '-')}",
                    ip_address=ip,
                    hostname=hostname,
                    status="online",
                    risk_level=risk,
                    open_ports=open_ports,
                    suspicious_indicators=suspicious,
                    first_seen=first_seen,
                    last_seen=last_seen,
                    scan_source="network_traffic"
                )
                db.add(dev)
                known_devices[ip] = dev

        db.commit()
        return list(known_devices.values())

    @staticmethod
    def guess_service_name(port: int) -> str:
        services = {
            21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
            80: "HTTP", 110: "POP3", 135: "RPC", 139: "NetBIOS", 443: "HTTPS",
            445: "SMB", 1433: "MSSQL", 3306: "MySQL", 3389: "RDP",
            5432: "PostgreSQL", 8000: "HTTP-Alt", 8080: "HTTP-Proxy"
        }
        return services.get(port, f"port-{port}")

    @staticmethod
    def investigate_device(db: Session, ip_or_id: str) -> Dict[str, Any]:
        """
        Compiles exhaustive investigation dossier:
        1. Device hardware & network profile
        2. Associated real alerts
        3. Attack DNA timeline (CONFIRMED observed events vs INFERRED relationships clearly delineated)
        4. Threat Trajectory predictions
        """
        # Find device
        dev = db.query(Device).filter(
            or_(Device.ip_address == ip_or_id, Device.id == ip_or_id)
        ).first()

        target_ip = dev.ip_address if dev else ip_or_id

        if not dev:
            # Create on the fly if IP exists in events
            dev = Device(
                id=f"DEV-{target_ip.replace('.', '-')}",
                ip_address=target_ip,
                hostname=f"host-{target_ip.replace('.', '-')}.internal",
                status="online",
                risk_level="low",
                open_ports=[],
                suspicious_indicators=[],
                first_seen=utcnow(),
                last_seen=utcnow(),
                scan_source="investigation_query"
            )
            db.add(dev)
            db.commit()

        # 1. Associated Alerts
        alerts_query = db.query(Alert).join(
            NetworkEvent, Alert.event_id == NetworkEvent.id
        ).filter(
            or_(NetworkEvent.source_ip == target_ip, NetworkEvent.destination_ip == target_ip)
        ).order_by(Alert.created_at.desc()).all()

        formatted_alerts = []
        for a in alerts_query:
            formatted_alerts.append({
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "severity": a.severity,
                "detection_source": a.detection_source,
                "detection_category": a.detection_category,
                "confidence": a.confidence,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "evidence": a.evidence or {}
            })

        # 2. Attack DNA Timeline: Distinguishing Confirmed Events vs Inferred Relationships
        timeline = []
        confirmed_count = 0
        inferred_count = 0

        # A: Confirmed Observed Events (from direct NetworkEvents and Alerts)
        events = db.query(NetworkEvent).filter(
            or_(NetworkEvent.source_ip == target_ip, NetworkEvent.destination_ip == target_ip)
        ).order_by(NetworkEvent.event_timestamp.asc()).limit(50).all()

        for evt in events:
            # Check if this event generated an alert
            matching_alert = next((a for a in alerts_query if a.event_id == evt.id), None)
            is_suspicious = matching_alert is not None

            category = matching_alert.detection_category if matching_alert else (evt.event_type.capitalize() if evt.event_type else "Network Flow")
            severity = matching_alert.severity if matching_alert else "info"

            timeline.append({
                "id": f"EVT-{evt.id}",
                "timestamp": evt.event_timestamp.isoformat() if evt.event_timestamp else None,
                "nature": "CONFIRMED_OBSERVED_EVENT",
                "is_confirmed": True,
                "title": matching_alert.title if matching_alert else f"Network Connection: {evt.protocol} Port {evt.destination_port}",
                "description": matching_alert.description if matching_alert else f"Observed flow {evt.source_ip}:{evt.source_port} -> {evt.destination_ip}:{evt.destination_port}",
                "category": category,
                "severity": severity,
                "source_ip": evt.source_ip,
                "destination_ip": evt.destination_ip,
                "protocol": evt.protocol,
                "port": evt.destination_port,
                "evidence_type": "Packet/Sensor Telemetry Record",
                "detection_source": matching_alert.detection_source if matching_alert else "zeek_flow",
                "confidence_score": 1.0  # Observed ground truth event
            })
            confirmed_count += 1

        # B: Inferred Relationships (from Incident correlation graph / NetworkX)
        if alerts_query:
            alert_ids = [a.id for a in alerts_query]
            linked_incident_alerts = db.query(IncidentAlert).filter(
                IncidentAlert.alert_id.in_(alert_ids)
            ).all()

            for link in linked_incident_alerts:
                incident = db.query(Incident).filter(Incident.id == link.incident_id).first()
                if incident:
                    # Inferred edge across the incident graph
                    timeline.append({
                        "id": f"INFER-{incident.id}-{link.alert_id}",
                        "timestamp": incident.updated_at.isoformat() if incident.updated_at else incident.first_observed_at.isoformat(),
                        "nature": "INFERRED_RELATIONSHIP",
                        "is_confirmed": False,
                        "title": f"Inferred Correlation: Incident '{incident.title}'",
                        "description": f"Analytic correlation links this host via {link.relationship_type or 'graph edge'}. Method: {incident.correlation_method or 'NetworkX Graph'}.",
                        "category": "Correlation Link",
                        "severity": incident.severity,
                        "source_ip": target_ip,
                        "destination_ip": "Incident Cluster",
                        "protocol": "N/A",
                        "port": None,
                        "evidence_type": "Correlated Graph Clustering",
                        "detection_source": "attack_dna_graph",
                        "confidence_score": incident.correlation_confidence or 0.85
                    })
                    inferred_count += 1

        # Sort timeline chronologically
        timeline.sort(key=lambda x: x["timestamp"] or "")

        # 3. Threat Trajectory Prediction
        observed_stages = []
        for a in alerts_query:
            stg = CATEGORY_TO_STAGE.get(a.detection_category)
            if stg and stg not in observed_stages:
                observed_stages.append(stg)

        trajectory_data = {}
        if observed_stages:
            latest_stage = observed_stages[-1]
            priors = TRANSITION_PRIORS.get(latest_stage, [])
            
            predictions = []
            for nxt_stage, prob, reasons in priors:
                predictions.append({
                    "stage": nxt_stage,
                    "probability": prob,
                    "confidence_percentage": int(prob * 100),
                    "supporting_reasons": reasons
                })

            trajectory_data = {
                "observed_stages": observed_stages,
                "current_threat_stage": latest_stage,
                "trajectory_predictions": predictions,
                "is_prediction": True,
                "confidence_label": "Probabilistic Markov Estimation",
                "recommended_action": DeviceService.get_remediation_for_stage(latest_stage)
            }
        else:
            trajectory_data = {
                "observed_stages": ["Normal Baseline Traffic"],
                "current_threat_stage": "Baseline",
                "trajectory_predictions": [],
                "is_prediction": False,
                "confidence_label": "No Anomalous Threat Progression Detected",
                "recommended_action": "Routine continuous monitoring"
            }

        return {
            "device": dev,
            "associated_alerts": formatted_alerts,
            "attack_dna_timeline": timeline,
            "threat_trajectory": trajectory_data,
            "confirmed_events_count": confirmed_count,
            "inferred_relations_count": inferred_count
        }

    @staticmethod
    def get_remediation_for_stage(stage: str) -> str:
        remediations = {
            "Reconnaissance": "Deploy dynamic firewall filtering to throttle rapid connection rates; inspect boundary NAT logs.",
            "Initial Access": "Audit application access logs; check for unpatched service vulnerabilities on exposed web servers.",
            "Credential Access": "Enforce immediate MFA lockout; check SSH and LDAP logs for distributed brute-force patterns.",
            "Privilege Escalation": "Review sudoers configurations and Windows SAM token access; isolate suspected process IDs.",
            "Lateral Movement": "Segment internal VLANs; restrict workstation-to-workstation SMB (445) and RPC traffic.",
            "Exfiltration": "Block outbound unusual high-volume egress flows; review DNS query volume for tunneling signatures."
        }
        return remediations.get(stage, "Increase sensor monitoring fidelity and isolate device if suspicious traffic persists.")
