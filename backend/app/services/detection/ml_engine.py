import os
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import shap

from backend.app.core.config import settings
from backend.app.services.detection.feature_extraction import FEATURE_NAMES

logger = logging.getLogger("xcidion.ml")

CLASS_NAMES = ["Normal", "Reconnaissance", "Brute Force", "Denial of Service", "Exfiltration"]

class MLEngine:
    def __init__(self, model_dir: str = settings.MODEL_DIR):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        self.model: Optional[RandomForestClassifier] = None
        self.explainer: Optional[shap.TreeExplainer] = None
        self.model_version: str = "1.0.0"
        self.model_path = os.path.join(self.model_dir, "xcidion_rf_baseline.joblib")
        self._load_or_train_baseline()

    def _generate_synthetic_training_data(self, n_samples: int = 1500) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generates realistic network security benchmark dataset for initial training.
        Classes: 0: Normal, 1: Reconnaissance, 2: Brute Force, 3: DoS, 4: Exfiltration
        Features: [duration, orig_bytes, resp_bytes, orig_pkts, resp_pkts, src_port, dst_port,
                   proto_code, bytes_per_sec, pkts_per_sec, conn_frequency_window, dst_port_diversity]
        """
        np.random.seed(42)
        X = []
        y = []
        
        per_class = n_samples // 5

        # Class 0: Normal (HTTP, HTTPS, DNS, browsing)
        for _ in range(per_class):
            dur = np.random.uniform(0.1, 15.0)
            orig_b = np.random.randint(200, 50000)
            resp_b = np.random.randint(500, 200000)
            orig_p = np.random.randint(5, 50)
            resp_p = np.random.randint(5, 100)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([80, 443, 53, 8080])
            proto = 1 if dst_p != 53 else 2
            bps = (orig_b + resp_b) / dur
            pps = (orig_p + resp_p) / dur
            freq = np.random.randint(1, 4)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(0)

        # Class 1: Reconnaissance (Port scan: high diversity of ports, low packets/bytes)
        for _ in range(per_class):
            dur = np.random.uniform(0.01, 0.5)
            orig_b = np.random.randint(40, 120)
            resp_b = 0
            orig_p = np.random.randint(1, 3)
            resp_p = 0
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.randint(20, 10000)
            proto = 1  # TCP SYN
            bps = orig_b / dur
            pps = orig_p / dur
            freq = np.random.randint(8, 30)
            div = np.random.randint(6, 25)
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(1)

        # Class 2: Brute Force (Targeting 22, 3389, 445 repeatedly, short duration, moderate packets)
        for _ in range(per_class):
            dur = np.random.uniform(0.2, 2.0)
            orig_b = np.random.randint(500, 4000)
            resp_b = np.random.randint(500, 3000)
            orig_p = np.random.randint(8, 25)
            resp_p = np.random.randint(8, 25)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([22, 3389, 445])
            proto = 1
            bps = (orig_b + resp_b) / dur
            pps = (orig_p + resp_p) / dur
            freq = np.random.randint(7, 20)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(2)

        # Class 3: Denial of Service (High pps, huge packet count, low resp_bytes)
        for _ in range(per_class):
            dur = np.random.uniform(1.0, 10.0)
            orig_b = np.random.randint(500000, 5000000)
            resp_b = np.random.randint(0, 1000)
            orig_p = np.random.randint(2000, 10000)
            resp_p = np.random.randint(0, 50)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([80, 443, 53, 8080])
            proto = np.random.choice([1, 2])
            bps = orig_b / dur
            pps = orig_p / dur
            freq = np.random.randint(20, 100)
            div = np.random.randint(1, 3)
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(3)

        # Class 4: Exfiltration (Massive outbound bytes, long duration, high bytes/sec)
        for _ in range(per_class):
            dur = np.random.uniform(30.0, 300.0)
            orig_b = np.random.randint(8000000, 50000000)
            resp_b = np.random.randint(10000, 50000)
            orig_p = np.random.randint(5000, 30000)
            resp_p = np.random.randint(500, 2000)
            src_p = np.random.randint(1024, 65535)
            dst_p = np.random.choice([443, 80, 8443, 9001])
            proto = 1
            bps = orig_b / dur
            pps = orig_p / dur
            freq = np.random.randint(2, 6)
            div = 1
            X.append([dur, orig_b, resp_b, orig_p, resp_p, src_p, dst_p, proto, bps, pps, freq, div])
            y.append(4)

        return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)

    def train_model(self, n_estimators: int = 50, max_depth: int = 8) -> Dict[str, Any]:
        """
        Train the baseline RandomForestClassifier model and initialize SHAP TreeExplainer.
        Computes multi-class evaluation metrics on held-out test data.
        """
        logger.info("Training XCIDION ML detection model...")
        X, y = self._generate_synthetic_training_data()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        
        clf = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
        clf.fit(X_train, y_train)
        
        y_pred = clf.predict(X_test)
        
        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1_score": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "classes": CLASS_NAMES
        }
        
        self.model = clf
        try:
            self.explainer = shap.TreeExplainer(clf)
        except Exception as e:
            logger.warning(f"Could not build TreeExplainer: {e}")
            self.explainer = None
            
        # Persist model
        joblib.dump({"model": clf, "metrics": metrics, "version": self.model_version}, self.model_path)
        logger.info(f"Model saved to {self.model_path} with F1: {metrics['f1_score']:.4f}")
        return metrics

    def _load_or_train_baseline(self):
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data["model"]
                self.model_version = data.get("version", "1.0.0")
                self.explainer = shap.TreeExplainer(self.model)
                logger.info(f"Loaded existing model from {self.model_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to load existing model {e}, retraining...")
        self.train_model()

    def predict_and_explain(self, feature_vec: np.ndarray, feature_dict: Dict[str, float]) -> Optional[Dict[str, Any]]:
        """
        Predict network traffic class and compute SHAP feature attributions.
        Returns None if predicted as Normal (class 0).
        For anomalous/malicious classes, returns prediction detail with SHAP explanation.
        """
        if self.model is None:
            return None
        
        vec_2d = feature_vec.reshape(1, -1)
        probs = self.model.predict_proba(vec_2d)[0]
        pred_class_idx = int(np.argmax(probs))
        confidence = float(probs[pred_class_idx])
        
        pred_label = CLASS_NAMES[pred_class_idx]
        
        if pred_label == "Normal":
            return None  # No alert needed for standard normal flows
        
        severity_map = {
            "Reconnaissance": "medium",
            "Brute Force": "high",
            "Denial of Service": "critical",
            "Exfiltration": "critical"
        }
        
        # Calculate SHAP explanation for predicted class
        shap_contributions = []
        base_value = 0.2  # default base value
        try:
            if self.explainer is not None:
                shap_values = self.explainer.shap_values(vec_2d)
                # shap_values format can be list of arrays per class (for older shap) or 3D array (samples, features, classes)
                if isinstance(shap_values, list):
                    class_shap = shap_values[pred_class_idx][0]
                elif hasattr(shap_values, "ndim") and shap_values.ndim == 3:
                    class_shap = shap_values[0, :, pred_class_idx]
                else:
                    class_shap = np.array(shap_values)[0]
                
                for name, val, contrib in zip(FEATURE_NAMES, feature_vec, class_shap):
                    shap_contributions.append({
                        "feature": name,
                        "value": float(val),
                        "contribution": float(contrib),
                        "impact": "increases_risk" if contrib > 0 else "reduces_risk"
                    })
                # Sort by absolute contribution descending
                shap_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        except Exception as e:
            logger.warning(f"SHAP explanation calculation failed: {e}")
            shap_contributions = [
                {"feature": k, "value": v, "contribution": 0.0, "impact": "neutral"}
                for k, v in feature_dict.items()
            ]

        return {
            "predicted_class": pred_label,
            "confidence": confidence,
            "severity": severity_map.get(pred_label, "medium"),
            "model_version": self.model_version,
            "algorithm": "RandomForestClassifier",
            "shap_explanation": {
                "base_value": base_value,
                "predicted_probability": confidence,
                "top_features": shap_contributions[:6],
                "all_features": shap_contributions
            }
        }

ml_engine_instance = MLEngine()
