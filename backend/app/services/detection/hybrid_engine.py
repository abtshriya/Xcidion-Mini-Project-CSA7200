import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.app.services.detection.feature_extraction import extract_features_from_event
from backend.app.services.detection.rule_engine import rule_engine_instance
from backend.app.services.detection.ml_engine import ml_engine_instance

class HybridDetectionEngine:
    def __init__(self):
        self.rule_engine = rule_engine_instance
        self.ml_engine = ml_engine_instance

    def process_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Coordinates all 4 detection layers on an incoming network event:
        1. Suricata Signature Detection
        2. Zeek Context Ingestion
        3. Scikit-learn ML Classification with SHAP Explainability
        4. Rule-based Heuristic Detection
        Returns a list of created alert candidate dictionaries.
        """
        alerts = []
        payload = event.get("normalised_payload", {}) or {}
        event_id = event.get("id") or f"EVT-{uuid.uuid4().hex[:12].upper()}"
        sensor_id = event.get("sensor_id", "SENSOR-DEFAULT")

        # ----------------------------------------------------
        # Layer 1: Suricata Signature Match (if present in payload)
        # ----------------------------------------------------
        if "suricata_alert" in payload or event.get("event_type") == "suricata_alert":
            suricata_data = payload.get("suricata_alert", payload)
            sig_name = suricata_data.get("signature", "Suricata Alert")
            sig_id = suricata_data.get("signature_id", 0)
            category = suricata_data.get("category", "Exploit Attempt")
            severity_num = suricata_data.get("severity", 2)
            
            # Map numeric Suricata severity (1=High, 2=Medium, 3=Low)
            severity = "critical" if severity_num == 1 else "high" if severity_num == 2 else "medium"
            
            alerts.append({
                "id": f"ALT-{uuid.uuid4().hex[:12].upper()}",
                "event_id": event_id,
                "sensor_id": sensor_id,
                "title": f"Suricata: {sig_name}",
                "description": f"Suricata IDS Signature Match [SID: {sig_id}] in category {category}.",
                "detection_source": "suricata",
                "detection_category": category,
                "severity": severity,
                "confidence": 0.98,
                "status": "new",
                "rule_version": f"SID-{sig_id}",
                "model_version": None,
                "evidence": {
                    "signature": sig_name,
                    "signature_id": sig_id,
                    "suricata_category": category,
                    "flow_id": suricata_data.get("flow_id"),
                    "payload_snippet": str(suricata_data.get("payload_printable", ""))[:200]
                }
            })

        # ----------------------------------------------------
        # Extract Features for ML and Rule-based checks
        # ----------------------------------------------------
        vec, feature_dict = extract_features_from_event(event)

        # ----------------------------------------------------
        # Layer 3: Machine Learning Detection + SHAP Explanation
        # ----------------------------------------------------
        ml_result = self.ml_engine.predict_and_explain(vec, feature_dict)
        if ml_result:
            pred_class = ml_result["predicted_class"]
            alerts.append({
                "id": f"ALT-{uuid.uuid4().hex[:12].upper()}",
                "event_id": event_id,
                "sensor_id": sensor_id,
                "title": f"ML Detection: {pred_class} Pattern",
                "description": f"RandomForestClassifier detected traffic characteristics matching '{pred_class}' with {round(ml_result['confidence'] * 100, 1)}% confidence.",
                "detection_source": "ml",
                "detection_category": pred_class,
                "severity": ml_result["severity"],
                "confidence": ml_result["confidence"],
                "status": "new",
                "rule_version": None,
                "model_version": ml_result["model_version"],
                "evidence": {
                    "algorithm": ml_result["algorithm"],
                    "confidence": ml_result["confidence"],
                    "shap_explanation": ml_result["shap_explanation"],
                    "feature_values": feature_dict
                }
            })

        # ----------------------------------------------------
        # Layer 4: Rule-based Heuristic Engine
        # ----------------------------------------------------
        rule_matches = self.rule_engine.evaluate_event(event, feature_dict)
        for match in rule_matches:
            # Check for duplicate if ML already created an alert with same category
            is_dup = any(a["detection_category"] == match["category"] for a in alerts)
            if not is_dup:
                alerts.append({
                    "id": f"ALT-{uuid.uuid4().hex[:12].upper()}",
                    "event_id": event_id,
                    "sensor_id": sensor_id,
                    "title": match["title"],
                    "description": match["description"],
                    "detection_source": "rule",
                    "detection_category": match["category"],
                    "severity": match["severity"],
                    "confidence": 0.88,
                    "status": "new",
                    "rule_version": match["rule_version"],
                    "model_version": None,
                    "evidence": match["evidence"]
                })

        return alerts

hybrid_engine_instance = HybridDetectionEngine()
