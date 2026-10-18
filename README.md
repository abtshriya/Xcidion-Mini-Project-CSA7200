# XCIDION — Explainable Network Intrusion Detection System

> *"From Raw Network Traffic to an Explainable Attack Story."*

XCIDION is a self-hosted, full-stack Network Intrusion Detection System (NIDS) that captures, analyses, correlates, and **explains** suspicious network activity. It is designed to answer the analyst's core questions: *what happened, why was it flagged, how confident are we, and what might come next?*

---

## Core Features

| Feature | Description |
|---|---|
| **Hybrid Detection** | Rule-based heuristics + Scikit-learn RandomForestClassifier with SHAP feature attributions |
| **Attack DNA** | NetworkX-driven incident correlation graph — connecting related events into a visual attack fingerprint |
| **Threat Trajectory** | MITRE ATT&CK kill-chain stage estimator with ranked next-stage probabilities and analyst feedback |
| **Real-time Updates** | Authenticated WebSocket push for live dashboard and alert feeds |
| **PCAP Analysis** | Offline PCAP file ingestion via TShark (when installed) |
| **Explainable Alerts** | Every ML detection includes SHAP waterfall contributions — no black boxes |
| **Role-based Access** | `admin`, `analyst`, `viewer` roles enforced server-side |
| **Zero paid dependencies** | Fully open-source stack, no cloud APIs, no remote AI |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 XCIDION Frontend                 │
│     React 18 + Vite + React-Router + Plotly.js   │
│                  Port 3000                       │
└──────────────────┬───────────────────────────────┘
                   │ REST /api/v1/*  │  WebSocket /ws/events
┌──────────────────▼───────────────────────────────┐
│                 FastAPI Backend                  │
│          Python 3.11+ · Uvicorn · Pydantic       │
│                  Port 8000                       │
│                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Hybrid     │  │ Attack DNA   │  │ Threat   │  │
│  │ Detection  │  │ (NetworkX)   │  │ Trajectory│  │
│  │ Engine     │  │ Correlation  │  │ (MITRE)  │  │
│  └────────────┘  └──────────────┘  └──────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │          Ingestion Pipeline                │  │
│  │  Suricata · Zeek · TShark · Demo Generator │  │
│  └────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────┘
                   │ SQLAlchemy ORM
┌──────────────────▼───────────────────────────────┐
│      PostgreSQL (primary) / SQLite (fallback)    │
└──────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React 18** + **Vite 5** + JSX
- **React Router v6** — client-side routing
- **Plotly.js** — interactive network graphs, SHAP waterfalls, analytics charts
- **Lucide React** — icon set
- **Native Fetch API** — no Axios dependency

### Backend
- **Python 3.11+** · **FastAPI** · **Uvicorn**
- **Pydantic v2** — request/response schema validation
- **SQLAlchemy 2** · **Alembic** — ORM + migrations
- **Scikit-learn** — RandomForestClassifier ML pipeline
- **SHAP** — `TreeExplainer` feature attribution
- **NetworkX** — Attack DNA incident graph correlation
- **bcrypt** — password hashing (rounds=12)
- **python-jose** — JWT authentication

### Database
- **PostgreSQL 16** (production) — auto-detected
- **SQLite** (development fallback) — used automatically when PostgreSQL is unreachable

---

## Quick Start — Local Development (Windows)

### Prerequisites

| Tool | Version | Download |
|---|---|---|
| Python | 3.11+ | https://python.org |
| Node.js | 20 LTS | https://nodejs.org |
| Git | Any | https://git-scm.com |
| PostgreSQL | 16 (optional) | https://postgresql.org |

> PostgreSQL is **optional** for local development. When not running, XCIDION automatically uses a local SQLite file (`xcidion_dev.db`).

### 1 · Clone the Repository

```powershell
git clone https://github.com/abtshriya/Xcidion-Mini-Project-CSA7200.git Xcidion
cd Xcidion
```

### 2 · Install Backend Dependencies

```powershell
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy alembic `
  pandas numpy scikit-learn shap networkx python-jose bcrypt python-multipart `
  httpx psycopg2-binary email-validator websockets pytest
```

### 3 · Configure Environment (Optional)

```powershell
copy .env.example .env
# Edit .env to set DATABASE_URL and SECRET_KEY for production
```

### 4 · Start the Backend

```powershell
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

On first run the backend will:
- Attempt to connect to PostgreSQL (falls back to SQLite automatically)
- Create all database tables
- Seed the three evaluation accounts (`admin`, `analyst`, `viewer`)
- Generate an initial demonstration attack campaign

### 5 · Install and Start the Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### 6 · Log In

| Username | Password | Role |
|---|---|---|
| `analyst` | `Analyst@Xcidion2026` | Full analyst access |
| `admin` | `Admin@Xcidion2026` | Administration + user management |
| `viewer` | `Viewer@Xcidion2026` | Read-only access |

---

## Quick Start — Containerised (Podman)

```powershell
podman-compose up -d
```

All three services (PostgreSQL, FastAPI, Vite) will start. Open **http://localhost:3000**.

---

## Running Tests

```powershell
python -m pytest backend/tests/test_xcidion_backend.py -v
```

Expected result: **9 tests passed**.

Covered areas:
- Backend health endpoint
- Feature extraction pipeline
- Rule engine (port scan, brute-force detection)
- ML pipeline with SHAP explanations
- Threat trajectory estimation
- Insufficient evidence handling
- JWT authentication
- Dashboard summary API
- Attack DNA correlation

---

## Network Monitoring Integration

XCIDION is designed to ingest events from real network monitoring tools. When the following binaries are available, the system uses them directly.

### Suricata

```bash
# Install Suricata and point to its eve.json output:
SURICATA_EVE_LOG=/var/log/suricata/eve.json
```

### Zeek

```bash
# Install Zeek and point to its log directory:
ZEEK_LOG_DIR=/opt/zeek/logs/current
```

### TShark (PCAP Analysis)

```bash
# Install Wireshark/TShark and use the PCAP Upload feature in the UI
# Windows:
choco install wireshark

# Ubuntu:
sudo apt install tshark
```

When these binaries are absent, XCIDION:
- Reports their **standby** status in the Sensors page
- Allows manual event import via the API
- Can generate controlled demonstration scenarios via the Header injector

---

## Project Structure

```
Xcidion/
├── backend/
│   ├── app/
│   │   ├── api/v1/            # FastAPI route handlers
│   │   ├── core/              # Config, security, JWT
│   │   ├── database/          # SQLAlchemy engine & session
│   │   ├── models/            # ORM entity definitions
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/
│   │   │   ├── correlation/   # Attack DNA (NetworkX)
│   │   │   ├── detection/     # Hybrid engine, ML, rules, features
│   │   │   ├── ingestion/     # Pipeline, demo generator, PCAP
│   │   │   └── trajectory/    # Threat trajectory estimator
│   │   ├── websocket/         # WebSocket connection manager
│   │   └── main.py            # FastAPI entrypoint
│   └── tests/
│       └── test_xcidion_backend.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/               # Fetch API client
│   │   ├── components/
│   │   │   ├── common/        # SeverityBadge, StatusBadge, EmptyState, Spinner
│   │   │   └── layout/        # Sidebar, Header, AppLayout
│   │   ├── context/           # AuthContext, WebSocketContext
│   │   ├── pages/             # 13 full-featured page components
│   │   └── styles/            # CSS design tokens (XCIDION dark neumorphism)
│   ├── index.html
│   └── vite.config.js
├── docs/                      # Architecture and operational documentation
├── configs/                   # Suricata / Zeek configuration templates
├── scripts/                   # Helper scripts
├── .env.example               # Environment configuration template
├── podman-compose.yml          # Container deployment configuration
└── README.md
```

---

## Security Notes

- All passwords are hashed with bcrypt (rounds=12)
- JWTs expire after 8 hours by default (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- All API endpoints except `/health` and `/api/v1/auth/login` require a valid JWT
- Role-based authorisation is enforced server-side — frontend role checks are display-only
- The `SECRET_KEY` in `.env.example` **must** be replaced before production deployment
- Database credentials are never exposed to the frontend

---

## Definition of Done

- [x] Frontend builds without errors (`npm run build`)
- [x] Backend starts and seeds data in < 10 seconds
- [x] Login with all three evaluation accounts works
- [x] Dashboard displays live data from the seeded campaign
- [x] Alerts contain real SHAP feature attributions
- [x] Attack DNA graph renders incident correlations
- [x] Threat Trajectory returns kill-chain stage estimates
- [x] WebSocket pushes events in real time
- [x] All 9 backend test cases pass
- [x] No hardcoded credentials in committed code
- [x] PostgreSQL → SQLite automatic fallback works

---

## Licence

This project is an academic coursework submission for the CSA7200 module.
