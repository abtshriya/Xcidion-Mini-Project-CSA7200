import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  Activity, ShieldAlert, AlertTriangle, Radio, Server,
  TrendingUp, Dna, ArrowRight, RefreshCw, CheckCircle2, Clock,
  Terminal, Network, Sliders, BarChart3, Settings, ExternalLink,
  ShieldCheck, Lock, Sparkles, Filter, ChevronRight, Eye, X
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { LiveTerminal } from '../components/terminal/LiveTerminal';
import { AuthorizedScanner } from '../components/scanner/AuthorizedScanner';
import { DeviceInvestigationModal } from '../components/investigation/DeviceInvestigationModal';

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isAnalyst = user?.role === 'analyst';
  const { status: wsStatus } = useWebSocket();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'terminal', 'scanner', 'alerts', 'trajectory', 'analytics', 'settings'
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [threats, setThreats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [rules, setRules] = useState([]);
  const [investigatingIp, setInvestigatingIp] = useState(null);

  // Selected Alert for Explainability
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, trafRes, threatRes, devRes, alertRes, sensorRes, ruleRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTraffic(),
        api.getDashboardThreats(),
        api.getDevices(),
        api.getAlerts({ limit: 25 }),
        api.getSensors(),
        api.getRules()
      ]);

      setSummary(sumRes);
      setTraffic(trafRes);
      setThreats(threatRes);
      setDevices(devRes || []);
      setAlerts(alertRes || []);
      setSensors(sensorRes || []);
      setRules(ruleRes || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRuleToggle = async (ruleId, currentEnabled) => {
    if (!isAdmin) {
      alert('Permission denied: Only administrators can modify detection rules.');
      return;
    }
    try {
      await api.toggleRule(ruleId, !currentEnabled);
      setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r));
    } catch (err) {
      alert('Failed to update detection rule: ' + err.message);
    }
  };

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <LoadingSpinner message="Loading XCIDION Unified Operations Dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Operations Header */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              XCIDION Unified Admin & Analyst Dashboard
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: isAdmin ? 'rgba(114, 110, 255, 0.2)' : 'rgba(89, 255, 231, 0.15)',
                color: isAdmin ? 'var(--xc-violet)' : 'var(--xc-aqua)',
                border: `1px solid ${isAdmin ? 'var(--xc-violet)' : 'var(--xc-aqua)'}`,
                padding: '3px 10px'
              }}
            >
              {isAdmin ? 'ADMINISTRATOR MODE' : 'SECURITY ANALYST MODE'}
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: wsStatus === 'connected' ? 'rgba(8, 198, 172, 0.15)' : 'rgba(245, 196, 81, 0.15)',
                color: wsStatus === 'connected' ? 'var(--xc-teal)' : '#F5C451',
                border: `1px solid ${wsStatus === 'connected' ? 'rgba(8, 198, 172, 0.3)' : 'rgba(245, 196, 81, 0.3)'}`
              }}
            >
              ● {wsStatus === 'connected' ? 'TELEMETRY ONLINE' : 'DISCONNECTED'}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isAdmin
              ? 'Full administrative control: Authorized network scanning, rule management, and intrusion investigation.'
              : 'Analyst operations: Device investigations, alert triage, Attack DNA correlation, and threat trajectory analysis.'}
          </p>
        </div>

        <button onClick={fetchData} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Main Tab Navigation */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '6px',
          gap: '6px',
          backgroundColor: 'rgba(10, 15, 23, 0.7)'
        }}
      >
        {[
          { id: 'overview', label: 'Overview & Inventory', icon: Activity },
          { id: 'terminal', label: 'Live Monitoring Terminal', icon: Terminal },
          { id: 'scanner', label: 'Authorised Network Scanner', icon: Network },
          { id: 'alerts', label: 'Alerts & Incidents', icon: AlertTriangle, count: alerts.length },
          { id: 'trajectory', label: 'Attack DNA & Threat Trajectory', icon: Dna },
          { id: 'analytics', label: 'Telemetry Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Rules & Sensors', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '6px',
                border: isActive ? '1px solid var(--glass-border-focus)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(114, 110, 255, 0.18)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'var(--transition)',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={15} color={isActive ? 'var(--xc-aqua)' : 'currentColor'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(89, 255, 231, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? 'var(--xc-aqua)' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & INVENTORY */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Monitored Devices
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--xc-aqua)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {devices.length}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--xc-teal)' }}>
                Active Host Assets
              </span>
            </div>

            <div className="glass-card">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Online Sensors
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--xc-teal)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {summary?.active_sensors || 3} / 3
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Zeek, Suricata, Synthetic
              </span>
            </div>

            <div className="glass-card">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Active Alerts
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: summary?.active_alerts > 0 ? '#FF8A4C' : 'var(--xc-teal)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {summary?.active_alerts || 0}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Rule & ML Classifications
              </span>
            </div>

            <div className="glass-card">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Processed Flows
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--xc-violet)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {summary?.total_events || 0}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Raw Ingested Events
              </span>
            </div>
          </div>

          {/* Device Assets Table with 1-Click Investigation */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Monitored Network Assets ({devices.length})
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                  Click "Investigate" on any device to open its details, associated alerts, Attack DNA timeline, and Threat Trajectory.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('scanner')}
                className="btn-secondary"
                style={{ fontSize: '0.78rem' }}
              >
                <span>Run Network Scan</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Hostname</th>
                    <th>Status</th>
                    <th>Open Ports</th>
                    <th>Suspicious Indicators</th>
                    <th>Risk Rating</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev) => (
                    <tr key={dev.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--xc-aqua)' }}>
                        {dev.ip_address}
                      </td>
                      <td style={{ color: 'var(--text-primary)' }}>{dev.hostname || 'unknown'}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', color: 'var(--xc-teal)' }}>
                          ● {dev.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(dev.open_ports || []).slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.70rem',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: 'rgba(114, 110, 255, 0.12)',
                                color: 'var(--xc-violet)',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              {p.port}
                            </span>
                          ))}
                          {(dev.open_ports || []).length > 3 && (
                            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                              +{dev.open_ports.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: dev.suspicious_indicators?.length ? '#F5C451' : 'var(--text-muted)' }}>
                          {dev.suspicious_indicators?.[0] || 'Clean Baseline'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: dev.risk_level === 'critical' ? 'rgba(255, 77, 103, 0.2)' : (dev.risk_level === 'high' ? 'rgba(255, 138, 76, 0.2)' : 'rgba(8, 198, 172, 0.2)'),
                            color: dev.risk_level === 'critical' ? '#FF4D67' : (dev.risk_level === 'high' ? '#FF8A4C' : 'var(--xc-teal)'),
                            border: `1px solid ${dev.risk_level === 'critical' ? '#FF4D67' : (dev.risk_level === 'high' ? '#FF8A4C' : 'var(--xc-teal)')}`
                          }}
                        >
                          {dev.risk_level?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setInvestigatingIp(dev.ip_address)}
                          className="btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            color: 'var(--xc-aqua)',
                            borderColor: 'rgba(89, 255, 231, 0.3)'
                          }}
                        >
                          <ExternalLink size={12} />
                          <span>Investigate</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MONITORING TERMINAL */}
      {activeTab === 'terminal' && (
        <div>
          <LiveTerminal onDeviceSelected={(ip) => setInvestigatingIp(ip)} />
        </div>
      )}

      {/* TAB 3: AUTHORISED NETWORK SCANNER */}
      {activeTab === 'scanner' && (
        <div>
          <AuthorizedScanner onInvestigateDevice={(ip) => setInvestigatingIp(ip)} />
        </div>
      )}

      {/* TAB 4: ALERTS & INCIDENTS */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
              Detected Security Alerts ({alerts.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Alert Title</th>
                    <th>Category</th>
                    <th>Detection Engine</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Explainability</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((al) => (
                    <tr key={al.id}>
                      <td><SeverityBadge severity={al.severity} /></td>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{al.title}</td>
                      <td>{al.detection_category}</td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontSize: '0.74rem', color: 'var(--xc-violet)' }}>
                          {al.detection_source}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{(al.confidence * 100).toFixed(0)}%</td>
                      <td>{al.status}</td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{al.created_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedAlert(al)}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--xc-aqua)' }}
                        >
                          <Eye size={12} />
                          <span>Explain</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ATTACK DNA & THREAT TRAJECTORY */}
      {activeTab === 'trajectory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
              Attack DNA Correlation & Threat Progression Model
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Correlates multi-source network alerts using NetworkX graph clustering and computes probabilistic threat trajectory transitions based on the MITRE ATT&CK matrix.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="glass-card">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  CORRELATION METHODOLOGY
                </span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--xc-aqua)', marginTop: '8px' }}>
                  NetworkX Graph Clustering
                </h4>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  Edges represent validated relationships: Shared Source IP, Target Host Pair, Temporal Proximity (within 3600s), and Lateral Movement pivots.
                </p>
              </div>

              <div className="glass-card">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  TRAJECTORY PREDICTION ENGINE
                </span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--xc-violet)', marginTop: '8px' }}>
                  Markov Transition Priors
                </h4>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  Maps observed events to MITRE stages (Reconnaissance ➔ Initial Access ➔ Credential Access ➔ Lateral Movement ➔ Exfiltration) and forecasts next attacker actions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TELEMETRY ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Telemetry Analytics & Flow Distribution
            </h3>
            {traffic && traffic.timestamps ? (
              <Plot
                data={[
                  {
                    x: traffic.timestamps,
                    y: traffic.event_counts,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Flow Volume',
                    line: { color: '#726EFF', width: 2 },
                    marker: { color: '#59FFE7', size: 6 }
                  }
                ]}
                layout={{
                  autosize: true,
                  height: 320,
                  margin: { l: 40, r: 20, t: 10, b: 40 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: '#C5CED8' },
                  xaxis: { gridcolor: 'rgba(255, 255, 255, 0.05)' },
                  yaxis: { gridcolor: 'rgba(255, 255, 255, 0.05)' }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%' }}
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No flow metrics recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: SETTINGS & SENSORS */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sensors Status */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
              Registered Network Sensors ({sensors.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {sensors.map((s) => (
                <div key={s.id} className="glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: s.status === 'online' ? 'var(--xc-teal)' : '#FF4D67' }}>
                      ● {s.status?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Type: <strong style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{s.source_type}</strong> | Host: {s.hostname}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detection Rules */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Detection Rules Configuration ({rules.length})
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                  {isAdmin ? 'Enable or disable intrusion detection signatures.' : 'Read-only rule policies (Administrator required to modify).'}
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>State</th>
                    <th style={{ textAlign: 'right' }}>Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--xc-violet)' }}>{r.id}</td>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{r.name}</td>
                      <td>{r.category}</td>
                      <td><SeverityBadge severity={r.severity} /></td>
                      <td>
                        <span style={{ color: r.enabled ? 'var(--xc-teal)' : 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {r.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleRuleToggle(r.id, r.enabled)}
                          disabled={!isAdmin}
                          className="btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            opacity: isAdmin ? 1 : 0.5,
                            cursor: isAdmin ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {r.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Device Deep Investigation Modal */}
      {investigatingIp && (
        <DeviceInvestigationModal
          ipAddress={investigatingIp}
          onClose={() => setInvestigatingIp(null)}
        />
      )}

      {/* Alert Explainability Modal */}
      {selectedAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 12, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--xc-aqua)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Detection Explainability
                </h3>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {selectedAlert.description}
            </p>

            <div style={{ backgroundColor: 'rgba(8, 12, 18, 0.7)', padding: '14px', borderRadius: '6px', fontSize: '0.80rem', fontFamily: 'var(--font-mono)' }}>
              <div style={{ color: 'var(--xc-aqua)', marginBottom: '8px' }}>
                Engine: {selectedAlert.detection_source?.toUpperCase()} | Category: {selectedAlert.detection_category}
              </div>
              <pre style={{ color: '#C5CED8', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedAlert.evidence || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
