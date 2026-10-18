import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple

FEATURE_NAMES = [
    "duration",
    "orig_bytes",
    "resp_bytes",
    "orig_pkts",
    "resp_pkts",
    "src_port",
    "dst_port",
    "proto_code",
    "bytes_per_sec",
    "pkts_per_sec",
    "conn_frequency_window",
    "dst_port_diversity"
]

PROTO_MAP = {
    "TCP": 1,
    "UDP": 2,
    "ICMP": 3,
    "OTHER": 0
}

def extract_features_from_event(event_dict: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Extract normalised numeric features from a raw or normalised event dictionary.
    Safe bounds and fallback values are applied.
    """
    payload = event_dict.get("normalised_payload", {}) or {}
    
    duration = float(payload.get("duration", 0.0) or 0.0)
    duration = max(0.0, min(duration, 86400.0))  # Bound between 0 and 24h
    
    orig_bytes = int(payload.get("orig_bytes", 0) or 0)
    orig_bytes = max(0, min(orig_bytes, 1000000000))
    
    resp_bytes = int(payload.get("resp_bytes", 0) or 0)
    resp_bytes = max(0, min(resp_bytes, 1000000000))
    
    orig_pkts = int(payload.get("orig_pkts", 1) or 1)
    orig_pkts = max(0, min(orig_pkts, 1000000))
    
    resp_pkts = int(payload.get("resp_pkts", 0) or 0)
    resp_pkts = max(0, min(resp_pkts, 1000000))
    
    src_port = int(event_dict.get("source_port", 0) or 0)
    src_port = max(0, min(src_port, 65535))
    
    dst_port = int(event_dict.get("destination_port", 0) or 0)
    dst_port = max(0, min(dst_port, 65535))
    
    proto_str = str(event_dict.get("protocol", "TCP")).upper()
    proto_code = PROTO_MAP.get(proto_str, 0)
    
    total_bytes = orig_bytes + resp_bytes
    total_pkts = orig_pkts + resp_pkts
    
    eff_duration = max(duration, 0.001)
    bytes_per_sec = float(total_bytes) / eff_duration
    pkts_per_sec = float(total_pkts) / eff_duration
    
    conn_frequency_window = int(payload.get("conn_frequency_window", 1) or 1)
    dst_port_diversity = int(payload.get("dst_port_diversity", 1) or 1)
    
    feature_dict = {
        "duration": duration,
        "orig_bytes": float(orig_bytes),
        "resp_bytes": float(resp_bytes),
        "orig_pkts": float(orig_pkts),
        "resp_pkts": float(resp_pkts),
        "src_port": float(src_port),
        "dst_port": float(dst_port),
        "proto_code": float(proto_code),
        "bytes_per_sec": bytes_per_sec,
        "pkts_per_sec": pkts_per_sec,
        "conn_frequency_window": float(conn_frequency_window),
        "dst_port_diversity": float(dst_port_diversity)
    }
    
    vec = np.array([feature_dict[name] for name in FEATURE_NAMES], dtype=np.float32)
    return vec, feature_dict
