import os
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
    IsolationForest
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import shap

from backend.app.core.config import settings
from backend.app.services.detection.feature_extraction import FEATURE_NAMES

logger = logging.getLogger("xcidion.ml")

CLASS_NAMES = [
    "Normal",
    "Reconnaissance",
    "Brute Force",
    "Denial of Service",
    "Exfiltration",
    "Lateral Movement",
    "C2 Beaconing"
]

FEATURE_DESCRIPTIONS = {
    "duration": "Total flow lifetime in seconds",
    "orig_bytes": "Bytes transmitted by source host",
    "resp_bytes": "Bytes returned by destination responder",
    "orig_pkts": "Packets sent from source to destination",
    "resp_pkts": "Packets returned by destination host",
    "src_port": "Ephemeral or well-known source port number",
    "dst_port": "Target destination service port",
    "proto_code": "Transport layer protocol (1=TCP, 2=UDP, 3=ICMP)",
    "bytes_per_sec": "Aggregate transfer bandwidth in bytes/second",
    "pkts_per_sec": "Packet transmission rate in packets/second",
    "conn_frequency_window": "Connection rate from source within sliding time window",
    "dst_port_diversity": "Distinct destination ports targeted by source within window"
}

class MLEngine:
    def __init__(self, model_dir: str = settings.MODEL_DIR):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        self.model: Optional[Any] = None
        self.anomaly_detector: Optional[IsolationForest] = None
        self.explainer: Optional[shap.TreeExplainer] = None
        self.model_version: str = "2.0.0"
        self.algorithm_name: str = "RandomForestClassifier"
        self.model_path = os.path.join(self.model_dir, "xcidion_rf_baseline.joblib")
        self.anomaly_path = os.path.join(self.model_dir, "xcidion_anomaly_detector.joblib")
        self._global_shap_cache: Optional[List[Dict[str, Any]]] = None
        self._load_or_train_baseline()

    def _generate_synthetic_training_data(self, n_samples: int = 2100) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generates comprehensive multi-class network security flow benchmark dataset.
        Classes:
          0: Normal
          1: Reconnaissance (Port sweeps, horizontal reconnaissance)
          2: Brute Force (SSH/RDP rapid authentication attempts)
          3: Denial of Service (High-rate packet flood)
          4: Exfiltration (Massive outbound byte flow)
          5: Lateral Movement (Internal SMB/RPC pivots)
          6: C2 Beaconing (Periodic low-jitter heartbeats)
        """
        np.random.seed(42)
        X = []
        y = []
        
        per_class = n_samples // len(CLASS_NAMES)

        # 0: Normal
        for _ in range(per_class):
            dur = np.random.uniform(0.2, 12.0)
            orig_b = np.random.randint(250, 45000)
            resp_b = np.random.randint(600, 180000)
            orig_p = np.random.randint(6, 45)
            resp_p = np.random.randint(6, 90)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([80, 443, 53, 8080, 8443])
            proto = 1 if dst_p != 53 else 2
            bps = (orig_b + resp_b) / dur
            pps = (orig_p + resp_p) / dur
            freq = np.random.randint(1, 4)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(0)

        # 1: Reconnaissance (High port diversity, low bytes/packet count, rapid connections)
        for _ in range(per_class):
            dur = np.random.uniform(0.01, 0.4)
            orig_b = np.random.randint(40, 90)
            resp_b = 0
            orig_p = np.random.randint(1, 3)
            resp_p = 0
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.randint(20, 15000)
            proto = 1
            bps = orig_b / dur
            pps = orig_p / dur
            freq = np.random.randint(12, 35)
            div = np.random.randint(8, 30)
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(1)

        # 2: Brute Force (Targeting 22, 3389, 445; repetitive attempts; low response payload)
        for _ in range(per_class):
            dur = np.random.uniform(0.3, 1.8)
            orig_b = np.random.randint(700, 3500)
            resp_b = np.random.randint(600, 2500)
            orig_p = np.random.randint(10, 28)
            resp_p = np.random.randint(10, 28)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([22, 3389, 445])
            proto = 1
            bps = (orig_b + resp_b) / dur
            pps = (orig_p + resp_p) / dur
            freq = np.random.randint(10, 25)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(2)

        # 3: Denial of Service (High PPS, thousands of packets, zero/low response bytes)
        for _ in range(per_class):
            dur = np.random.uniform(1.0, 8.0)
            orig_b = np.random.randint(400000, 4500000)
            resp_b = np.random.randint(0, 800)
            orig_p = np.random.randint(3000, 12000)
            resp_p = np.random.randint(0, 30)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([80, 443, 53, 8000, 8080])
            proto = np.random.choice([1, 2])
            bps = orig_b / dur
            pps = orig_p / dur
            freq = np.random.randint(30, 120)
            div = np.random.randint(1, 2)
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(3)

        # 4: Exfiltration (Massive outbound transfer, sustained duration, high bytes/second)
        for _ in range(per_class):
            dur = np.random.uniform(40.0, 360.0)
            orig_b = np.random.randint(12000000, 65000000)
            resp_b = np.random.randint(8000, 40000)
            orig_p = np.random.randint(8000, 45000)
            resp_p = np.random.randint(400, 1800)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([443, 80, 8443, 9001, 21])
            proto = 1
            bps = orig_b / dur
            pps = orig_p / dur
            freq = np.random.randint(2, 5)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(4)

        # 5: Lateral Movement (Internal workstation to internal server on SMB 445 or RPC 135)
        for _ in range(per_class):
            dur = np.random.uniform(0.5, 4.0)
            orig_b = np.random.randint(2500, 18000)
            resp_b = np.random.randint(1800, 12000)
            orig_p = np.random.randint(15, 60)
            resp_p = np.random.randint(12, 55)
            src_p = np.random.randint(49152, 65535)
            dst_p = np.random.choice([445, 135, 139, 5985, 22])
            proto = 1
            bps = (orig_b + resp_b) / dur
            pps = (orig_p + resp_p) / dur
            freq = np.random.randint(6, 18)
            div = np.random.randint(2, 4)
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(5)

        # 6: C2 Beaconing (Regular periodic heartbeat; uniform packet counts; predictable timing)
        for _ in range(per_class):
            dur = np.random.uniform(0.1, 0.6)
            orig_b = np.random.randint(120, 450)
            resp_b = np.random.randint(80, 300)
            orig_p = np.random.randint(3, 6)
            resp_p = np.random.randint(3, 6)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([443, 80, 8080, 53])
            proto = 1 if dst_p != 53 else 2
            bps = (orig_b + resp_b) / dur
            pps = (orig_p + resp_p) / dur
            freq = np.random.randint(15, 40)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(6)

        return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)

    def train_model(
        self,
        algorithm: str = "RandomForestClassifier",
        n_estimators: int = 60,
        max_depth: int = 9,
        contamination: float = 0.12
    ) -> Dict[str, Any]:
        """
        Train the primary supervised AI model, train the unsupervised IsolationForest anomaly detector,
        and initialize SHAP TreeExplainer for instantaneous explainability.
        """
        logger.info(f"Training XCIDION AI detection model using {algorithm}...")
        X, y = self._generate_synthetic_training_data()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        
        # Instantiate requested algorithm
        if algorithm == "ExtraTreesClassifier":
            clf = ExtraTreesClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
            self.algorithm_name = "ExtraTreesClassifier"
        elif algorithm == "HistGradientBoostingClassifier":
            clf = HistGradientBoostingClassifier(max_iter=n_estimators, max_depth=max_depth, random_state=42)
            self.algorithm_name = "HistGradientBoostingClassifier"
        else:
            clf = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
            self.algorithm_name = "RandomForestClassifier"

        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)

        # Train IsolationForest for zero-day anomaly scoring
        iso = IsolationForest(n_estimators=80, contamination=contamination, random_state=42)
        iso.fit(X_train)
        self.anomaly_detector = iso

        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1_score": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "classes": CLASS_NAMES,
            "algorithm": self.algorithm_name
        }

        self.model = clf
        try:
            self.explainer = shap.TreeExplainer(clf)
        except Exception as e:
            logger.warning(f"Could not build TreeExplainer: {e}")
            self.explainer = None

        # Compute and cache global SHAP importances
        self._compute_global_shap(X_test)

        # Persist supervised model & anomaly detector
        joblib.dump({
            "model": clf,
            "metrics": metrics,
            "version": self.model_version,
            "algorithm": self.algorithm_name
        }, self.model_path)

        joblib.dump(iso, self.anomaly_path)
        logger.info(f"Model and Anomaly Detector saved to {self.model_path} with F1: {metrics['f1_score']:.4f}")
        return metrics

    def _compute_global_shap(self, X_sample: np.ndarray):
        """
        Computes mean absolute SHAP feature importances across the benchmark evaluation set.
        """
        if self.explainer is None:
            return

        try:
            sample_sub = X_sample[:60]
            shap_vals = self.explainer.shap_values(sample_sub)
            
            # Format handling across shap versions
            if isinstance(shap_vals, list):
                # List of arrays per class (samples, features)
                stacked = np.mean([np.abs(c) for c in shap_vals], axis=0) # (samples, features)
                mean_importances = np.mean(stacked, axis=0) # (features,)
            elif hasattr(shap_vals, "ndim") and shap_vals.ndim == 3:
                # 3D array: (samples, features, classes)
                mean_importances = np.mean(np.abs(shap_vals), axis=(0, 2))
            else:
                mean_importances = np.mean(np.abs(np.array(shap_vals)), axis=0)

            total = float(np.sum(mean_importances)) or 1.0
            global_list = []
            for name, imp in zip(FEATURE_NAMES, mean_importances):
                pct = round((float(imp) / total) * 100, 1)
                global_list.append({
                    "feature": name,
                    "importance_score": float(imp),
                    "importance_percentage": pct,
                    "description": FEATURE_DESCRIPTIONS.get(name, "")
                })

            global_list.sort(key=lambda x: x["importance_score"], reverse=True)
            self._global_shap_cache = global_list
        except Exception as e:
            logger.warning(f"Global SHAP calculation warning: {e}")
            self._global_shap_cache = [
                {"feature": f, "importance_score": 1.0, "importance_percentage": round(100.0/len(FEATURE_NAMES), 1), "description": FEATURE_DESCRIPTIONS.get(f, "")}
                for f in FEATURE_NAMES
            ]

    def get_global_shap_importances(self) -> List[Dict[str, Any]]:
        """
        Returns global feature importance rankings for model interpretability.
        """
        if self._global_shap_cache is None:
            X, _ = self._generate_synthetic_training_data(n_samples=200)
            self._compute_global_shap(X)
        return self._global_shap_cache or []

    def _load_or_train_baseline(self):
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data["model"]
                self.model_version = data.get("version", "2.0.0")
                self.algorithm_name = data.get("algorithm", "RandomForestClassifier")
                self.explainer = shap.TreeExplainer(self.model)
                if os.path.exists(self.anomaly_path):
                    self.anomaly_detector = joblib.load(self.anomaly_path)
                logger.info(f"Loaded existing AI model from {self.model_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to load existing model {e}, retraining...")
        self.train_model()

    def generate_ai_threat_narrative(
        self,
        pred_class: str,
        confidence: float,
        anomaly_score: float,
        top_features: List[Dict[str, Any]],
        feature_dict: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Synthesizes human-readable AI diagnostic explanations and actionable recommendations
        grounded in the computed SHAP feature attributions and anomaly score.
        """
        # Primary risk features (positive SHAP contributions)
        risk_drivers = [f for f in top_features if f["contribution"] > 0]
        mitigators = [f for f in top_features if f["contribution"] < 0]

        driver_phrases = []
        for d in risk_drivers[:3]:
            fname = d["feature"]
            fval = d["value"]
            if fname == "dst_port_diversity" and fval > 3:
                driver_phrases.append(f"unusually high destination port diversity ({int(fval)} unique ports)")
            elif fname == "conn_frequency_window" and fval > 6:
                driver_phrases.append(f"burst connection velocity ({int(fval)} connects in sliding window)")
            elif fname == "pkts_per_sec" and fval > 500:
                driver_phrases.append(f"extreme packet rate ({int(fval):,} pkts/sec)")
            elif fname == "bytes_per_sec" and fval > 100000:
                driver_phrases.append(f"heavy egress transfer rate ({int(fval):,} B/s)")
            elif fname == "dst_port" and int(fval) in [22, 3389, 445]:
                driver_phrases.append(f"targeting sensitive management port {int(fval)}")
            elif fname == "resp_bytes" and fval == 0:
                driver_phrases.append("unilateral communication with zero return bytes")
            else:
                driver_phrases.append(f"elevated {fname} ({fval:.1f})")

        drivers_text = ", ".join(driver_phrases) if driver_phrases else "behavioral vector deviation"

        # Anomaly level classification
        if anomaly_score > 0.75:
            anomaly_label = "Severe Anomaly (Zero-Day Candidate)"
        elif anomaly_score > 0.50:
            anomaly_label = "Elevated Anomaly"
        else:
            anomaly_label = "Moderate Deviation"

        # Actionable containment guidance
        recommendations = {
            "Reconnaissance": "Deploy dynamic firewall drop rule on source IP; monitor for lateral pivot attempts against discovered endpoints.",
            "Brute Force": "Enforce immediate temporary host block at firewall perimeter; verify target service credential logs for successful authentications.",
            "Denial of Service": "Activate rate-limiting on target port; scrub ingress flow via edge DDoS mitigators.",
            "Exfiltration": "Sever active TCP session immediately; quarantine source host and perform digital forensic capture of memory and outbound sockets.",
            "Lateral Movement": "Revoke active session tokens for the affected host; restrict internal SMB/RPC routing between segmented subnets.",
            "C2 Beaconing": "Sinkhole the external destination domain/IP; inspect endpoint persistence mechanisms and scheduled tasks."
        }.get(pred_class, "Investigate source and target host telemetry; isolate endpoint if anomalous outbound egress persists.")

        summary_narrative = (
            f"The AI Classifier identified this traffic as '{pred_class}' with {round(confidence * 100, 1)}% confidence. "
            f"The primary risk drivers were {drivers_text}. "
            f"Unsupervised IsolationForest scored flow anomaly at {round(anomaly_score, 2)} ({anomaly_label})."
        )

        return {
            "summary": summary_narrative,
            "anomaly_score": round(anomaly_score, 3),
            "anomaly_level": anomaly_label,
            "primary_drivers": [d["feature"] for d in risk_drivers[:3]],
            "recommended_action": recommendations
        }

    def predict_and_explain(
        self,
        feature_vec: np.ndarray,
        feature_dict: Dict[str, float]
    ) -> Optional[Dict[str, Any]]:
        """
        Executes supervised classification, computes unsupervised anomaly scores,
        and generates exact SHAP feature attributions with waterfall accumulation.
        Returns None for benign normal traffic.
        """
        if self.model is None:
            return None

        vec_2d = feature_vec.reshape(1, -1)
        probs = self.model.predict_proba(vec_2d)[0]
        pred_class_idx = int(np.argmax(probs))
        confidence = float(probs[pred_class_idx])
        pred_label = CLASS_NAMES[pred_class_idx]

        # Compute unsupervised anomaly score via IsolationForest
        anomaly_score = 0.25
        if self.anomaly_detector is not None:
            try:
                # decision_function gives negative values for anomalies; normalize to 0..1 scale
                raw_score = float(self.anomaly_detector.decision_function(vec_2d)[0])
                # Typical range is [-0.5, 0.5]; map to [1.0, 0.0]
                anomaly_score = max(0.0, min(1.0, 0.5 - raw_score))
            except Exception:
                anomaly_score = 0.25

        # If predicted Normal and not a critical anomaly, no alert needed
        if pred_label == "Normal" and anomaly_score < 0.70:
            return None

        # If Normal class had extreme anomaly score, classify as Zero-Day Anomaly
        if pred_label == "Normal" and anomaly_score >= 0.70:
            pred_label = "Unsupervised Zero-Day Anomaly"
            confidence = anomaly_score

        severity_map = {
            "Reconnaissance": "medium",
            "Brute Force": "high",
            "Denial of Service": "critical",
            "Exfiltration": "critical",
            "Lateral Movement": "high",
            "C2 Beaconing": "high",
            "Unsupervised Zero-Day Anomaly": "critical"
        }

        # Calculate SHAP explanation for predicted class
        shap_contributions = []
        base_value = 1.0 / len(CLASS_NAMES)  # Expected probability prior

        try:
            if self.explainer is not None:
                shap_values = self.explainer.shap_values(vec_2d)

                if isinstance(shap_values, list):
                    class_idx = min(pred_class_idx, len(shap_values) - 1)
                    class_shap = shap_values[class_idx][0]
                    if hasattr(self.explainer, "expected_value") and isinstance(self.explainer.expected_value, (list, np.ndarray)):
                        base_value = float(self.explainer.expected_value[class_idx])
                elif hasattr(shap_values, "ndim") and shap_values.ndim == 3:
                    class_idx = min(pred_class_idx, shap_values.shape[2] - 1)
                    class_shap = shap_values[0, :, class_idx]
                    if hasattr(self.explainer, "expected_value") and isinstance(self.explainer.expected_value, (list, np.ndarray)):
                        base_value = float(self.explainer.expected_value[class_idx])
                else:
                    class_shap = np.array(shap_values)[0]
                    if hasattr(self.explainer, "expected_value"):
                        base_value = float(self.explainer.expected_value)

                # Format feature contributions
                running_sum = base_value
                for name, val, contrib in zip(FEATURE_NAMES, feature_vec, class_shap):
                    c_val = float(contrib)
                    shap_contributions.append({
                        "feature": name,
                        "description": FEATURE_DESCRIPTIONS.get(name, ""),
                        "value": float(val),
                        "contribution": c_val,
                        "impact": "increases_threat_probability" if c_val > 0 else "decreases_threat_probability"
                    })

                # Sort by absolute contribution magnitude descending
                shap_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        except Exception as e:
            logger.warning(f"SHAP explanation calculation failed: {e}")
            shap_contributions = [
                {
                    "feature": k,
                    "description": FEATURE_DESCRIPTIONS.get(k, ""),
                    "value": float(v),
                    "contribution": 0.0,
                    "impact": "neutral"
                }
                for k, v in feature_dict.items()
            ]

        # Build waterfall breakdown data
        waterfall = []
        current = base_value
        waterfall.append({
            "step": "Base Expected Value",
            "delta": 0.0,
            "cumulative": round(current, 4)
        })
        for f in shap_contributions[:6]:
            current += f["contribution"]
            waterfall.append({
                "step": f["feature"],
                "delta": round(f["contribution"], 4),
                "cumulative": round(current, 4),
                "value": f["value"]
            })

        # Synthesize AI Threat Narrative
        ai_narrative = self.generate_ai_threat_narrative(
            pred_class=pred_label,
            confidence=confidence,
            anomaly_score=anomaly_score,
            top_features=shap_contributions,
            feature_dict=feature_dict
        )

        return {
            "predicted_class": pred_label,
            "confidence": confidence,
            "severity": severity_map.get(pred_label, "medium"),
            "model_version": self.model_version,
            "algorithm": self.algorithm_name,
            "anomaly_score": round(anomaly_score, 3),
            "shap_explanation": {
                "base_value": round(base_value, 4),
                "predicted_probability": round(confidence, 4),
                "top_features": shap_contributions[:6],
                "all_features": shap_contributions,
                "waterfall": waterfall,
                "ai_narrative": ai_narrative
            }
        }

ml_engine_instance = MLEngine()
