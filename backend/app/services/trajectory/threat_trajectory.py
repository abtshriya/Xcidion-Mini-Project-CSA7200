import datetime
from typing import List, Dict, Any, Optional

# MITRE ATT&CK Enterprise Kill Chain Stages
ATTACK_STAGES = [
    "Reconnaissance",
    "Initial Access",
    "Execution",
    "Persistence",
    "Privilege Escalation",
    "Defense Evasion",
    "Credential Access",
    "Discovery",
    "Lateral Movement",
    "Collection",
    "Command and Control",
    "Exfiltration",
    "Impact"
]

STAGE_ORDER = {stage: idx for idx, stage in enumerate(ATTACK_STAGES)}

# Category-to-Stage Mapping
CATEGORY_TO_STAGE = {
    "Reconnaissance": "Reconnaissance",
    "Port Scan": "Reconnaissance",
    "Vulnerability Scan": "Reconnaissance",
    "Initial Access": "Initial Access",
    "Exploit Attempt": "Initial Access",
    "Brute Force": "Credential Access",
    "Credential Access": "Credential Access",
    "Authentication Failure": "Credential Access",
    "Privilege Escalation": "Privilege Escalation",
    "Lateral Movement": "Lateral Movement",
    "Discovery": "Discovery",
    "Command and Control": "Command and Control",
    "DNS Tunneling": "Command and Control",
    "Exfiltration": "Exfiltration",
    "Data Transfer": "Exfiltration",
    "Denial of Service": "Impact",
    "SYN Flood": "Impact",
    "Impact": "Impact"
}

# Probabilistic Markov transition priors between attack stages
TRANSITION_PRIORS = {
    "Reconnaissance": [
        ("Initial Access", 0.45, ["Exploit targeting identified open services", "Phishing or web access attempt"]),
        ("Credential Access", 0.35, ["Direct password spraying or brute force on identified ports"]),
        ("Discovery", 0.20, ["Secondary internal scanning"])
    ],
    "Initial Access": [
        ("Execution", 0.50, ["Payload execution or script invocation"]),
        ("Persistence", 0.30, ["Account creation or scheduled task registration"]),
        ("Credential Access", 0.20, ["LSASS dumping or memory credential search"])
    ],
    "Credential Access": [
        ("Privilege Escalation", 0.45, ["Elevating tokens using harvested credentials"]),
        ("Lateral Movement", 0.40, ["Pivoting to neighboring hosts with validated credentials"]),
        ("Command and Control", 0.15, ["Establishing persistence beacon"])
    ],
    "Privilege Escalation": [
        ("Defense Evasion", 0.40, ["Disabling endpoint logging or audit rules"]),
        ("Lateral Movement", 0.35, ["Accessing adjacent high-privilege resources"]),
        ("Collection", 0.25, ["Targeting sensitive database access"])
    ],
    "Lateral Movement": [
        ("Collection", 0.45, ["Gathering confidential archives from remote targets"]),
        ("Command and Control", 0.30, ["Secondary C2 link establishment"]),
        ("Impact", 0.25, ["Multi-node ransomware or disruption launch"])
    ],
    "Command and Control": [
        ("Exfiltration", 0.60, ["Staged data egress through established C2 tunnel"]),
        ("Impact", 0.40, ["Remote command delivery for destruction or service denial"])
    ],
    "Collection": [
        ("Exfiltration", 0.75, ["Outbound transfer of gathered confidential files"]),
        ("Impact", 0.25, ["Ransomware encryption of collected repositories"])
    ],
    "Exfiltration": [
        ("Impact", 0.80, ["Data destruction, wiper deployment, or extortion"]),
        ("Defense Evasion", 0.20, ["Log wiping to conceal data egress footprint"])
    ],
    "Impact": [
        ("Defense Evasion", 0.60, ["Anti-forensic log tampering post-incident"]),
        ("Command and Control", 0.40, ["Maintaining covert access channel"])
    ]
}

class ThreatTrajectoryEngine:
    def __init__(self):
        self.model_version = "MarkovTrajectory-v1.4"

    def estimate_trajectory(
        self,
        incident_id: str,
        alerts: List[Dict[str, Any]],
        feedback: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Estimates the current attack stage and projects candidate next stages.
        Enforces honest handling of insufficient evidence.
        """
        now = datetime.datetime.now(datetime.timezone.utc)

        # Insufficient evidence condition
        if not alerts or len(alerts) == 0:
            return {
                "incident_id": incident_id,
                "current_stage": "Unknown",
                "estimated_stage": "Unknown",
                "predicted_stage": None,
                "confidence": 0.0,
                "ranked_candidates": [],
                "supporting_events": [],
                "evaluation_status": "insufficient_evidence",
                "evidence_summary": "Insufficient evidence for a reliable prediction. No security alerts associated with this incident.",
                "model_version": self.model_version,
                "prediction_timestamp": now,
                "feedback": feedback
            }

        # Map alerts to MITRE stages
        observed_stages = []
        supporting_events = []
        
        # Sort alerts chronologically
        sorted_alerts = sorted(alerts, key=lambda a: a.get("created_at") or datetime.datetime.min)
        
        for a in sorted_alerts:
            cat = a.get("detection_category", "")
            stage = CATEGORY_TO_STAGE.get(cat, "Execution" if "Malware" in cat else "Reconnaissance")
            observed_stages.append(stage)
            supporting_events.append({
                "alert_id": a.get("id"),
                "title": a.get("title"),
                "category": cat,
                "mapped_stage": stage,
                "severity": a.get("severity"),
                "timestamp": str(a.get("created_at"))
            })

        # The current estimated stage is the most advanced or latest observed stage in the sequence
        # We weigh both recency and kill-chain depth
        latest_stage = observed_stages[-1]
        highest_stage = max(observed_stages, key=lambda s: STAGE_ORDER.get(s, 0))
        
        # If the latest stage is higher or equal, use latest; else use highest
        current_stage = latest_stage if STAGE_ORDER.get(latest_stage, 0) >= STAGE_ORDER.get(highest_stage, 0) else highest_stage

        # If only 1 alert is available, evidence is weak
        is_weak_evidence = (len(alerts) < 2)
        base_confidence = 0.52 if is_weak_evidence else min(0.92, 0.65 + (len(alerts) * 0.06))

        # Project next candidate stages
        transitions = TRANSITION_PRIORS.get(current_stage, [
            ("Exfiltration", 0.5, ["Data egress"]),
            ("Impact", 0.5, ["Service disruption"])
        ])

        ranked_candidates = []
        for candidate_stage, prob, indicators in transitions:
            ranked_candidates.append({
                "stage": candidate_stage,
                "probability": round(prob * base_confidence, 2),
                "evidence_indicators": indicators
            })

        predicted_stage = ranked_candidates[0]["stage"] if ranked_candidates else "Impact"
        pred_confidence = base_confidence

        eval_status = "estimated" if not is_weak_evidence else "insufficient_evidence"
        summary = (
            f"Observed sequence of {len(alerts)} alert(s) across stage(s) [{', '.join(set(observed_stages))}]. "
            f"Adversary estimated at stage '{current_stage}'. "
            f"Based on progression vectors, '{predicted_stage}' is the highest ranked potential next stage with {int(pred_confidence * 100)}% confidence."
        )
        if is_weak_evidence:
            summary += " Warning: Limited alert sequence; prediction confidence is reduced."

        return {
            "incident_id": incident_id,
            "current_stage": current_stage,
            "estimated_stage": current_stage,
            "predicted_stage": predicted_stage,
            "confidence": pred_confidence,
            "ranked_candidates": ranked_candidates,
            "supporting_events": supporting_events,
            "evaluation_status": eval_status,
            "evidence_summary": summary,
            "model_version": self.model_version,
            "prediction_timestamp": now,
            "feedback": feedback
        }

threat_trajectory_engine = ThreatTrajectoryEngine()
