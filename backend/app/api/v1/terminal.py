import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.core.security import get_current_user
from backend.app.models.entities import User, Sensor, Alert, Device, ScanJob
from backend.app.schemas.schemas import TerminalCommandRequest, TerminalCommandResponse
from backend.app.services.scanner.network_scanner import NetworkScannerService

router = APIRouter(prefix="/terminal", tags=["terminal"])

@router.post("/execute", response_model=TerminalCommandResponse)
async def execute_terminal_command(
    payload: TerminalCommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_cmd = payload.command.strip()
    parts = raw_cmd.split()
    cmd = parts[0].lower() if parts else ""
    args = parts[1:] if len(parts) > 1 else []

    output_lines = []
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M:%S")

    def log(text: str, type_: str = "info"):
        output_lines.append({"text": text, "type": type_})

    if not cmd:
        return TerminalCommandResponse(
            command=raw_cmd,
            output_lines=[],
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )

    log(f"[{now_str}] $ {raw_cmd}", "command")

    if cmd == "help":
        log("XCIDION Interactive Terminal Console - Command Reference:", "info")
        log("  status               - Displays real-time engine, sensor, and threat telemetry", "info")
        log("  sensors              - Inspects operational status of Zeek, Suricata, and Synthetic probes", "info")
        log("  devices              - Enumerates discovered host inventory and risk classifications", "info")
        log("  alerts --latest      - Fetches most recent 5 security alerts with severity attributions", "info")
        log("  scan <subnet>        - Triggers authorized scan against approved subnet (Admin required)", "info")
        log("  subnets              - Lists approved scanning CIDR network boundaries", "info")
        log("  whoami               - Displays current authenticated user and permission scope", "info")
        log("  clear                - Clears the terminal screen buffer", "info")

    elif cmd == "status":
        sensor_count = db.query(Sensor).filter(Sensor.status == "online").count()
        total_sensors = db.query(Sensor).count()
        alert_count = db.query(Alert).filter(Alert.status.in_(["new", "investigating"])).count()
        dev_count = db.query(Device).count()
        crit_count = db.query(Alert).filter(Alert.severity == "critical").count()

        log("--- SYSTEM POSTURE & ENGINE STATUS ---", "success")
        log(f"  Service: XCIDION Explainable NIDS Engine v1.0.0", "info")
        log(f"  Sensors Online: {sensor_count}/{total_sensors}", "info" if sensor_count == total_sensors else "warn")
        log(f"  Monitored Device Assets: {dev_count}", "info")
        log(f"  Active Unresolved Alerts: {alert_count} (Critical: {crit_count})", "warn" if crit_count > 0 else "info")
        log(f"  Database Engine: Connected | WebSocket Pipeline: Active", "success")

    elif cmd == "sensors":
        sensors = db.query(Sensor).all()
        log(f"--- REGISTERED SENSORS ({len(sensors)}) ---", "info")
        for s in sensors:
            status_type = "success" if s.status == "online" else "error"
            hb_str = s.last_heartbeat_at.strftime("%Y-%m-%d %H:%M:%S") if s.last_heartbeat_at else "N/A"
            log(f"  [{s.id}] {s.name} ({s.source_type.upper()}) | Status: {s.status.upper()} | Last HB: {hb_str}", status_type)

    elif cmd == "devices":
        devices = db.query(Device).order_by(Device.last_seen.desc()).limit(15).all()
        log(f"--- DISCOVERED NETWORK INVENTORY ({len(devices)}) ---", "info")
        for d in devices:
            ports_str = f"{len(d.open_ports or [])} open ports"
            risk_type = "error" if d.risk_level in ["critical", "high"] else ("warn" if d.risk_level == "medium" else "info")
            log(f"  {d.ip_address:<16} | Host: {d.hostname or 'unknown':<24} | Risk: {d.risk_level.upper():<8} | {ports_str}", risk_type)

    elif cmd == "alerts":
        alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(5).all()
        log(f"--- LATEST DETECTED SECURITY ALERTS ({len(alerts)}) ---", "warn" if alerts else "info")
        if not alerts:
            log("  No active alerts recorded in database.", "info")
        else:
            for a in alerts:
                sev_type = "error" if a.severity in ["critical", "high"] else "warn"
                log(f"  [{a.severity.upper()}] {a.title} ({a.detection_category}) | Source: {a.detection_source}", sev_type)

    elif cmd == "subnets":
        approved = NetworkScannerService.get_approved_subnets(db)
        log("--- AUTHORIZED SCANNING SCOPES ---", "info")
        for sub in approved:
            log(f"  CIDR: {sub.cidr:<18} | Scope: {sub.label} ({sub.description or ''})", "info")

    elif cmd == "whoami":
        log(f"Authenticated User: {current_user.username}", "info")
        log(f"Email: {current_user.email}", "info")
        log(f"Assigned Role: {current_user.role.upper()}", "success")
        log(f"Administrative Scan Permission: {'GRANTED' if current_user.role == 'admin' else 'RESTRICTED'}", "success" if current_user.role == "admin" else "warn")

    elif cmd == "scan":
        if not args:
            log("Error: Target subnet or IP address required. Example: scan 192.168.1.0/24 or scan 127.0.0.1/32", "error")
        elif current_user.role != "admin":
            log("Permission Denied: Only users with 'admin' role are authorized to initiate network scans.", "error")
        else:
            target = args[0]
            log(f"Initiating scan job on '{target}'...", "info")
            job = await NetworkScannerService.execute_scan(db, target, current_user.username)
            if job.status == "blocked":
                log(f"Scan blocked: Subnet '{target}' is not in approved scanning scope.", "error")
            elif job.status == "completed":
                log(f"Scan completed: Discovered {job.devices_found} devices and {job.open_ports_found} open ports.", "success")
            else:
                log(f"Scan finished with status: {job.status}", "info")

    elif cmd == "clear":
        log("Terminal buffer reset requested.", "info")

    else:
        log(f"Command not recognized: '{cmd}'. Type 'help' for available operational commands.", "error")

    return TerminalCommandResponse(
        command=raw_cmd,
        output_lines=output_lines,
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )
