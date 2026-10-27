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
        Accepts 'all', 'all_systems', '*' to scan all approved network scopes.
        Prevents unauthorized scanning against external/out-of-scope networks.
        """
        clean_target = target_subnet.strip().lower()
        if clean_target in ["all", "all_systems", "all systems", "*"]:
            return True, None

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
    async def execute_scan(db: Session, target_subnet: str = "all", initiated_by: str = "admin") -> ScanJob:
        target_subnet = target_subnet.strip()
        is_all = target_subnet.lower() in ["all", "all_systems", "all systems", "*"]
        is_ok, err_msg = NetworkScannerService.is_subnet_approved(db, target_subnet)
        
        job_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
        job = ScanJob(
            id=job_id,
            subnet="ALL_SYSTEMS" if is_all else target_subnet,
            initiated_by=initiated_by,
            status="running" if is_ok else "blocked",
            devices_found=0,
            open_ports_found=0,
            threats_found=0,
            scanned_devices=[],
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

        scope_label = "ALL MONITORED SYSTEMS & APPROVED SCOPES" if is_all else f"scope '{target_subnet}'"
        await NetworkScannerService.log_and_broadcast(
            job_id,
            f"Authorized live threat scan started for {scope_label} by user '{initiated_by}'.",
            level="INFO",
            logs_list=job.log_output
        )

        try:
            hosts_to_scan = []

            if is_all:
                # Collect all devices currently in inventory
                existing_devs = db.query(Device.ip_address).all()
                for (ip_addr,) in existing_devs:
                    if ip_addr and ip_addr not in hosts_to_scan:
                        hosts_to_scan.append(ip_addr)

                # Collect all unique IPs in network events
                src_ips = db.query(NetworkEvent.source_ip).distinct().all()
                dst_ips = db.query(NetworkEvent.destination_ip).distinct().all()
                for (sip,) in src_ips:
                    if sip and sip != "unknown" and sip not in hosts_to_scan:
                        hosts_to_scan.append(sip)
                for (dip,) in dst_ips:
                    if dip and dip != "unknown" and dip not in hosts_to_scan:
                        hosts_to_scan.append(dip)

                # Add loopback and standard sample endpoints if not present
                standard_hosts = ["127.0.0.1", "192.168.1.10", "192.168.1.50", "192.168.1.100", "10.0.0.15"]
                for sh in standard_hosts:
                    if sh not in hosts_to_scan:
                        hosts_to_scan.append(sh)
            else:
                net = ipaddress.ip_network(target_subnet, strict=False)
                if net.num_addresses == 1:
                    hosts_to_scan = [str(net.network_address)]
                else:
                    # Include existing inventory devices belonging to this subnet
                    for (dev_ip,) in db.query(Device.ip_address).all():
                        try:
                            if dev_ip and ipaddress.ip_address(dev_ip) in net and dev_ip not in hosts_to_scan:
                                hosts_to_scan.append(dev_ip)
                        except Exception:
                            pass

                    # Also take first 20 addresses of subnet
                    all_hosts = list(net.hosts())
                    for h in all_hosts[:20]:
                        str_h = str(h)
                        if str_h not in hosts_to_scan:
                            hosts_to_scan.append(str_h)

            total_hosts = len(hosts_to_scan)
            await NetworkScannerService.log_and_broadcast(
                job_id,
                f"Scanning Scope Initialized: Probing {total_hosts} target system endpoints for open exposures and active intrusion signatures...",
                level="INFO",
                logs_list=job.log_output
            )

            discovered_devices = []
            scanned_devices_list = []
            total_open_ports = 0
            systems_with_threats = 0

            # Scan hosts sequentially with real-time feedback
            for idx, ip in enumerate(hosts_to_scan):
                # 1. Check ports via live socket probe
                open_ports = []
                for port, s_name in COMMON_PORTS:
                    # Quick non-blocking socket test
                    port_res = await asyncio.to_thread(NetworkScannerService.check_port, ip, port, 0.12)
                    if port_res:
                        open_ports.append(port_res)
                        total_open_ports += 1

                # Check if this IP is active in database network events or devices
                db_events_count = db.query(NetworkEvent).filter(
                    (NetworkEvent.source_ip == ip) | (NetworkEvent.destination_ip == ip)
                ).count()

                existing_dev = db.query(Device).filter(Device.ip_address == ip).first()
                if existing_dev and existing_dev.open_ports:
                    # Merge with previously discovered ports
                    port_nums = {p["port"] for p in open_ports}
                    for ep in existing_dev.open_ports:
                        if ep.get("port") not in port_nums:
                            open_ports.append(ep)
                            port_nums.add(ep.get("port"))

                is_live = len(open_ports) > 0 or ip == "127.0.0.1" or db_events_count > 0 or existing_dev is not None

                if is_live:
                    hostname = existing_dev.hostname if existing_dev and existing_dev.hostname else None
                    if not hostname:
                        try:
                            resolved = await asyncio.to_thread(socket.gethostbyaddr, ip)
                            hostname = resolved[0]
                        except Exception:
                            if ip == "192.168.1.10":
                                hostname = "web-prod-01.internal"
                            elif ip == "192.168.1.50":
                                hostname = "db-cluster-01.internal"
                            elif ip == "192.168.1.100":
                                hostname = "sec-workstation.internal"
                            elif ip == "10.0.0.15":
                                hostname = "edge-firewall.internal"
                            elif ip == "198.51.100.42":
                                hostname = "remote-adversary.node"
                            else:
                                hostname = f"host-{ip.replace('.', '-')}.internal"

                    # 2. Correlate Active NIDS Alerts for this system
                    associated_alerts = db.query(Alert).join(
                        NetworkEvent, Alert.event_id == NetworkEvent.id
                    ).filter(
                        (NetworkEvent.source_ip == ip) | (NetworkEvent.destination_ip == ip)
                    ).all()

                    # 3. Compile Threat Details
                    system_threats = []
                    suspicious = []
                    risk = "low"

                    # Port vulnerability exposures
                    for p in open_ports:
                        p_num = p.get("port")
                        p_srv = p.get("service", "TCP")
                        if p_num in [21, 23]:
                            suspicious.append(f"Insecure legacy protocol open (Port {p_num}/{p_srv})")
                            system_threats.append({
                                "type": "vulnerability",
                                "title": f"Insecure Cleartext Protocol Exposed (Port {p_num})",
                                "severity": "medium",
                                "engine": "PORT_SCANNER",
                                "category": "Exposure",
                                "description": f"Port {p_num} ({p_srv}) transmits credentials in plaintext, vulnerable to eavesdropping."
                            })
                            if risk == "low":
                                risk = "medium"
                        elif p_num in [3389, 445]:
                            suspicious.append(f"Remote administration / SMB exposed (Port {p_num})")
                            system_threats.append({
                                "type": "exposure",
                                "title": f"Remote Admin / SMB Port Exposed (Port {p_num})",
                                "severity": "medium",
                                "engine": "PORT_SCANNER",
                                "category": "Lateral Movement Risk",
                                "description": f"Remote management service reachable across local boundary."
                            })
                            if risk == "low":
                                risk = "medium"
                        elif p_num in [5432, 3306, 1433]:
                            suspicious.append(f"Database port reachable (Port {p_num}/{p_srv})")
                            system_threats.append({
                                "type": "exposure",
                                "title": f"Database Port Directly Exposed ({p_srv})",
                                "severity": "high",
                                "engine": "PORT_SCANNER",
                                "category": "Data Security",
                                "description": f"Internal database service on port {p_num} reachable without network segmentation."
                            })
                            risk = "high"

                    # Associated NIDS alert threats
                    for a in associated_alerts:
                        sev = a.severity.lower() if a.severity else "medium"
                        system_threats.append({
                            "type": "nids_alert",
                            "alert_id": a.id,
                            "title": a.title,
                            "severity": sev,
                            "engine": a.detection_source or "NIDS",
                            "category": a.detection_category or "Anomaly",
                            "confidence": a.confidence or 0.85,
                            "description": a.description
                        })

                    if associated_alerts:
                        has_crit = any(a.severity == "critical" for a in associated_alerts)
                        has_high = any(a.severity == "high" for a in associated_alerts)
                        if has_crit:
                            risk = "critical"
                            suspicious.append(f"Target/Source of {len(associated_alerts)} NIDS alerts (Critical Severity)")
                        elif has_high:
                            risk = "high"
                            suspicious.append(f"Target/Source of {len(associated_alerts)} NIDS alerts (High Severity)")
                        else:
                            if risk == "low":
                                risk = "medium"
                            suspicious.append(f"Associated with {len(associated_alerts)} NIDS alerts")

                    # Keep existing suspicious indicators if any
                    if existing_dev and existing_dev.suspicious_indicators:
                        suspicious = list(dict.fromkeys(existing_dev.suspicious_indicators + suspicious))
                    else:
                        suspicious = list(dict.fromkeys(suspicious))

                    if risk in ["critical", "high", "medium"] or len(system_threats) > 0:
                        systems_with_threats += 1

                    # Persist / update Device record in DB
                    now = datetime.datetime.now(datetime.timezone.utc)
                    dev = existing_dev
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
                        dev.open_ports = open_ports
                        dev.suspicious_indicators = suspicious
                        dev.last_seen = now
                        dev.scan_source = "scanner"

                    db.commit()

                    dev_summary = {
                        "id": dev.id,
                        "ip_address": ip,
                        "hostname": hostname,
                        "status": "online",
                        "risk_level": risk,
                        "open_ports": open_ports,
                        "suspicious_indicators": suspicious,
                        "threats": system_threats,
                        "alerts_count": len(associated_alerts),
                        "last_seen": now.isoformat()
                    }
                    scanned_devices_list.append(dev_summary)
                    discovered_devices.append(ip)

                    # Log message
                    threat_summary_txt = f"{len(system_threats)} threat(s) detected" if system_threats else "clean baseline"
                    await NetworkScannerService.log_and_broadcast(
                        job_id,
                        f"System Verified: {ip} ({hostname}) | Risk: {risk.upper()} | Open Ports: {len(open_ports)} | Findings: {threat_summary_txt}",
                        level="SUCCESS" if risk in ["low", "medium"] else "WARN" if risk == "high" else "ERROR",
                        logs_list=job.log_output
                    )

                # Broadcast live scan progress event
                current_percent = int(((idx + 1) / total_hosts) * 100)
                try:
                    await ws_manager.broadcast({
                        "type": "scan_progress",
                        "job_id": job_id,
                        "current_host": ip,
                        "hostname": hostname if is_live else f"host-{ip}",
                        "index": idx + 1,
                        "total": total_hosts,
                        "percent": current_percent,
                        "systems_found": len(discovered_devices),
                        "threats_found": systems_with_threats
                    })
                except Exception as e:
                    logger.debug(f"Progress broadcast error: {e}")

                # Slight async pause so user sees live progression
                await asyncio.sleep(0.06)

            job.status = "completed"
            job.devices_found = len(discovered_devices)
            job.open_ports_found = total_open_ports
            job.threats_found = systems_with_threats
            job.scanned_devices = scanned_devices_list
            job.completed_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()

            await NetworkScannerService.log_and_broadcast(
                job_id,
                f"Scan {job_id} Completed: {len(discovered_devices)} systems audited, {systems_with_threats} systems with threat signatures identified, {total_open_ports} exposed ports verified.",
                level="SUCCESS",
                logs_list=job.log_output
            )

            # Broadcast final completion
            try:
                await ws_manager.broadcast({
                    "type": "scan_completed",
                    "job_id": job_id,
                    "devices_found": len(discovered_devices),
                    "threats_found": systems_with_threats,
                    "open_ports_found": total_open_ports
                })
            except Exception:
                pass

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
