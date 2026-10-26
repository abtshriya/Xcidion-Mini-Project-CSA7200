import os
import shutil
import socket
import datetime
import ipaddress
import subprocess
import asyncio
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.models.entities import ApprovedSubnet, Device, ScanJob, Alert, NetworkEvent
from backend.app.websocket.manager import ws_manager

logger = logging.getLogger("xcidion.scanner")

COMMON_PORTS = [
    (21, "FTP"),
    (22, "SSH"),
    (23, "Telnet"),
    (25, "SMTP"),
    (53, "DNS"),
    (80, "HTTP"),
    (110, "POP3"),
    (135, "RPC"),
    (139, "NetBIOS"),
    (443, "HTTPS"),
    (445, "SMB"),
    (1433, "MSSQL"),
    (3306, "MySQL"),
    (3389, "RDP"),
    (5000, "Flask/App"),
    (5432, "PostgreSQL"),
    (8000, "HTTP-Alt/FastAPI"),
    (8080, "HTTP-Proxy"),
    (8443, "HTTPS-Alt"),
    (9000, "SonarQube/App")
]

DEFAULT_APPROVED_CIDRS = [
    ("127.0.0.1/32", "Localhost Loopback Scope", "Self-system vulnerability and open port audit"),
    ("192.168.1.0/24", "Core Lab / Internal Subnet", "Primary corporate LAN & workstation pool"),
    ("10.0.0.0/24", "DMZ Perimeter Network", "Public facing services and bastion segment"),
    ("172.16.0.0/24", "Internal Services VLAN", "Internal enterprise databases and application tier")
]

class NetworkScannerService:
    @staticmethod
    def get_approved_subnets(db: Session) -> List[ApprovedSubnet]:
        subnets = db.query(ApprovedSubnet).filter(ApprovedSubnet.is_active == True).all()
        if not subnets:
            # Seed default approved subnets
            for cidr, label, desc in DEFAULT_APPROVED_CIDRS:
                sub = ApprovedSubnet(cidr=cidr, label=label, description=desc, is_active=True)
                db.add(sub)
            db.commit()
            subnets = db.query(ApprovedSubnet).filter(ApprovedSubnet.is_active == True).all()
        return subnets

    @staticmethod
    def is_subnet_approved(db: Session, target_subnet: str) -> Tuple[bool, Optional[str]]:
        """
        Validates if target_subnet is contained within or equal to an approved network range.
        Prevents unauthorized scanning against external/out-of-scope networks.
        """
        try:
            target_net = ipaddress.ip_network(target_subnet.strip(), strict=False)
        except ValueError as e:
            return False, f"Invalid CIDR or IP format: {e}"

        approved = NetworkScannerService.get_approved_subnets(db)
        for app_sub in approved:
            try:
                approved_net = ipaddress.ip_network(app_sub.cidr.strip(), strict=False)
                # Check if target_net is a subnet or equal to approved_net
                if target_net.subnet_of(approved_net) or target_net == approved_net:
                    return True, None
            except ValueError:
                continue

        return False, f"Subnet '{target_subnet}' is outside authorized scanning scope. Network scanning is restricted to explicitly approved subnets."

    @staticmethod
    async def log_and_broadcast(job_id: str, message: str, level: str = "INFO", logs_list: Optional[List[Dict[str, Any]]] = None):
        entry = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "level": level,
            "source": "scanner",
            "job_id": job_id,
            "message": message
        }
        if logs_list is not None:
            logs_list.append(entry)
        
        # Broadcast real terminal output via WebSocket
        try:
            await ws_manager.broadcast({
                "type": "terminal_log",
                **entry
            })
        except Exception as e:
            logger.debug(f"Terminal broadcast error: {e}")

    @staticmethod
    def check_port(ip: str, port: int, timeout: float = 0.25) -> Optional[Dict[str, Any]]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            res = s.connect_ex((ip, port))
            if res == 0:
                service_name = "unknown"
                for p, name in COMMON_PORTS:
                    if p == port:
                        service_name = name
                        break
                return {
                    "port": port,
                    "protocol": "TCP",
                    "service": service_name,
                    "state": "open"
                }
        except Exception:
            pass
        finally:
            s.close()
        return None

    @staticmethod
    async def execute_scan(db: Session, target_subnet: str, initiated_by: str = "admin") -> ScanJob:
        target_subnet = target_subnet.strip()
        is_ok, err_msg = NetworkScannerService.is_subnet_approved(db, target_subnet)
        
        job_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
        job = ScanJob(
            id=job_id,
            subnet=target_subnet,
            initiated_by=initiated_by,
            status="running" if is_ok else "blocked",
            log_output=[]
        )
        db.add(job)
        db.commit()

        if not is_ok:
            await NetworkScannerService.log_and_broadcast(
                job_id,
                f"SECURITY REJECTION: Scan blocked for '{target_subnet}'. {err_msg}",
                level="ERROR",
                logs_list=job.log_output
            )
            job.status = "blocked"
            job.completed_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
            return job

        await NetworkScannerService.log_and_broadcast(
            job_id,
            f"Authorized scan started for approved scope '{target_subnet}' by user '{initiated_by}'.",
            level="INFO",
            logs_list=job.log_output
        )

        try:
            net = ipaddress.ip_network(target_subnet, strict=False)
            hosts_to_scan = []
            
            if net.num_addresses == 1:
                hosts_to_scan = [str(net.network_address)]
            else:
                # Limit scan batch to first 24 active hosts in subnet for responsive execution
                all_hosts = list(net.hosts())
                hosts_to_scan = [str(h) for h in all_hosts[:24]]

            await NetworkScannerService.log_and_broadcast(
                job_id,
                f"Target range validated: evaluating {len(hosts_to_scan)} potential host addresses...",
                level="INFO",
                logs_list=job.log_output
            )

            discovered_devices = []
            total_open_ports = 0

            # Scan hosts
            for ip in hosts_to_scan:
                # Check ports
                open_ports = []
                # Quick port check for selected common ports
                for port, s_name in COMMON_PORTS:
                    # Run socket check in thread pool so async loop isn't blocked
                    port_res = await asyncio.to_thread(NetworkScannerService.check_port, ip, port, 0.15)
                    if port_res:
                        open_ports.append(port_res)
                        total_open_ports += 1

                # If loopback or host has open ports or exists in database network events
                db_events_count = db.query(NetworkEvent).filter(
                    (NetworkEvent.source_ip == ip) | (NetworkEvent.destination_ip == ip)
                ).count()

                is_live = len(open_ports) > 0 or ip == "127.0.0.1" or db_events_count > 0

                if is_live:
                    hostname = None
                    try:
                        resolved = await asyncio.to_thread(socket.gethostbyaddr, ip)
                        hostname = resolved[0]
                    except Exception:
                        hostname = f"host-{ip.replace('.', '-')}.local"

                    # Identify suspicious indicators & risk level
                    suspicious = []
                    risk = "low"
                    
                    # Port based indicators
                    for p in open_ports:
                        if p["port"] in [23, 21]:
                            suspicious.append(f"Insecure legacy protocol open (Port {p['port']} {p['service']})")
                            risk = "medium"
                        elif p["port"] in [3389, 445]:
                            suspicious.append(f"Remote administration/SMB service exposed (Port {p['port']})")
                            risk = "medium"
                        elif p["port"] in [5432, 3306, 1433]:
                            suspicious.append(f"Database port reachable (Port {p['port']} {p['service']})")
                            risk = "medium"

                    # Correlate with alerts in database
                    associated_alerts = db.query(Alert).join(
                        NetworkEvent, Alert.event_id == NetworkEvent.id
                    ).filter(
                        (NetworkEvent.source_ip == ip) | (NetworkEvent.destination_ip == ip)
                    ).all()

                    if associated_alerts:
                        has_crit = any(a.severity == "critical" for a in associated_alerts)
                        has_high = any(a.severity == "high" for a in associated_alerts)
                        if has_crit:
                            risk = "critical"
                            suspicious.append(f"Associated with {len(associated_alerts)} NIDS alerts (Critical Severity)")
                        elif has_high:
                            risk = "high"
                            suspicious.append(f"Associated with {len(associated_alerts)} NIDS alerts (High Severity)")
                        else:
                            if risk == "low":
                                risk = "medium"
                            suspicious.append(f"Associated with {len(associated_alerts)} NIDS alerts")

                    # Deduplicate indicators
                    suspicious = list(dict.fromkeys(suspicious))

                    # Persist / update Device entity in DB
                    now = datetime.datetime.now(datetime.timezone.utc)
                    dev = db.query(Device).filter(Device.ip_address == ip).first()
                    if not dev:
                        dev = Device(
                            id=f"DEV-{ip.replace('.', '-')}",
                            ip_address=ip,
                            hostname=hostname,
                            status="online",
                            risk_level=risk,
                            open_ports=open_ports,
                            suspicious_indicators=suspicious,
                            first_seen=now,
                            last_seen=now,
                            scan_source="scanner"
                        )
                        db.add(dev)
                    else:
                        dev.hostname = hostname or dev.hostname
                        dev.status = "online"
                        dev.risk_level = risk
                        # Merge open ports
                        existing_ports = {p["port"]: p for p in (dev.open_ports or [])}
                        for p in open_ports:
                            existing_ports[p["port"]] = p
                        dev.open_ports = list(existing_ports.values())
                        dev.suspicious_indicators = list(dict.fromkeys((dev.suspicious_indicators or []) + suspicious))
                        dev.last_seen = now
                        dev.scan_source = "scanner"

                    db.commit()
                    discovered_devices.append(ip)

                    await NetworkScannerService.log_and_broadcast(
                        job_id,
                        f"Discovered host: {ip} ({hostname}) | Status: ONLINE | Risk: {risk.upper()} | Open Ports: {len(open_ports)}",
                        level="SUCCESS",
                        logs_list=job.log_output
                    )

            job.status = "completed"
            job.devices_found = len(discovered_devices)
            job.open_ports_found = total_open_ports
            job.completed_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()

            await NetworkScannerService.log_and_broadcast(
                job_id,
                f"Scan {job_id} completed successfully: {len(discovered_devices)} active devices identified, {total_open_ports} open ports verified.",
                level="SUCCESS",
                logs_list=job.log_output
            )
            return job

        except Exception as e:
            logger.error(f"Scan job {job_id} encountered error: {e}", exc_info=True)
            job.status = "failed"
            job.completed_at = datetime.datetime.now(datetime.timezone.utc)
            await NetworkScannerService.log_and_broadcast(
                job_id,
                f"Scan failure encountered: {str(e)}",
                level="ERROR",
                logs_list=job.log_output
            )
            db.commit()
            return job
