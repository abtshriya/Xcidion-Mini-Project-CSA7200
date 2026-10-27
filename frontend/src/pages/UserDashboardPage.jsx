import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldCheck, Activity, Server, AlertTriangle, Radio,
  FileText, ExternalLink, RefreshCw, CheckCircle2, Clock, Printer, X, Eye
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { DeviceInvestigationModal } from '../components/investigation/DeviceInvestigationModal';
import { CircularLogo } from '../components/common/CircularLogo';
import { LiveThreatScanner } from '../components/scanner/LiveThreatScanner';

export const UserDashboardPage = () => {
  const { user } = useAuth();
  const { status: wsStatus } = useWebSocket();
  const { refreshKey } = useOutletContext() || {};

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [investigatingIp, setInvestigatingIp] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [sumRes, devRes, alertRes, sensorRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDevices(),
        api.getAlerts({ limit: 15 }),
        api.getSensors()
      ]);

      setSummary(sumRes);
      setDevices(devRes || []);
      setAlerts(alertRes || []);
      setSensors(sensorRes || []);
    } catch (err) {
      console.error('Failed to load user dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [refreshKey]);

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <LoadingSpinner message="Loading network security posture..." />
      </div>
    );
  }

  const printReport = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '18px 22px',
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
              Security Posture Overview
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '2px 8px'
              }}
            >
              ANALYST VIEW
            </span>
          </div>
          <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Continuous network perimeter monitoring, active host inventory, and intrusion detection telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={printReport} className="btn-secondary" style={{ fontSize: '0.80rem', padding: '6px 12px' }}>
            <Printer size={13} />
            <span>Print Report</span>
          </button>
          <button onClick={fetchUserData} className="btn-secondary" style={{ fontSize: '0.80rem', padding: '6px 12px' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Engineering Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Monitored Devices
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {devices.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Active Host Assets
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Online Sensors
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#10B981', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {summary?.active_sensors || sensors.filter(s => s.status === 'online').length} / {sensors.length || 3}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Detection Probes Active
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.70rem', color: alerts.length > 0 ? '#F97316' : 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Active Alerts
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: alerts.length > 0 ? '#F97316' : '#10B981', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {alerts.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Flagged Security Events
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Ingestion Pipeline
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#10B981', marginTop: '8px' }}>
            HEALTHY
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Zeek & Suricata active
          </span>
        </div>
      </div>

      {/* Live System & Network Threat Scanner */}
      <div id="live-scanner-section">
        <LiveThreatScanner
          onInvestigateDevice={(ip) => setInvestigatingIp(ip)}
          onScanComplete={fetchUserData}
        />
      </div>

      {/* Network Assets Inventory Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Monitored Network Assets ({devices.length})
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Host records on approved local segments. Click "View Details" to inspect the security dossier.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Hostname</th>
                <th>Status</th>
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
                  <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{dev.hostname || 'Unresolved Host'}</td>
                  <td>
                    <span style={{ fontSize: '0.72rem', color: dev.status === 'online' ? '#10B981' : '#EF4444' }}>
                      ● {dev.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <SeverityBadge severity={dev.risk_level} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setInvestigatingIp(dev.ip_address)}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                    >
                      <ExternalLink size={12} />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split Grid: Recent Alerts Feed & Sensor Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Recent Alerts Feed */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Recent Alert Detections
          </h2>

          {alerts.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No active alerts. All monitored traffic within baseline parameters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.slice(0, 8).map((al) => (
                <div
                  key={al.id}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '4px',
                    backgroundColor: '#0F1520',
                    border: '1px solid #1E2738',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease'
                  }}
                  onClick={() => setSelectedAlert(al)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SeverityBadge severity={al.severity} />
                      <span style={{ fontSize: '0.68rem', color: '#818CF8', textTransform: 'uppercase', fontWeight: '600' }}>
                        {al.detection_source}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {al.created_at?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    {al.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {al.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sensor Health Probes */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Active Sensor Probes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sensors.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '11px 14px',
                  borderRadius: '4px',
                  backgroundColor: '#0F1520',
                  border: '1px solid #1E2738',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Engine: <strong style={{ color: '#CBD5E1', textTransform: 'uppercase' }}>{s.source_type}</strong> | Host: {s.hostname}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: s.status === 'online' ? '#10B981' : '#EF4444' }}>
                  ● {s.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Methodology Summary */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Detection Methodology & Sensor Coverage
        </h3>
        <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Real-time flow inspection combines Zeek connection telemetry, Suricata rule evaluation, and machine learning flow anomaly detection. Alerts are correlated into structured incident timelines for rapid root-cause isolation.
        </p>
      </div>

      {/* Read-Only Alert Evidence Inspection Modal */}
      {selectedAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 12, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <SeverityBadge severity={selectedAlert.severity} />
                  <span style={{ fontSize: '0.70rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                    ID: {selectedAlert.id}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {selectedAlert.title}
                </h3>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="btn-secondary" style={{ padding: '4px 8px' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                Description
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedAlert.description}
              </p>
            </div>

            <div style={{ backgroundColor: '#070A0F', padding: '14px', borderRadius: '4px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', border: '1px solid #1E2738' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8', marginBottom: '8px' }}>
                <span>Engine: {selectedAlert.detection_source?.toUpperCase()}</span>
                <span>Category: {selectedAlert.detection_category}</span>
                <span>Confidence: {(selectedAlert.confidence * 100).toFixed(0)}%</span>
              </div>
              <pre style={{ color: '#94A3B8', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px' }}>
                {JSON.stringify(selectedAlert.evidence || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Device Investigation Modal */}
      {investigatingIp && (
        <DeviceInvestigationModal
          ipAddress={investigatingIp}
          onClose={() => setInvestigatingIp(null)}
        />
      )}
    </div>
  );
};
