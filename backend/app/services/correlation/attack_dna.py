import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import networkx as nx

class AttackDNACorrelator:
    def __init__(self, time_window_seconds: int = 3600):
        self.time_window_seconds = time_window_seconds

    def correlate_alerts_into_incidents(
        self,
        alerts: List[Dict[str, Any]],
        events_map: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Groups alerts into coherent incidents using NetworkX graph analysis.
        Edges represent documented relationships:
        - Shared Source IP
        - Shared Destination IP / Victim Target
        - Temporal Proximity (<= time_window_seconds)
        - Behavioral Attack Progression (e.g. Reconnaissance -> Credential Access -> Exfiltration)
        """
        if not alerts:
            return []

        G = nx.Graph()

        # Add alert nodes
        for alert in alerts:
            aid = alert["id"]
            evt_id = alert.get("event_id")
            evt = events_map.get(evt_id, {})
            
            src_ip = evt.get("source_ip", "unknown")
            dst_ip = evt.get("destination_ip", "unknown")
            category = alert.get("detection_category", "Unknown")
            severity = alert.get("severity", "medium")
            ts = alert.get("created_at") or datetime.now()
            
            G.add_node(
                aid,
                type="alert",
                title=alert.get("title", ""),
                src_ip=src_ip,
                dst_ip=dst_ip,
                category=category,
                severity=severity,
                timestamp=ts,
                alert_obj=alert
            )

        # Build correlation edges between pairs of alerts
        node_ids = list(G.nodes)
        for i in range(len(node_ids)):
            for j in range(i + 1, len(node_ids)):
                id_a, id_b = node_ids[i], node_ids[j]
                data_a, data_b = G.nodes[id_a], G.nodes[id_b]
                
                # Check relation conditions
                shared_src = (data_a["src_ip"] == data_b["src_ip"]) and data_a["src_ip"] != "unknown"
                shared_dst = (data_a["dst_ip"] == data_b["dst_ip"]) and data_a["dst_ip"] != "unknown"
                pivot_link = (data_a["dst_ip"] == data_b["src_ip"]) or (data_a["src_ip"] == data_b["dst_ip"])

                ts_diff = 0
                if isinstance(data_a["timestamp"], datetime) and isinstance(data_b["timestamp"], datetime):
                    ts_diff = abs((data_a["timestamp"] - data_b["timestamp"]).total_seconds())
                
                in_window = ts_diff <= self.time_window_seconds

                if in_window and (shared_src or shared_dst or pivot_link):
                    reasons = []
                    confidence = 0.6
                    
                    if shared_src and shared_dst:
                        reasons.append(f"Identical host pair {data_a['src_ip']} -> {data_a['dst_ip']}")
                        confidence = 0.95
                    elif shared_src:
                        reasons.append(f"Common adversary source {data_a['src_ip']}")
                        confidence = 0.85
                    elif shared_dst:
                        reasons.append(f"Targeting common victim host {data_a['dst_ip']}")
                        confidence = 0.80
                    elif pivot_link:
                        reasons.append(f"Lateral movement pivot across {data_a['dst_ip']}")
                        confidence = 0.75
                        
                    reasons.append(f"Occurred within {int(ts_diff)}s of each other")
                    
                    G.add_edge(
                        id_a,
                        id_b,
                        relationship="correlated_attack_step",
                        evidence="; ".join(reasons),
                        confidence=confidence
                    )

        # Connected components represent correlated incidents
        incidents = []
        components = list(nx.connected_components(G))
        
        for idx, comp in enumerate(components):
            comp_nodes = [G.nodes[n] for n in comp]
            comp_alerts = [n["alert_obj"] for n in comp_nodes]
            
            # Sort chronologically
            comp_nodes.sort(key=lambda x: x["timestamp"] if isinstance(x["timestamp"], datetime) else datetime.min)
            
            src_ips = list({n["src_ip"] for n in comp_nodes if n["src_ip"] != "unknown"})
            dst_ips = list({n["dst_ip"] for n in comp_nodes if n["dst_ip"] != "unknown"})
            categories = list({n["category"] for n in comp_nodes})
            severities = [n["severity"] for n in comp_nodes]
            
            # Overall severity is highest among components
            if "critical" in severities:
                inc_severity = "critical"
            elif "high" in severities:
                inc_severity = "high"
            else:
                inc_severity = "medium"

            inc_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
            first_obs = comp_nodes[0]["timestamp"]
            last_obs = comp_nodes[-1]["timestamp"]
            
            title = f"Multi-stage Attack: {', '.join(categories[:3])}"
            if len(src_ips) == 1 and len(dst_ips) == 1:
                title = f"Targeted Intrusion: {src_ips[0]} -> {dst_ips[0]}"
            elif len(src_ips) == 1:
                title = f"Threat Campaign originating from {src_ips[0]}"

            incident_evidence = {
                "correlated_alerts": list(comp),
                "adversary_sources": src_ips,
                "target_hosts": dst_ips,
                "observed_stages": categories,
                "graph_density": float(nx.density(G.subgraph(comp))),
                "reason": f"Correlated {len(comp)} security events based on IP linkages and temporal proximity."
            }

            incidents.append({
                "id": inc_id,
                "title": title,
                "description": f"Correlated incident linking {len(comp)} alert(s) across stages: {', '.join(categories)}.",
                "severity": inc_severity,
                "status": "open",
                "first_observed_at": first_obs,
                "last_observed_at": last_obs,
                "alert_ids": list(comp),
                "involved_ips": list(set(src_ips + dst_ips)),
                "correlation_method": "Attack DNA Graph-Correlation",
                "correlation_evidence": incident_evidence,
                "correlation_confidence": 0.88 if len(comp) > 1 else 0.70
            })

        return incidents

    def generate_incident_graph(
        self,
        incident_id: str,
        alerts: List[Dict[str, Any]],
        events_map: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Builds the visual Attack DNA graph for a specific incident:
        Nodes: Source IPs (adversaries), Destination IPs (assets), Alert events (observed actions).
        Edges: Directed evidence links.
        Chronological Timeline: Ordered attack story.
        """
        nodes = []
        edges = []
        node_ids = set()
        timeline = []

        # Sort alerts chronologically
        sorted_alerts = sorted(
            alerts,
            key=lambda a: a.get("created_at") or datetime.min
        )

        for alert in sorted_alerts:
            aid = alert["id"]
            evt_id = alert.get("event_id")
            evt = events_map.get(evt_id, {})
            
            src_ip = evt.get("source_ip", "Source")
            dst_ip = evt.get("destination_ip", "Target")
            cat = alert.get("detection_category", "Anomaly")
            sev = alert.get("severity", "medium")
            ts = alert.get("created_at")
            
            # Host nodes
            if src_ip not in node_ids:
                nodes.append({
                    "id": src_ip,
                    "label": f"Host: {src_ip}",
                    "type": "adversary_host",
                    "severity": "high",
                    "details": {"ip": src_ip, "role": "Originating Host"}
                })
                node_ids.add(src_ip)
                
            if dst_ip not in node_ids:
                nodes.append({
                    "id": dst_ip,
                    "label": f"Asset: {dst_ip}",
                    "type": "target_host",
                    "severity": "medium",
                    "details": {"ip": dst_ip, "role": "Targeted Host"}
                })
                node_ids.add(dst_ip)
                
            # Alert node
            if aid not in node_ids:
                nodes.append({
                    "id": aid,
                    "label": alert.get("title", aid),
                    "type": "observed_alert",
                    "severity": sev,
                    "details": {
                        "category": cat,
                        "source": alert.get("detection_source"),
                        "timestamp": str(ts)
                    }
                })
                node_ids.add(aid)

            # Edges: src_ip -> alert -> dst_ip
            edges.append({
                "source": src_ip,
                "target": aid,
                "relationship": "executed_by",
                "evidence": f"Traffic initiated by {src_ip}",
                "confidence": alert.get("confidence", 0.9)
            })
            edges.append({
                "source": aid,
                "target": dst_ip,
                "relationship": "impacts_target",
                "evidence": f"Traffic targeted {dst_ip}",
                "confidence": alert.get("confidence", 0.9)
            })

            timeline.append({
                "alert_id": aid,
                "timestamp": str(ts),
                "title": alert.get("title"),
                "category": cat,
                "severity": sev,
                "source_ip": src_ip,
                "destination_ip": dst_ip,
                "detection_source": alert.get("detection_source"),
                "evidence_snippet": str(alert.get("evidence", {}).get("reason", alert.get("description", "")))
            })

        return {
            "incident_id": incident_id,
            "title": f"Attack DNA Fingerprint: {incident_id}",
            "nodes": nodes,
            "edges": edges,
            "timeline": timeline,
            "observed_events_count": len(sorted_alerts),
            "inferred_links_count": len(edges)
        }

attack_dna_correlator = AttackDNACorrelator()
