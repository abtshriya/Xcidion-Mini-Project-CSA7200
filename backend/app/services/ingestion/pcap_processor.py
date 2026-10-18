import os
import shutil
import subprocess
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.services.ingestion.pipeline import ingestion_pipeline

logger = logging.getLogger("xcidion.pcap")

class PCAPProcessor:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
        self.tshark_path = settings.TSHARK_PATH

    def is_tshark_available(self) -> bool:
        return shutil.which(self.tshark_path) is not None

    def process_pcap_file(self, db: Session, file_path: str, sensor_id: str = "SENSOR-PCAP-01") -> Dict[str, Any]:
        """
        Parses PCAP file into structured flow records and feeds into ingestion pipeline.
        Uses safe argument list invocation (no shell injection).
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PCAP file not found: {file_path}")

        events_processed = 0
        alerts_created = 0

        if not self.is_tshark_available():
            logger.warning(
                f"TShark binary ('{self.tshark_path}') not found on host. "
                "Offline PCAP packet extraction requires Wireshark / TShark to be installed in PATH."
            )
            return {
                "status": "prerequisite_missing",
                "message": "TShark binary was not found in system PATH. Install Wireshark/TShark to enable offline PCAP packet dissection.",
                "file_path": file_path,
                "events_processed": 0,
                "alerts_created": 0
            }

        # Safe invocation of tshark: extract frame time, src ip, dst ip, src port, dst port, protocol, frame length
        cmd = [
            self.tshark_path,
            "-r", file_path,
            "-T", "fields",
            "-e", "frame.time_epoch",
            "-e", "ip.src",
            "-e", "ip.dst",
            "-e", "tcp.srcport",
            "-e", "tcp.dstport",
            "-e", "_ws.col.Protocol",
            "-e", "frame.len",
            "-E", "separator=,",
            "-c", "5000"  # Bound processing to 5000 packets per batch
        ]

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.PCAP_PROCESSING_TIMEOUT_SEC,
                check=True
            )
            lines = res.stdout.strip().splitlines()
            for line in lines:
                parts = line.split(",")
                if len(parts) >= 6 and parts[1] and parts[2]:
                    src_ip = parts[1]
                    dst_ip = parts[2]
                    src_port = int(parts[3]) if parts[3].isdigit() else 0
                    dst_port = int(parts[4]) if parts[4].isdigit() else 0
                    proto = parts[5] or "TCP"
                    length = int(parts[6]) if len(parts) > 6 and parts[6].isdigit() else 64
                    
                    event = {
                        "sensor_id": sensor_id,
                        "source_ip": src_ip,
                        "destination_ip": dst_ip,
                        "source_port": src_port,
                        "destination_port": dst_port,
                        "protocol": proto,
                        "event_type": "pcap_packet",
                        "normalised_payload": {
                            "orig_bytes": length,
                            "resp_bytes": 0,
                            "orig_pkts": 1,
                            "resp_pkts": 0,
                            "duration": 0.001
                        },
                        "source_reference": os.path.basename(file_path)
                    }
                    ingest_res = ingestion_pipeline.process_and_persist(db, event, source_type="tshark")
                    events_processed += 1
                    alerts_created += ingest_res["alerts_created"]

            return {
                "status": "success",
                "file_path": file_path,
                "events_processed": events_processed,
                "alerts_created": alerts_created
            }
        except Exception as e:
            logger.error(f"Error executing TShark on {file_path}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "file_path": file_path,
                "events_processed": events_processed,
                "alerts_created": alerts_created
            }

pcap_processor = PCAPProcessor()
