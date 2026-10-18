# XCIDION Architecture

## System Components

```
Frontend (React / Vite)
│
├── AuthContext         → JWT token lifecycle, role state
├── WebSocketContext    → Authenticated WS connection to /ws/events
├── API Client          → Fetch-based REST client (api/client.js)
│
├── Pages (13 total)
│   ├── LoginPage               → JWT auth form with evaluation quick-fill
│   ├── DashboardPage           → 6 stat cards, Plotly charts, Attack DNA widget
│   ├── LiveTrafficPage         → Paginated event table, PCAP upload, CSV export
│   ├── AlertsPage              → Filterable alert table, SHAP waterfall chart
│   ├── IncidentsPage           → Lifecycle actions, timeline, analyst notes
│   ├── AttackDNAPage           → Plotly network graph, evidence inspector
│   ├── ThreatTrajectoryPage    → Kill-chain pipeline, ranked candidates, feedback
│   ├── AnalyticsPage           → Top IPs, protocol breakdown, trend charts
│   ├── DetectionRulesPage      → Rule toggles, threshold viewer, safe test modal
│   ├── SensorsPage             → Sensor status, heartbeat, registration modal
│   ├── DatasetsModelsPage      → Dataset registry, model metrics, training trigger
│   ├── AuditLogsPage           → Searchable audit trail
│   └── SettingsPage            → Profile, password change, admin user creation
│
└── Layout
    ├── Sidebar        → 12 nav links, collapsed state, WS status indicator
    ├── Header         → Demo scenario injector, search bar
    └── AppLayout      → Outlet wrapper, refreshKey context propagation

Backend (FastAPI / Uvicorn)
│
├── API Routers (/api/v1/*)
│   ├── auth          → login (OAuth2 form), logout, /me, change-password
│   ├── dashboard     → summary, traffic, threats, recent-events, system-health
│   ├── events        → CRUD, statistics, PCAP import, demo-generate
│   ├── alerts        → CRUD, status updates, related-events
│   ├── incidents     → CRUD, timeline, notes, Attack DNA, status transitions
│   ├── trajectory    → list, get-by-incident, feedback
│   ├── sensors       → CRUD, health check
│   ├── rules         → list, toggle, threshold update, safe test
│   ├── models        → list, train, activate
│   ├── analytics     → overview statistics
│   ├── audit         → filterable audit log
│   └── admin         → user management (admin-only)
│
├── Services
│   ├── Detection
│   │   ├── feature_extraction.py  → 12-dim numerical flow feature vector
│   │   ├── rule_engine.py         → Heuristic rules: port scan, brute-force,
│   │   │                            SYN flood, data exfil, DNS tunnel
│   │   ├── ml_engine.py           → RandomForestClassifier + shap.TreeExplainer
│   │   └── hybrid_engine.py       → Orchestrates Suricata, Zeek, ML, rules
│   │
│   ├── Correlation
│   │   └── attack_dna.py          → NetworkX incident graph builder
│   │
│   ├── Trajectory
│   │   └── threat_trajectory.py   → MITRE ATT&CK stage estimator
│   │
│   └── Ingestion
│       ├── pipeline.py            → Event normalise → deduplicate → detect → persist
│       ├── demo_generator.py      → Controlled scenario generator + DB seeder
│       └── pcap_processor.py      → TShark-based PCAP offline analyser
│
├── Security
│   ├── security.py   → bcrypt hashing (rounds=12), JWT creation/verification
│   └── config.py     → SettingsConfigDict-based environment configuration
│
├── Database
│   ├── session.py    → PostgreSQL connection with automatic SQLite fallback
│   └── entities.py   → ORM models: User, Sensor, NetworkEvent, Alert,
│                        Incident, IncidentAlert, IncidentNote, DetectionRule,
│                        MLModel, ThreatPrediction, AuditLog, SystemEvent
│
└── WebSocket
    └── manager.py    → Authenticated connection manager, broadcast to all clients
```

## Detection Engine Data Flow

```
NetworkEvent (raw)
        │
        ▼
feature_extraction.py
  ─ duration, bytes, packets, ports, protocol
  ─ derived: bytes/sec, pkts/sec, conn_frequency_window, dst_port_diversity
        │
        ▼
hybrid_engine.py
  ┌─────┴──────────────────────────┐
  │                                │
rule_engine.py            ml_engine.py
  ─ RULE-PORT-SCAN         ─ RandomForestClassifier
  ─ RULE-BRUTE-FORCE       ─ shap.TreeExplainer
  ─ RULE-SYN-FLOOD         ─ feature attributions
  ─ RULE-DATA-EXFIL        ─ top_features with impact
  ─ RULE-DNS-TUNNEL
  │                                │
  └──────────────┬─────────────────┘
                 │
                 ▼
           Alert records
                 │
                 ▼
        attack_dna.py (NetworkX)
          ─ Entity nodes: adversaries, targets, alerts
          ─ Directed edges: correlation reasons + confidence
          ─ Incident graph
                 │
                 ▼
      threat_trajectory.py (MITRE ATT&CK)
          ─ Stage estimation from event sequence
          ─ Ranked next-stage candidates
          ─ Insufficient evidence guard
                 │
                 ▼
        WebSocket broadcast → Frontend
```

## Attack DNA Correlation Rules

A correlation edge is created when two alerts share:
- Same source IP (adversary node)
- Same destination IP (target node)
- Consecutive timestamps within 5 minutes
- Same detection category chain
- Sequential attack stages (e.g. Reconnaissance → Exploitation)

Each edge records: relationship type, evidence description, confidence score.

## Threat Trajectory Kill-Chain Stages

```
Stage 0: Reconnaissance
Stage 1: Weaponisation
Stage 2: Delivery
Stage 3: Exploitation
Stage 4: Installation / Persistence
Stage 5: Command & Control
Stage 6: Actions on Objectives / Exfiltration
```

Confidence is calculated from:
- Number of supporting alert categories
- Kill-chain depth progression
- Temporal clustering of events

## Authentication & Authorisation

- Login returns a signed JWT (HS256)
- All protected endpoints validate the JWT and extract role claims
- Role enforcement is server-side only (frontend role checks are display hints)
- Passwords are bcrypt-hashed at rounds=12 with 72-byte truncation

## Roles

| Role | Capabilities |
|---|---|
| `viewer` | Read dashboards, alerts, events, incidents, trajectories |
| `analyst` | All viewer permissions + update alerts, add incident notes, submit trajectory feedback |
| `admin` | All analyst permissions + user management, system configuration |
