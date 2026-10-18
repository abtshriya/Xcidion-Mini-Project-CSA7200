# XCIDION Setup Guide

## Prerequisites

### Minimum Requirements

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Backend runtime |
| Node.js | 20 LTS | Frontend build toolchain |
| Git | Any | Version control |

### Optional (Enhances real network monitoring)

| Tool | Version | Purpose |
|---|---|---|
| PostgreSQL | 16 | Production-grade persistence |
| Suricata | 7.x | IDS rule-based alerting |
| Zeek | 6.x | Network flow analysis |
| Wireshark / TShark | 4.x | PCAP file analysis |
| Podman + podman-compose | Latest | Container deployment |

---

## Local Development Setup (Windows)

### 1. Clone

```powershell
git clone https://github.com/abtshriya/Xcidion-Mini-Project-CSA7200.git Xcidion
cd Xcidion
```

### 2. Backend — Python Dependencies

```powershell
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings ^
  sqlalchemy alembic pandas numpy scikit-learn shap networkx ^
  python-jose bcrypt python-multipart httpx psycopg2-binary ^
  email-validator websockets pytest
```

### 3. Environment Configuration (Optional)

```powershell
copy .env.example .env
# Edit .env:
#   DATABASE_URL = postgresql://xcidion:pass@localhost:5432/xcidion_db
#   SECRET_KEY   = <64-char hex string>
```

If `.env` is not created, the application defaults to:
- SQLite database: `xcidion_dev.db` in the project root
- Development secret key (insecure — change for production)

### 4. Start Backend

```powershell
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:
```
Falling back to local SQLite database...   (if PostgreSQL not running)
Initializing XCIDION database schema...
Fresh installation detected: seeding initial demonstration campaign...
XCIDION backend engine started successfully.
Uvicorn running on http://0.0.0.0:8000
```

### 5. Frontend — Install and Start

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

### 6. Evaluate

| URL | Description |
|---|---|
| http://localhost:3000 | Full XCIDION application |
| http://localhost:8000/docs | FastAPI Swagger UI |
| http://localhost:8000/redoc | FastAPI ReDoc |
| http://localhost:8000/health | Backend health check |

### Evaluation Credentials

| Username | Password | Role |
|---|---|---|
| `analyst` | `Analyst@Xcidion2026` | Analyst |
| `admin` | `Admin@Xcidion2026` | Administrator |
| `viewer` | `Viewer@Xcidion2026` | Read-only viewer |

---

## Container Deployment (Podman)

```powershell
# Install podman-compose
pip install podman-compose

# Start all services
podman-compose up -d

# View backend logs
podman-compose logs -f xcidion-backend

# Stop all services
podman-compose down
```

---

## Linux / Ubuntu Setup

### System Packages

```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip nodejs npm git
```

### Optional: Suricata

```bash
sudo apt install suricata
# Edit /etc/suricata/suricata.yaml:
#   outputs:
#     - eve-log:
#         enabled: yes
#         filename: /var/log/suricata/eve.json
```

Set in `.env`:
```
SURICATA_EVE_LOG=/var/log/suricata/eve.json
```

### Optional: Zeek

```bash
sudo apt install zeek
# Configure Zeek to log to /opt/zeek/logs/current/
```

Set in `.env`:
```
ZEEK_LOG_DIR=/opt/zeek/logs/current
```

### Optional: TShark

```bash
sudo apt install tshark
# Allow non-root capture:
sudo usermod -aG wireshark $USER
```

Then use the **PCAP Upload** feature in the Live Traffic page.

---

## Running Tests

```powershell
# From project root
python -m pytest backend/tests/test_xcidion_backend.py -v
```

Expected: **9 passed**

---

## Generating Demo Attack Campaigns

From the **Header** in the app, click "Demo: Inject Attack Scenario" and choose:

| Scenario | Description |
|---|---|
| `normal` | Benign baseline traffic |
| `port_scan` | TCP SYN scan from a single adversary |
| `brute_force` | Repeated authentication failures |
| `data_exfil` | Large outbound data transfer patterns |
| `complete_campaign` | Full APT-style kill-chain campaign |

All demo events are clearly labelled with `source_reference: DEMO-SYNTHETIC` and are distinguishable from real captured traffic.

---

## Directory Prerequisite Notes

XCIDION creates these directories automatically on startup:

```
data/
  pcaps/      → PCAP upload storage
  uploads/    → General file uploads
  zeek/       → Zeek log input
  suricata/   → Suricata EVE log input
models/       → Trained ML model persistence (joblib)
```

---

## Production Hardening Checklist

- [ ] Replace `SECRET_KEY` in `.env` with a cryptographically random 64-char hex value
- [ ] Use a dedicated PostgreSQL user with minimal permissions
- [ ] Restrict `CORS_ORIGINS` to your actual frontend domain
- [ ] Run behind a reverse proxy (nginx / caddy) with TLS
- [ ] Set `DEBUG=False` in `.env`
- [ ] Enable PostgreSQL SSL: `DATABASE_URL=postgresql+psycopg2://...?sslmode=require`
- [ ] Rotate JWT secrets periodically
- [ ] Monitor audit logs regularly
