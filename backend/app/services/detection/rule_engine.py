from typing import Dict, Any, List, Optional
from datetime import datetime

DEFAULT_RULES = [
    {
        "id": "RULE-PORT-SCAN",
        "name": "Horizontal/Vertical Port Scan Activity",
        "description": "Flags rapid connections across multiple distinct destination ports within a short time window.",
        "category": "Reconnaissance",
        "severity": "medium",
        "enabled": True,
        "version": "1.2.0",
        "configuration": {
            "min_dst_port_diversity": 5,
            "min_conn_frequency": 8
        }
    },
    {
        "id": "RULE-BRUTE-FORCE",
        "name": "SSH/RDP Repeated Authentication Attempts",
        "description": "Detects high frequency of connection attempts targeting management ports (22, 3389, 445).",
        "category": "Credential Access",
        "severity": "high",
        "enabled": True,
        "version": "1.1.0",
        "configuration": {
            "monitored_ports": [22, 3389, 445, 21, 23],
            "min_connection_frequency": 6
        }
    },
    {
        "id": "RULE-SYN-FLOOD",
        "name": "High Volume SYN Packet Inflow / DoS",
        "description": "Identifies elevated packet rates (>500 pkts/sec) with asymmetric response payloads indicative of flooding.",
        "category": "Impact",
        "severity": "critical",
        "enabled": True,
        "version": "1.0.0",
        "configuration": {
            "min_pkts_per_sec": 500,
            "max_resp_bytes_ratio": 0.05
        }
    },
    {
        "id": "RULE-DATA-EXFIL",
        "name": "Abnormal Outbound Data Transfer",
        "description": "Flags sessions transferring unusually large volumes (>5MB) outbound to untrusted or external endpoints.",
        "category": "Exfiltration",
        "severity": "critical",
        "enabled": True,
        "version": "1.0.0",
        "configuration": {
            "min_orig_bytes": 5000000
        }
    },
    {
        "id": "RULE-DNS-TUNNEL",
        "name": "Suspicious DNS Tunneling / High Volume Querying",
        "description": "Identifies large UDP payload transfers on port 53 inconsistent with standard DNS name queries.",
        "category": "Command and Control",
        "severity": "high",
        "enabled": True,
        "version": "1.0.0",
        "configuration": {
            "port": 53,
            "min_bytes": 65536
        }
    }
]

class RuleEngine:
    def __init__(self, rules: Optional[List[Dict[str, Any]]] = None):
        self.rules = rules or DEFAULT_RULES

    def evaluate_event(self, event: Dict[str, Any], features: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Evaluate an incoming normalized event and extracted feature dictionary against enabled rules.
        Returns a list of match evidence objects.
        """
        matches = []
        dst_port = int(features.get("dst_port", 0))
        dst_diversity = features.get("dst_port_diversity", 1)
        conn_freq = features.get("conn_frequency_window", 1)
        pkts_per_sec = features.get("pkts_per_sec", 0.0)
        orig_bytes = features.get("orig_bytes", 0.0)
        resp_bytes = features.get("resp_bytes", 0.0)

        for rule in self.rules:
            if not rule.get("enabled", True):
                continue
            
            rule_id = rule["id"]
            cfg = rule.get("configuration", {})

            # RULE-PORT-SCAN
            if rule_id == "RULE-PORT-SCAN":
                threshold_div = cfg.get("min_dst_port_diversity", 5)
                threshold_freq = cfg.get("min_conn_frequency", 8)
                if dst_diversity >= threshold_div or conn_freq >= threshold_freq:
                    matches.append({
                        "rule_id": rule_id,
                        "title": f"Heuristic: {rule['name']}",
                        "description": rule["description"],
                        "category": rule["category"],
                        "severity": rule["severity"],
                        "rule_version": rule.get("version", "1.0.0"),
                        "evidence": {
                            "observed_port_diversity": dst_diversity,
                            "threshold_port_diversity": threshold_div,
                            "observed_conn_frequency": conn_freq,
                            "threshold_conn_frequency": threshold_freq,
                            "reason": f"Observed port diversity {dst_diversity} (threshold >= {threshold_div}) with {conn_freq} requests in short window"
                        }
                    })

            # RULE-BRUTE-FORCE
            elif rule_id == "RULE-BRUTE-FORCE":
                monitored = cfg.get("monitored_ports", [22, 3389, 445])
                threshold_freq = cfg.get("min_connection_frequency", 6)
                if dst_port in monitored and conn_freq >= threshold_freq:
                    matches.append({
                        "rule_id": rule_id,
                        "title": f"Heuristic: {rule['name']} on Port {dst_port}",
                        "description": rule["description"],
                        "category": rule["category"],
                        "severity": rule["severity"],
                        "rule_version": rule.get("version", "1.0.0"),
                        "evidence": {
                            "target_port": dst_port,
                            "observed_frequency": conn_freq,
                            "threshold_frequency": threshold_freq,
                            "reason": f"Repeated connection attempts ({conn_freq} >= {threshold_freq}) targeting authentication port {dst_port}"
                        }
                    })

            # RULE-SYN-FLOOD
            elif rule_id == "RULE-SYN-FLOOD":
                min_pkts = cfg.get("min_pkts_per_sec", 500)
                if pkts_per_sec >= min_pkts:
                    matches.append({
                        "rule_id": rule_id,
                        "title": f"Heuristic: {rule['name']}",
                        "description": rule["description"],
                        "category": rule["category"],
                        "severity": rule["severity"],
                        "rule_version": rule.get("version", "1.0.0"),
                        "evidence": {
                            "observed_pkts_per_sec": round(pkts_per_sec, 2),
                            "threshold_pkts_per_sec": min_pkts,
                            "reason": f"Observed flow rate of {round(pkts_per_sec, 1)} pkts/sec exceeds {min_pkts} threshold"
                        }
                    })

            # RULE-DATA-EXFIL
            elif rule_id == "RULE-DATA-EXFIL":
                min_orig = cfg.get("min_orig_bytes", 5000000)
                if orig_bytes >= min_orig:
                    matches.append({
                        "rule_id": rule_id,
                        "title": f"Heuristic: {rule['name']}",
                        "description": rule["description"],
                        "category": rule["category"],
                        "severity": rule["severity"],
                        "rule_version": rule.get("version", "1.0.0"),
                        "evidence": {
                            "outbound_bytes": orig_bytes,
                            "threshold_bytes": min_orig,
                            "reason": f"Outbound session payload {round(orig_bytes / 1024 / 1024, 2)} MB exceeded {round(min_orig / 1024 / 1024, 2)} MB limit"
                        }
                    })

            # RULE-DNS-TUNNEL
            elif rule_id == "RULE-DNS-TUNNEL":
                if dst_port == 53 and orig_bytes >= cfg.get("min_bytes", 65536):
                    matches.append({
                        "rule_id": rule_id,
                        "title": f"Heuristic: {rule['name']}",
                        "description": rule["description"],
                        "category": rule["category"],
                        "severity": rule["severity"],
                        "rule_version": rule.get("version", "1.0.0"),
                        "evidence": {
                            "port": 53,
                            "outbound_bytes": orig_bytes,
                            "reason": f"High outbound payload size {orig_bytes} bytes detected on DNS port 53"
                        }
                    })

        return matches

rule_engine_instance = RuleEngine()
