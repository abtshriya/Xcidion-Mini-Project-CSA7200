import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Plot from 'react-plotly.js';
import {
  Activity, ShieldAlert, AlertTriangle, Radio, Server,
  TrendingUp, Dna, ArrowRight, RefreshCw, CheckCircle2, Clock,
  Terminal, Network, Sliders, BarChart3, Settings, ExternalLink,
  ShieldCheck, Lock, Sparkles, Filter, ChevronRight, Eye, X, Search,
  Download, Plus, Play, ThumbsUp, ThumbsDown, HelpCircle, Trash2, Cpu
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { LiveTerminal } from '../components/terminal/LiveTerminal';
import { AuthorizedScanner } from '../components/scanner/AuthorizedScanner';
import { DeviceInvestigationModal } from '../components/investigation/DeviceInvestigationModal';
import { CircularLogo } from '../components/common/CircularLogo';

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'analyst';
  const { status: wsStatus } = useWebSocket();
  const { refreshKey } = useOutletContext() || {};

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'terminal', 'scanner', 'alerts', 'trajectory', 'analytics', 'settings'
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [threats, setThreats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [rules, setRules] = useState([]);
  const [trajectories, setTrajectories] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [trajectoryFeedbackStatus, setTrajectoryFeedbackStatus] = useState({});
  const [investigatingIp, setInvestigatingIp] = useState(null);
  const [directIpInput, setDirectIpInput] = useState('');

  // Alert Triage Filter States
  const [alertFilterSeverity, setAlertFilterSeverity] = useState('all');
  const [alertFilterStatus, setAlertFilterStatus] = useState('all');
  const [alertSearchTerm, setAlertSearchTerm] = useState('');

  // Selected Alert for Deep Triage & Explainability Modal
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Settings & Rules management states
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [newRuleId, setNewRuleId] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('Reconnaissance');
  const [newRuleSeverity, setNewRuleSeverity] = useState('medium');
  const [newRulePort, setNewRulePort] = useState('22');
  const [testingRule, setTestingRule] = useState(null);
  const [testPayloadStr, setTestPayloadStr] = useState('{\n  "source_ip": "10.0.0.99",\n  "destination_ip": "192.168.1.100",\n  "destination_port": 22,\n  "protocol": "TCP",\n  "event_type": "ssh_login_failure"\n}');
  const [ruleTestResult, setRuleTestResult] = useState(null);
  const [isTestingRule, setIsTestingRule] = useState(false);
  const [inspectingSensorHealth, setInspectingSensorHealth] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, trafRes, threatRes, devRes, alertRes, sensorRes, ruleRes, trajRes, incRes, analyticsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTraffic(),
        api.getDashboardThreats(),
        api.getDevices(),
        api.getAlerts({ limit: 50 }),
        api.getSensors(),
        api.getRules(),
        api.getTrajectories().catch(() => []),
        api.getIncidents().catch(() => []),
        api.getAnalyticsOverview().catch(() => null)
      ]);

      setSummary(sumRes);
      setTraffic(trafRes);
      setThreats(threatRes);
      setDevices(devRes || []);
      setAlerts(alertRes || []);
      setSensors(sensorRes || []);
      setRules(ruleRes || []);
      setTrajectories(trajRes || []);
      setIncidents(incRes || []);
      setAnalyticsOverview(analyticsRes);
      if (trajRes?.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(trajRes[0].incident_id);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleRuleToggle = async (ruleId, currentEnabled) => {
    try {
      await api.updateRule(ruleId, { enabled: !currentEnabled });
      setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r));
    } catch (err) {
      alert('Failed to update detection rule: ' + err.message);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!newRuleId.trim() || !newRuleName.trim()) return;
    try {
      await api.createRule({
        id: newRuleId.trim().toUpperCase(),
        name: newRuleName.trim(),
        description: newRuleDesc.trim() || undefined,
        category: newRuleCategory,
        severity: newRuleSeverity,
        configuration: {
          target_port: parseInt(newRulePort, 10) || 22,
          threshold: 5,
          window_seconds: 60
        },
        enabled: true,
        version: '1.0.0'
      });
      setShowCreateRuleModal(false);
      setNewRuleId('');
      setNewRuleName('');
      setNewRuleDesc('');
      const rRes = await api.getRules();
      setRules(rRes || []);
    } catch (err) {
      alert('Failed to create detection rule: ' + err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm(`Are you sure you want to delete detection rule ${ruleId}?`)) return;
    try {
      await api.deleteRule(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (err) {
      alert('Failed to delete rule: ' + err.message);
    }
  };

  const handleExecuteRuleTest = async () => {
    if (!testingRule) return;
    setIsTestingRule(true);
    setRuleTestResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(testPayloadStr);
      } catch (e) {
        throw new Error('Invalid JSON payload syntax. Please verify commas and quotes.');
      }
      const res = await api.testRule(testingRule.id, parsed);
      setRuleTestResult(res);
    } catch (err) {
      setRuleTestResult({ matched: false, error: err.message });
    } finally {
      setIsTestingRule(false);
    }
  };

  const handleInspectSensor = async (s) => {
    try {
      const health = await api.getSensorHealth(s.id);
      setInspectingSensorHealth({ ...s, ...health });
    } catch (err) {
      alert('Failed to retrieve sensor health: ' + err.message);
    }
  };

  const handleTrajectoryFeedback = async (incidentId, feedback) => {
    try {
      await api.submitTrajectoryFeedback(incidentId, feedback);
      setTrajectoryFeedbackStatus(prev => ({ ...prev, [incidentId]: feedback }));
      const trajRes = await api.getTrajectories();
      setTrajectories(trajRes || []);
    } catch (err) {
      alert('Failed to submit trajectory feedback: ' + err.message);
    }
  };

  // Handle alert triage status updates
  const handleAlertStatusUpdate = async (alertId, newStatus) => {
    try {
      await api.updateAlert(alertId, { status: newStatus });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: newStatus } : a));
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Failed to update alert triage status: ' + err.message);
    }
  };

  // Export alerts to standard CSV
  const exportAlertsCsv = () => {
    if (!filteredAlerts.length) return;
    const headers = ['ID', 'Created At', 'Severity', 'Title', 'Category', 'Source', 'Target Host', 'Status', 'Confidence'];
    const rows = filteredAlerts.map(a => [
      `"${a.id}"`,
      `"${a.created_at}"`,
      `"${a.severity}"`,
      `"${(a.title || '').replace(/"/g, '""')}"`,
      `"${a.detection_category}"`,
      `"${a.detection_source}"`,
      `"${extractAlertIp(a) || 'Gateway'}"`,
      `"${a.status}"`,
      `"${(a.confidence * 100).toFixed(0)}%"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xcidion_alerts_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch triage update for filtered alerts
  const handleBatchAlertStatus = async (newStatus) => {
    if (!filteredAlerts.length) return;
    try {
      await Promise.all(filteredAlerts.slice(0, 15).map(a => api.updateAlert(a.id, { status: newStatus })));
      setAlerts(prev => prev.map(a => {
        const matches = filteredAlerts.some(fa => fa.id === a.id);
        return matches ? { ...a, status: newStatus } : a;
      }));
    } catch (err) {
      alert('Failed to update batch alerts: ' + err.message);
    }
  };

  // Extract relevant host/device IP from alert evidence or description
  const extractAlertIp = (alertItem) => {
    if (!alertItem) return null;
    const ev = alertItem.evidence || {};
    const feat = ev.feature_values || {};
    return (
      ev.src_ip ||
      ev.source_ip ||
      feat.src_ip ||
      feat.source_ip ||
      ev.dst_ip ||
      ev.destination_ip ||
      feat.dst_ip ||
      feat.destination_ip ||
      (alertItem.description?.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/)?.[0]) ||
      null
    );
  };

  // Filtered alerts for Triage Queue
  const filteredAlerts = alerts.filter((al) => {
    if (alertFilterSeverity !== 'all' && al.severity?.toLowerCase() !== alertFilterSeverity.toLowerCase()) {
      return false;
    }
    if (alertFilterStatus !== 'all' && al.status?.toLowerCase() !== alertFilterStatus.toLowerCase()) {
      return false;
    }
    if (alertSearchTerm.trim()) {
      const term = alertSearchTerm.toLowerCase();
      const hostIp = extractAlertIp(al) || '';
      const matches =
        al.title?.toLowerCase().includes(term) ||
        al.description?.toLowerCase().includes(term) ||
        al.detection_category?.toLowerCase().includes(term) ||
        al.id?.toLowerCase().includes(term) ||
        hostIp.toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <LoadingSpinner message="Loading XCIDION Admin Operations Dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Operations Header */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CircularLogo size={32} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Security Operations Console
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: '#818CF8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '2px 8px',
                fontSize: '0.68rem'
              }}
            >
              ADMINISTRATOR
            </span>
            <span
              style={{
                fontSize: '0.70rem',
                padding: '2px 7px',
                borderRadius: '3px',
                backgroundColor: wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: wsStatus === 'connected' ? '#10B981' : '#F59E0B',
                border: `1px solid ${wsStatus === 'connected' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
              }}
            >
              ● {wsStatus === 'connected' ? 'Connected' : 'Offline'}
            </span>
          </div>
          <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Perimeter intrusion detection, network scanning, alert triage, and threat trajectory modeling.
          </p>
        </div>

        {/* Quick IP Device Investigation Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (directIpInput.trim()) {
              setInvestigatingIp(directIpInput.trim());
              setDirectIpInput('');
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            placeholder="Search host IP (e.g. 192.168.1.50)..."
            value={directIpInput}
            onChange={(e) => setDirectIpInput(e.target.value)}
            style={{
              padding: '6px 11px',
              fontSize: '0.78rem',
              width: '240px',
              borderRadius: '4px',
              backgroundColor: '#0F1520',
              border: '1px solid #232E40',
              color: 'var(--text-primary)'
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            <ExternalLink size={12} />
            <span>Investigate</span>
          </button>
          <button type="button" onClick={fetchData} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </form>
      </div>

      {/* Main Tab Navigation */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '4px',
          gap: '4px',
          backgroundColor: '#0E141E'
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'terminal', label: 'Live Terminal', icon: Terminal },
          { id: 'scanner', label: 'Network Scanner', icon: Network },
          { id: 'alerts', label: 'Alert Triage', icon: AlertTriangle, count: alerts.length },
          { id: 'trajectory', label: 'Threat Trajectory', icon: Dna },
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
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '4px',
                border: isActive ? '1px solid #2B384E' : '1px solid transparent',
                backgroundColor: isActive ? '#17202E' : 'transparent',
                color: isActive ? '#F1F5F9' : '#8492A3',
                fontWeight: isActive ? '600' : '500',
                fontSize: '0.80rem',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} color={isActive ? '#818CF8' : 'currentColor'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? '#312E81' : '#1E2738',
                    color: isActive ? '#C7D2FE' : '#8492A3'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monitored Hosts
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '700', color: '#F1F5F9', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {devices.length}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Discovered Network Nodes
              </span>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Sensor Probes
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '700', color: '#10B981', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {summary?.active_sensors || 3} / 3
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Zeek, Suricata, Flow
              </span>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Alerts
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '700', color: (summary?.active_alerts || 0) > 0 ? '#F97316' : '#10B981', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {summary?.active_alerts || 0}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Requires Analyst Review
              </span>
            </div>

            <div className="glass-card" style={{ padding: '16px 18px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Processed Flows
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: '700', color: '#818CF8', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {summary?.total_events || 0}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Ingested Flow Records
              </span>
            </div>
          </div>

          {/* Device Assets Table with 1-Click Investigation */}
          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Monitored Network Assets ({devices.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Click "Investigate" on any host to inspect port profiles, activity timeline, and trajectory.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('scanner')}
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
              >
                <span>Run Network Scan</span>
                <ChevronRight size={13} />
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
                    <th>Risk Indicators</th>
                    <th>Risk Level</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev) => (
                    <tr key={dev.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#38BDF8' }}>
                        {dev.ip_address}
                      </td>
                      <td style={{ color: 'var(--text-primary)' }}>{dev.hostname || 'unknown'}</td>
                      <td>
                        <span style={{ fontSize: '0.70rem', color: '#10B981', fontWeight: '600' }}>
                          ● {dev.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(dev.open_ports || []).slice(0, 3).map((p, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: '#1E2838',
                                color: '#CBD5E1',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              {p.port}
                            </span>
                          ))}
                          {(dev.open_ports || []).length > 3 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              +{dev.open_ports.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.74rem', color: dev.suspicious_indicators?.length ? '#F59E0B' : 'var(--text-muted)' }}>
                          {dev.suspicious_indicators?.[0] || 'Baseline (Normal)'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: dev.risk_level === 'critical' ? 'rgba(239, 68, 68, 0.12)' : (dev.risk_level === 'high' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                            color: dev.risk_level === 'critical' ? '#EF4444' : (dev.risk_level === 'high' ? '#F97316' : '#10B981'),
                            border: `1px solid ${dev.risk_level === 'critical' ? 'rgba(239, 68, 68, 0.3)' : (dev.risk_level === 'high' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(16, 185, 129, 0.3)')}`,
                            fontSize: '0.68rem',
                            padding: '1px 6px'
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
                            padding: '4px 9px',
                            fontSize: '0.74rem'
                          }}
                        >
                          <ExternalLink size={11} />
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
          <AuthorizedScanner
            onInvestigateDevice={(ip) => setInvestigatingIp(ip)}
            onScanComplete={fetchData}
          />
        </div>
      )}

      {/* TAB 4: ALERT TRIAGE & INCIDENTS */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Triage Status KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Ingested Alerts
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {alerts.length}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>All incoming detections</span>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: '#F97316', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                New / Untriaged
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#F97316', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {alerts.filter(a => a.status === 'new').length}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Awaiting review</span>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: '#F59E0B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Under Investigation
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#F59E0B', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {alerts.filter(a => a.status === 'investigating' || a.status === 'acknowledged').length}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>In-progress triage</span>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: '#10B981', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Resolved / Closed
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#10B981', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {alerts.filter(a => a.status === 'resolved' || a.status === 'closed').length}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Remediated / Verified</span>
            </div>
          </div>

          {/* Triage Filter Bar */}
          <div
            className="glass-panel"
            style={{
              padding: '12px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: '#111724'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <Search size={14} color="#8291A5" />
              <input
                type="text"
                placeholder="Search alerts by title, description, category, or IP..."
                value={alertSearchTerm}
                onChange={(e) => setAlertSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  borderRadius: '4px',
                  backgroundColor: '#0A0F17',
                  border: '1px solid #222E40',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Severity Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px', fontWeight: '600' }}>
                  Severity:
                </span>
                {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                  <button
                    key={s}
                    onClick={() => setAlertFilterSeverity(s)}
                    style={{
                      padding: '3px 7px',
                      fontSize: '0.68rem',
                      borderRadius: '3px',
                      border: alertFilterSeverity === s ? '1px solid #4F46E5' : '1px solid #202B3C',
                      backgroundColor: alertFilterSeverity === s ? '#242B46' : '#101622',
                      color: alertFilterSeverity === s ? '#EEF2FF' : '#8291A5',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontWeight: alertFilterSeverity === s ? '600' : '400'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px', fontWeight: '600' }}>
                  Status:
                </span>
                {['all', 'new', 'investigating', 'resolved', 'closed'].map(st => (
                  <button
                    key={st}
                    onClick={() => setAlertFilterStatus(st)}
                    style={{
                      padding: '3px 7px',
                      fontSize: '0.68rem',
                      borderRadius: '3px',
                      border: alertFilterStatus === st ? '1px solid #0284C7' : '1px solid #202B3C',
                      backgroundColor: alertFilterStatus === st ? '#172B3C' : '#101622',
                      color: alertFilterStatus === st ? '#E0F2FE' : '#8291A5',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontWeight: alertFilterStatus === st ? '600' : '400'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Export CSV & Batch Triage */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <button
                  onClick={exportAlertsCsv}
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.72rem', gap: '5px' }}
                  title="Export filtered alerts to CSV"
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
                {filteredAlerts.length > 0 && (
                  <button
                    onClick={() => handleBatchAlertStatus('investigating')}
                    className="btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.72rem', color: '#F59E0B', borderColor: '#45381D' }}
                    title="Mark all filtered alerts as Investigating"
                  >
                    <span>Triage ({filteredAlerts.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filtered Alerts Triage Table */}
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Alert Triage Queue ({filteredAlerts.length})
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Live detection classifications from Zeek, Suricata, and Heuristic Engines
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Alert Title</th>
                    <th>Category</th>
                    <th>Target Host</th>
                    <th>Engine</th>
                    <th>Confidence</th>
                    <th>Triage Status</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
                        No alerts match the selected triage filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((al) => {
                      const hostIp = extractAlertIp(al);
                      return (
                        <tr key={al.id}>
                          <td><SeverityBadge severity={al.severity} /></td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.82rem' }}>{al.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {al.description}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{al.detection_category}</td>
                          <td>
                            {hostIp ? (
                              <button
                                onClick={() => setInvestigatingIp(hostIp)}
                                className="btn-secondary"
                                style={{ padding: '2px 7px', fontSize: '0.70rem', color: '#38BDF8', gap: '4px' }}
                                title={`Investigate host ${hostIp}`}
                              >
                                <ExternalLink size={10} />
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{hostIp}</span>
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Gateway</span>
                            )}
                          </td>
                          <td>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.70rem', color: '#94A3B8', fontWeight: '600', padding: '2px 6px', borderRadius: '3px', backgroundColor: '#1A2332' }}>
                              {al.detection_source}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{(al.confidence * 100).toFixed(0)}%</td>
                          <td>
                            <select
                              value={al.status}
                              onChange={(e) => handleAlertStatusUpdate(al.id, e.target.value)}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                backgroundColor: '#101724',
                                border: '1px solid #233146',
                                color: al.status === 'resolved' ? '#10B981' : (al.status === 'investigating' ? '#F59E0B' : (al.status === 'closed' ? '#64748B' : '#EF4444')),
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="new">● New</option>
                              <option value="acknowledged">● Acknowledged</option>
                              <option value="investigating">● Investigating</option>
                              <option value="resolved">● Resolved</option>
                              <option value="closed">● Closed</option>
                            </select>
                          </td>
                          <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {al.created_at}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '5px' }}>
                              <button
                                onClick={() => setSelectedAlert(al)}
                                className="btn-primary"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                title="Inspect telemetry evidence and SHAP weights"
                              >
                                <Eye size={11} />
                                <span>Inspect</span>
                              </button>
                              {hostIp && (
                                <button
                                  onClick={() => setInvestigatingIp(hostIp)}
                                  className="btn-secondary"
                                  style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                                  title={`Investigate host ${hostIp}`}
                                >
                                  <ExternalLink size={11} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ATTACK TRAJECTORY & MITRE PROGRESSION */}
      {activeTab === 'trajectory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Banner */}
          <div className="glass-panel" style={{ padding: '16px 20px', backgroundColor: '#111724' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dna size={18} color="#818CF8" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Threat Trajectory & ATT&CK Kill Chain Model
                  </h3>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: '#1C2436',
                      color: '#94A3B8',
                      border: '1px solid #28364E',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    ATT&CK Markov Model v1.4
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Correlates multi-sensor alerts into graph clusters and models probable attacker progression across MITRE ATT&CK stages.
                </p>
              </div>

              {trajectories.length === 0 && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    await api.generateDemoScenario('complete_campaign');
                    await fetchData();
                  }}
                  className="btn-primary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <Sparkles size={13} />
                  <span>Simulate Multi-Stage Attack</span>
                </button>
              )}
            </div>

            {/* Incident / Trajectory Selector */}
            {trajectories.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Tracked Incidents ({trajectories.length}):
                </span>
                {trajectories.map((t) => {
                  const isSelected = (selectedIncidentId || trajectories[0]?.incident_id) === t.incident_id;
                  return (
                    <button
                      key={t.incident_id}
                      onClick={() => setSelectedIncidentId(t.incident_id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: isSelected ? '1px solid #4F46E5' : '1px solid #222E42',
                        backgroundColor: isSelected ? '#1E243D' : '#0F1522',
                        color: isSelected ? '#EEF2FF' : '#8291A5',
                        fontSize: '0.74rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{t.incident_id}</span>
                      <span style={{ fontSize: '0.68rem', color: isSelected ? '#C7D2FE' : '#64748B' }}>
                        ({t.current_stage || t.estimated_stage})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Trajectory Explorer */}
          {(() => {
            const activeTraj = trajectories.find(t => t.incident_id === (selectedIncidentId || trajectories[0]?.incident_id)) || trajectories[0];
            if (!activeTraj) {
              return (
                <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <p>No active attack trajectory detected in current telemetry window.</p>
                  <p style={{ marginTop: '6px', color: '#64748B' }}>Click "Simulate Multi-Stage Attack" above to load a realistic multi-stage campaign sequence.</p>
                </div>
              );
            }

            const mitreStages = ["Reconnaissance", "Initial Access", "Execution", "Credential Access", "Lateral Movement", "Exfiltration", "Impact"];
            const currentStage = activeTraj.current_stage || activeTraj.estimated_stage || "Reconnaissance";
            const currentStageIdx = mitreStages.indexOf(currentStage) !== -1 ? mitreStages.indexOf(currentStage) : 0;
            const candidates = activeTraj.ranked_candidates || [];
            const feedbackGiven = trajectoryFeedbackStatus[activeTraj.incident_id] || activeTraj.feedback;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* MITRE Kill Chain Stepper */}
                <div className="glass-panel" style={{ padding: '16px 20px', backgroundColor: '#111724' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      MITRE ATT&CK Enterprise Kill Chain Stepper
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: '600' }}>
                      Confidence: {(activeTraj.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: '6px', gap: '6px' }}>
                    {mitreStages.map((stage, idx) => {
                      const isCurrent = stage.toLowerCase() === currentStage.toLowerCase();
                      const isPast = idx < currentStageIdx;
                      const isPredicted = candidates.some(c => c.stage.toLowerCase() === stage.toLowerCase());

                      return (
                        <div
                          key={stage}
                          style={{
                            flex: 1,
                            minWidth: '115px',
                            padding: '10px 12px',
                            borderRadius: '5px',
                            backgroundColor: isCurrent
                              ? '#1C243B'
                              : (isPast ? '#101B24' : (isPredicted ? '#161E2E' : '#0B0F17')),
                            border: isCurrent
                              ? '1px solid #4F46E5'
                              : (isPast ? '1px solid #164E44' : (isPredicted ? '1px dashed #3B4D68' : '1px solid #1E2838')),
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.62rem', color: isCurrent ? '#818CF8' : (isPast ? '#10B981' : (isPredicted ? '#38BDF8' : '#64748B')), fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {isCurrent ? '● Active' : (isPast ? '✓ Observed' : (isPredicted ? '➔ Candidate' : `Stage ${idx + 1}`))}
                          </div>
                          <div style={{ fontSize: '0.76rem', fontWeight: '600', color: isCurrent ? '#FFFFFF' : (isPast ? '#F1F5F9' : '#8291A5'), marginTop: '3px' }}>
                            {stage}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Two-Column Analytics: Candidates vs Mitigations */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                  {/* Left: Probabilistic Attacker Next Steps */}
                  <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                      <TrendingUp size={16} color="#818CF8" />
                      <h4 style={{ fontSize: '0.90rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Next Attacker Stage Projections
                      </h4>
                    </div>

                    {candidates.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
                        No branching transition candidates identified.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {candidates.map((c, i) => {
                          const probPercent = Math.round(c.probability * 100);
                          return (
                            <div
                              key={i}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '5px',
                                backgroundColor: '#0B0F17',
                                border: '1px solid #1E2838'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '600', color: '#F1F5F9', fontSize: '0.82rem' }}>
                                  Target: {c.stage}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#818CF8', fontSize: '0.80rem' }}>
                                  {probPercent}% Probability
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div style={{ width: '100%', height: '4px', borderRadius: '2px', backgroundColor: '#1E2838', overflow: 'hidden', margin: '6px 0' }}>
                                <div
                                  style={{
                                    width: `${probPercent}%`,
                                    height: '100%',
                                    backgroundColor: '#4F46E5',
                                    borderRadius: '2px'
                                  }}
                                />
                              </div>

                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Indicators: {(c.evidence_indicators || []).join(', ') || 'Probabilistic transition based on priors'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Containment Controls & Analyst Feedback */}
                  <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                        <ShieldAlert size={16} color="#10B981" />
                        <h4 style={{ fontSize: '0.90rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          Recommended Containment Controls
                        </h4>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          `Sever network egress from compromised source assets to halt potential exfiltration.`,
                          `Enforce immediate credential revocation on targeted service ports.`,
                          `Enable enhanced Suricata IDS heuristic rules for internal lateral pivots.`,
                          `Quarantine affected host until forensic verification is completed.`
                        ].map((act, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              backgroundColor: '#0F1A1C',
                              border: '1px solid #193B36',
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <CheckCircle2 size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Analyst Feedback Loop */}
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px 14px',
                        borderRadius: '6px',
                        backgroundColor: '#0B0F17',
                        border: '1px solid #1E2838'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                          Analyst Feedback Loop
                        </span>
                        {feedbackGiven && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: feedbackGiven === 'useful' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: feedbackGiven === 'useful' ? '#10B981' : '#F59E0B',
                              border: `1px solid ${feedbackGiven === 'useful' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                              fontSize: '0.66rem',
                              padding: '1px 6px'
                            }}
                          >
                            {feedbackGiven.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Validate trajectory projections against observed behavior to refine transition matrices.
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleTrajectoryFeedback(activeTraj.incident_id, 'useful')}
                          className="btn-secondary"
                          style={{
                            flex: 1,
                            fontSize: '0.72rem',
                            padding: '5px',
                            color: '#10B981',
                            borderColor: feedbackGiven === 'useful' ? '#10B981' : '#222E42'
                          }}
                        >
                          <ThumbsUp size={11} />
                          <span>Useful</span>
                        </button>
                        <button
                          onClick={() => handleTrajectoryFeedback(activeTraj.incident_id, 'inconclusive')}
                          className="btn-secondary"
                          style={{
                            flex: 1,
                            fontSize: '0.72rem',
                            padding: '5px',
                            color: '#F59E0B',
                            borderColor: feedbackGiven === 'inconclusive' ? '#F59E0B' : '#222E42'
                          }}
                        >
                          <HelpCircle size={11} />
                          <span>Inconclusive</span>
                        </button>
                        <button
                          onClick={() => handleTrajectoryFeedback(activeTraj.incident_id, 'incorrect')}
                          className="btn-secondary"
                          style={{
                            flex: 1,
                            fontSize: '0.72rem',
                            padding: '5px',
                            color: '#EF4444',
                            borderColor: feedbackGiven === 'incorrect' ? '#EF4444' : '#222E42'
                          }}
                        >
                          <ThumbsDown size={11} />
                          <span>Incorrect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 6: TELEMETRY ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* High-Level Telemetry KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monitored Flow Volume
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#818CF8', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {analyticsOverview?.metrics?.total_events || summary?.total_events || 0}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Raw packet flows</span>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: '#F97316', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Classified Alerts
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#F97316', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {analyticsOverview?.metrics?.total_alerts || alerts.length}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Security incidents</span>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: '#38BDF8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Incident Clusters
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#38BDF8', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {analyticsOverview?.metrics?.total_incidents || incidents.length}
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Graph correlations</span>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px' }}>
              <span style={{ fontSize: '0.70rem', color: '#10B981', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Model Mean Confidence
              </span>
              <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#10B981', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {((analyticsOverview?.metrics?.mean_confidence || 0.89) * 100).toFixed(1)}%
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Classifier confidence</span>
            </div>
          </div>

          {/* Plotly Visualizations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {/* Flow Volume Timeline */}
            <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Ingested Flow Volume Over Time
              </h4>
              {traffic && traffic.timestamps ? (
                <Plot
                  data={[
                    {
                      x: traffic.timestamps,
                      y: traffic.event_counts,
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Flows',
                      line: { color: '#4F46E5', width: 2 },
                      marker: { color: '#818CF8', size: 5 }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    height: 240,
                    margin: { l: 40, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#8291A5', size: 10 },
                    xaxis: { gridcolor: '#1E2838' },
                    yaxis: { gridcolor: '#1E2838' }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>No flow telemetry</div>
              )}
            </div>

            {/* Protocol Distribution Donut */}
            <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Protocol Traffic Breakdown
              </h4>
              {analyticsOverview?.protocols?.length ? (
                <Plot
                  data={[
                    {
                      values: analyticsOverview.protocols.map(p => p.count),
                      labels: analyticsOverview.protocols.map(p => p.protocol || 'OTHER'),
                      type: 'pie',
                      hole: 0.6,
                      marker: {
                        colors: ['#4F46E5', '#0284C7', '#10B981', '#F59E0B', '#EF4444', '#64748B']
                      },
                      textinfo: 'label+percent',
                      textfont: { size: 10, color: '#F1F5F9' }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    height: 240,
                    margin: { l: 15, r: 15, t: 10, b: 15 },
                    paper_bgcolor: 'transparent',
                    font: { color: '#8291A5', size: 10 },
                    showlegend: false
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>No protocol breakdown data</div>
              )}
            </div>
          </div>

          {/* Severity & Engine Sources Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
            {/* Severity Distribution */}
            <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Alert Severity Distribution
              </h4>
              {analyticsOverview?.severity_distribution?.length ? (
                <Plot
                  data={[
                    {
                      x: analyticsOverview.severity_distribution.map(s => s.severity.toUpperCase()),
                      y: analyticsOverview.severity_distribution.map(s => s.count),
                      type: 'bar',
                      marker: {
                        color: ['#EF4444', '#F97316', '#F59E0B', '#10B981']
                      }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    height: 220,
                    margin: { l: 40, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#8291A5', size: 10 },
                    xaxis: { gridcolor: '#1E2838' },
                    yaxis: { gridcolor: '#1E2838' }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>No severity data</div>
              )}
            </div>

            {/* Detection Engine Sources */}
            <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Detection Engine Attributions
              </h4>
              {analyticsOverview?.source_distribution?.length ? (
                <Plot
                  data={[
                    {
                      x: analyticsOverview.source_distribution.map(s => s.source.toUpperCase()),
                      y: analyticsOverview.source_distribution.map(s => s.count),
                      type: 'bar',
                      marker: {
                        color: ['#4F46E5', '#0284C7', '#10B981', '#64748B']
                      }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    height: 220,
                    margin: { l: 40, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    font: { color: '#8291A5', size: 10 },
                    xaxis: { gridcolor: '#1E2838' },
                    yaxis: { gridcolor: '#1E2838' }
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>No source attribution data</div>
              )}
            </div>
          </div>

          {/* Top Talkers & Targeted Destinations */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
            {/* Top Source IPs */}
            <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Top Threat Origin IPs
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Source IP</th>
                      <th>Flow Count</th>
                      <th style={{ textAlign: 'right' }}>Investigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsOverview?.top_source_ips || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#38BDF8' }}>
                          {item.ip}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.count}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setInvestigatingIp(item.ip)}
                            className="btn-secondary"
                            style={{ padding: '2px 7px', fontSize: '0.70rem' }}
                          >
                            <ExternalLink size={10} />
                            <span>Investigate</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Target Destination IPs */}
            <div className="glass-panel" style={{ padding: '16px 18px', backgroundColor: '#111724' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Most Targeted Host IPs
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Target Host IP</th>
                      <th>Flow Count</th>
                      <th style={{ textAlign: 'right' }}>Investigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsOverview?.top_destination_ips || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#10B981' }}>
                          {item.ip}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.count}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setInvestigatingIp(item.ip)}
                            className="btn-secondary"
                            style={{ padding: '2px 7px', fontSize: '0.70rem' }}
                          >
                            <ExternalLink size={10} />
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
        </div>
      )}

      {/* TAB 7: SETTINGS & SENSORS */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sensors Status & Health Inspection */}
          <div className="glass-panel" style={{ padding: '18px 20px', backgroundColor: '#111724' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '0.94rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Active Network Sensor Probes ({sensors.length})
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Managed packet capture, Zeek, Suricata, and honeypot sensor endpoints streaming telemetry.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {sensors.map((s) => {
                const isOnline = s.status === 'online';
                return (
                  <div
                    key={s.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#0B0F17',
                      border: '1px solid #1E2838',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {s.name}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isOnline ? '#10B981' : '#EF4444',
                            border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            fontSize: '0.66rem',
                            padding: '1px 6px'
                          }}
                        >
                          {s.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                        Type: <span style={{ fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>{s.source_type?.toUpperCase()}</span>
                        <br />
                        Host: <span style={{ fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>{s.hostname}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInspectSensor(s)}
                      className="btn-secondary"
                      style={{ width: '100%', fontSize: '0.74rem', padding: '5px 8px', gap: '6px', justifyContent: 'center' }}
                    >
                      <Cpu size={12} color="#818CF8" />
                      <span>Inspect Telemetry</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detection Rules Configuration */}
          <div className="glass-panel" style={{ padding: '18px 20px', backgroundColor: '#111724' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.94rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Intrusion Detection Rules ({rules.length})
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {isAdmin ? 'Active pattern-matching signatures and heuristic detection rules.' : 'Read-only rule policies (Administrator access required to modify).'}
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowCreateRuleModal(true)}
                  className="btn-primary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  <Plus size={13} />
                  <span>Create Detection Rule</span>
                </button>
              )}
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
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#818CF8', fontSize: '0.76rem' }}>{r.id}</td>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{r.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.category}</td>
                      <td><SeverityBadge severity={r.severity} /></td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: r.enabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                            color: r.enabled ? '#10B981' : '#94A3B8',
                            border: `1px solid ${r.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                            fontSize: '0.66rem',
                            padding: '1px 6px'
                          }}
                        >
                          {r.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setTestingRule(r);
                              setRuleTestResult(null);
                            }}
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.70rem', color: '#818CF8' }}
                            title="Test rule against sample network event"
                          >
                            <Play size={11} />
                            <span>Test</span>
                          </button>
                          <button
                            onClick={() => handleRuleToggle(r.id, r.enabled)}
                            disabled={!isAdmin}
                            className="btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.70rem',
                              opacity: isAdmin ? 1 : 0.5,
                              cursor: isAdmin ? 'pointer' : 'not-allowed'
                            }}
                          >
                            {r.enabled ? 'Disable' : 'Enable'}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteRule(r.id)}
                              className="btn-secondary"
                              style={{ padding: '3px 7px', fontSize: '0.70rem', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Delete detection rule"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
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

      {/* Alert Triage & Deep Explainability Modal */}
      {selectedAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 14, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '20px 24px', backgroundColor: '#111724', border: '1px solid #222E42' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <SeverityBadge severity={selectedAlert.severity} />
                  <span
                    className="badge"
                    style={{
                      backgroundColor: '#1C243B',
                      color: '#818CF8',
                      border: '1px solid #313D5E',
                      fontSize: '0.68rem',
                      padding: '2px 8px'
                    }}
                  >
                    {selectedAlert.status?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ID: {selectedAlert.id}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {selectedAlert.title}
                </h3>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="btn-secondary" style={{ padding: '5px' }}>
                <X size={15} />
              </button>
            </div>

            {/* Triage Workflow Actions Bar */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: '#0B0F17',
                border: '1px solid #1E2838',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '700' }}>
                Alert Triage Workflow
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => handleAlertStatusUpdate(selectedAlert.id, 'investigating')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    backgroundColor: selectedAlert.status === 'investigating' ? '#261C0D' : '#141A24',
                    color: selectedAlert.status === 'investigating' ? '#F59E0B' : '#94A3B8',
                    border: selectedAlert.status === 'investigating' ? '1px solid #F59E0B' : '1px solid #222E42',
                    cursor: 'pointer'
                  }}
                >
                  Under Investigation
                </button>
                <button
                  onClick={() => handleAlertStatusUpdate(selectedAlert.id, 'resolved')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    backgroundColor: selectedAlert.status === 'resolved' ? '#0C2017' : '#141A24',
                    color: selectedAlert.status === 'resolved' ? '#10B981' : '#94A3B8',
                    border: selectedAlert.status === 'resolved' ? '1px solid #10B981' : '1px solid #222E42',
                    cursor: 'pointer'
                  }}
                >
                  Resolve Alert
                </button>
                <button
                  onClick={() => handleAlertStatusUpdate(selectedAlert.id, 'closed')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    backgroundColor: selectedAlert.status === 'closed' ? '#1C2433' : '#141A24',
                    color: selectedAlert.status === 'closed' ? '#CBD5E1' : '#94A3B8',
                    border: selectedAlert.status === 'closed' ? '1px solid #475569' : '1px solid #222E42',
                    cursor: 'pointer'
                  }}
                >
                  Close / False Positive
                </button>
                <button
                  onClick={() => handleAlertStatusUpdate(selectedAlert.id, 'new')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: '600',
                    backgroundColor: selectedAlert.status === 'new' ? '#271115' : '#141A24',
                    color: selectedAlert.status === 'new' ? '#EF4444' : '#94A3B8',
                    border: selectedAlert.status === 'new' ? '1px solid #EF4444' : '1px solid #222E42',
                    cursor: 'pointer'
                  }}
                >
                  Reopen (New)
                </button>
              </div>
            </div>

            {/* Host Device Context & Deep Investigation */}
            {(() => {
              const hostIp = extractAlertIp(selectedAlert);
              return (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#0B0F17',
                    border: '1px solid #1E2838',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                      Target Host Entity
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                      Host Address: <strong style={{ fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>{hostIp || 'Perimeter Gateway'}</strong>
                    </div>
                  </div>
                  {hostIp && (
                    <button
                      onClick={() => {
                        const target = hostIp;
                        setSelectedAlert(null);
                        setInvestigatingIp(target);
                      }}
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: '0.74rem', gap: '6px' }}
                    >
                      <ExternalLink size={12} />
                      <span>Investigate Host</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Description & Explainability Details */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                Incident Description & Context
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedAlert.description}
              </p>
            </div>

            {/* Explainability / Telemetry Details */}
            <div style={{ backgroundColor: '#080C13', padding: '14px', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', border: '1px solid #1E2838' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818CF8', marginBottom: '8px', fontSize: '0.72rem' }}>
                <span>Engine: {selectedAlert.detection_source?.toUpperCase()}</span>
                <span>Category: {selectedAlert.detection_category}</span>
                <span>Confidence: {(selectedAlert.confidence * 100).toFixed(1)}%</span>
              </div>
              <pre style={{ color: '#94A3B8', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px', margin: 0 }}>
                {JSON.stringify(selectedAlert.evidence || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Custom Detection Rule */}
      {showCreateRuleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 14, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '20px 24px', backgroundColor: '#111724', border: '1px solid #222E42' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} color="#818CF8" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Create Custom Detection Rule
                </h3>
              </div>
              <button onClick={() => setShowCreateRuleModal(false)} className="btn-secondary" style={{ padding: '5px' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', fontWeight: '600' }}>
                  Rule Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="RULE-CUSTOM-SCAN-01"
                  value={newRuleId}
                  onChange={(e) => setNewRuleId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.80rem',
                    borderRadius: '4px',
                    backgroundColor: '#0B0F17',
                    border: '1px solid #222E42',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', fontWeight: '600' }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Suspicious Lateral SSH Pivot Detection"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.80rem',
                    borderRadius: '4px',
                    backgroundColor: '#0B0F17',
                    border: '1px solid #222E42',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', fontWeight: '600' }}>
                    Attack Category
                  </label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '0.80rem',
                      borderRadius: '4px',
                      backgroundColor: '#0B0F17',
                      border: '1px solid #222E42',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Reconnaissance">Reconnaissance</option>
                    <option value="Brute Force">Brute Force</option>
                    <option value="Denial of Service">Denial of Service</option>
                    <option value="Web Attack">Web Attack</option>
                    <option value="Exfiltration">Exfiltration</option>
                    <option value="Lateral Movement">Lateral Movement</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', fontWeight: '600' }}>
                    Severity Level
                  </label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '0.80rem',
                      borderRadius: '4px',
                      backgroundColor: '#0B0F17',
                      border: '1px solid #222E42',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', fontWeight: '600' }}>
                  Target Destination Port
                </label>
                <input
                  type="number"
                  placeholder="22"
                  value={newRulePort}
                  onChange={(e) => setNewRulePort(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.80rem',
                    borderRadius: '4px',
                    backgroundColor: '#0B0F17',
                    border: '1px solid #222E42',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px', fontWeight: '600' }}>
                  Rule Description & Actionable Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Flags rapid unauthorized connections targeting internal service daemon."
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.80rem',
                    borderRadius: '4px',
                    backgroundColor: '#0B0F17',
                    border: '1px solid #222E42',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateRuleModal(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: '0.76rem', padding: '6px 14px' }}
                >
                  Save & Deploy Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Interactive Rule Testing Playground */}
      {testingRule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 14, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '620px', padding: '20px 24px', backgroundColor: '#111724', border: '1px solid #222E42' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.70rem', color: '#818CF8', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Rule Evaluation Bench: {testingRule.id}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {testingRule.name}
                </h3>
              </div>
              <button onClick={() => setTestingRule(null)} className="btn-secondary" style={{ padding: '5px' }}>
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Validate rule matching criteria against synthetic or captured telemetry event payloads.
            </p>

            {/* Quick Templates */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTestPayloadStr(JSON.stringify({
                  source_ip: "10.0.0.99",
                  destination_ip: "192.168.1.100",
                  destination_port: 22,
                  protocol: "TCP",
                  event_type: "ssh_login_failure"
                }, null, 2))}
                className="btn-secondary"
                style={{ fontSize: '0.70rem', padding: '3px 8px', backgroundColor: '#0B0F17' }}
              >
                Template: SSH Failure
              </button>
              <button
                type="button"
                onClick={() => setTestPayloadStr(JSON.stringify({
                  source_ip: "192.168.1.50",
                  destination_ip: "192.168.1.1",
                  destination_port: 80,
                  protocol: "TCP",
                  event_type: "syn_flood",
                  packet_count: 5000
                }, null, 2))}
                className="btn-secondary"
                style={{ fontSize: '0.70rem', padding: '3px 8px', backgroundColor: '#0B0F17' }}
              >
                Template: SYN Flood
              </button>
              <button
                type="button"
                onClick={() => setTestPayloadStr(JSON.stringify({
                  source_ip: "192.168.1.20",
                  destination_ip: "192.168.1.10",
                  destination_port: 443,
                  protocol: "TCP",
                  event_type: "http_get"
                }, null, 2))}
                className="btn-secondary"
                style={{ fontSize: '0.70rem', padding: '3px 8px', backgroundColor: '#0B0F17' }}
              >
                Template: Benign HTTP
              </button>
            </div>

            <textarea
              rows={6}
              value={testPayloadStr}
              onChange={(e) => setTestPayloadStr(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                borderRadius: '4px',
                backgroundColor: '#080C13',
                border: '1px solid #1E2838',
                color: '#CBD5E1',
                marginBottom: '12px'
              }}
            />

            <button
              onClick={handleExecuteRuleTest}
              disabled={isTestingRule}
              className="btn-primary"
              style={{ width: '100%', fontSize: '0.78rem', gap: '6px', padding: '7px' }}
            >
              <Play size={13} />
              <span>{isTestingRule ? 'Evaluating Payload...' : 'Execute Rule Evaluation'}</span>
            </button>

            {/* Test Results Output */}
            {ruleTestResult && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  borderRadius: '4px',
                  backgroundColor: ruleTestResult.matched ? '#0C2017' : '#141A24',
                  border: `1px solid ${ruleTestResult.matched ? '#10B981' : '#222E42'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.82rem', color: ruleTestResult.matched ? '#10B981' : '#94A3B8' }}>
                    {ruleTestResult.matched ? '✓ MATCH DETECTED (ALERT TRIGGERED)' : '✗ NO MATCH (BENIGN TRAFFIC)'}
                  </span>
                  {ruleTestResult.severity && (
                    <SeverityBadge severity={ruleTestResult.severity} />
                  )}
                </div>
                {ruleTestResult.error ? (
                  <div style={{ fontSize: '0.74rem', color: '#EF4444' }}>
                    Error: {ruleTestResult.error}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Evidence: {JSON.stringify(ruleTestResult.evidence || 'Pattern evaluated successfully with 0 trigger conditions')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Sensor Probe Health Inspector */}
      {inspectingSensorHealth && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 14, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '20px 24px', backgroundColor: '#111724', border: '1px solid #222E42' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={18} color="#38BDF8" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {inspectingSensorHealth.name}
                  </h3>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ID: {inspectingSensorHealth.id}
                  </span>
                </div>
              </div>
              <button onClick={() => setInspectingSensorHealth(null)} className="btn-secondary" style={{ padding: '5px' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: '#0B0F17', border: '1px solid #1E2838' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Operational State
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: inspectingSensorHealth.status === 'online' ? '#10B981' : '#EF4444', marginTop: '2px' }}>
                  {inspectingSensorHealth.status?.toUpperCase()}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: '#0B0F17', border: '1px solid #1E2838' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Captured Flows
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#818CF8', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {inspectingSensorHealth.events_count ?? 0}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '12px', backgroundColor: '#0B0F17', borderRadius: '4px', border: '1px solid #1E2838' }}>
              <div>Host Node: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{inspectingSensorHealth.hostname}</strong></div>
              <div>Probe Engine: <strong style={{ color: '#38BDF8', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{inspectingSensorHealth.source_type}</strong></div>
              <div>Last Heartbeat: <strong style={{ color: '#CBD5E1' }}>{inspectingSensorHealth.last_heartbeat_at || 'Active Telemetry Streaming'}</strong></div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setInspectingSensorHealth(null)} className="btn-secondary" style={{ fontSize: '0.76rem', padding: '6px 14px' }}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
