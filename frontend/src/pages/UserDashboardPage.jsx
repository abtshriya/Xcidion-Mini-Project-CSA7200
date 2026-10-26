import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Activity, Server, AlertTriangle, Radio,
  FileText, ExternalLink, RefreshCw, CheckCircle2, Clock, Printer
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { DeviceInvestigationModal } from '../components/investigation/DeviceInvestigationModal';

export const UserDashboardPage = () => {
  const { user } = useAuth();
  const { status: wsStatus } = useWebSocket();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [investigatingIp, setInvestigatingIp] = useState(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [sumRes, devRes, alertRes, sensorRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDevices(),
        api.getAlerts({ limit: 10 }),
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
  }, []);

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <LoadingSpinner message="Loading XCIDION Monitoring Posture..." />
      </div>
    );
  }

  const printReport = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} color="var(--xc-aqua)" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              Network Security Monitoring Posture
            </h1>
            <span
              className="badge"
              style={{
                backgroundColor: 'rgba(8, 198, 172, 0.15)',
                color: 'var(--xc-teal)',
                border: '1px solid var(--xc-teal)',
                padding: '3px 10px'
              }}
            >
              STANDARD USER (READ-ONLY)
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Continuous network perimeter monitoring, active host device health, and verified intrusion notifications.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={printReport} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
            <Printer size={14} />
            <span>Print Posture Report</span>
          </button>
          <button onClick={fetchUserData} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Glassmorphic KPI Cards */}
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
            {summary?.active_sensors || sensors.filter(s => s.status === 'online').length} / {sensors.length || 3}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Perimeter Detection Probes
          </span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Security Alerts
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: alerts.length > 0 ? '#FF8A4C' : 'var(--xc-teal)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            {alerts.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Total Recorded Warnings
          </span>
        </div>

        <div className="glass-card">
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Protection Posture
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--xc-teal)', marginTop: '10px' }}>
            DEFENSE ACTIVE
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Rules & ML Ingestion Active
          </span>
        </div>
      </div>

      {/* Device Status Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Discovered Network Devices & Status ({devices.length})
          </h2>
          <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
            Status of monitored hosts on approved local segments. Click "View Details" to inspect the security dossier.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Hostname</th>
                <th>Operational Status</th>
                <th>Risk Classification</th>
                <th style={{ textAlign: 'right' }}>Security Dossier</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--xc-aqua)' }}>
                    {dev.ip_address}
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{dev.hostname || 'Unresolved Host'}</td>
                  <td>
                    <span style={{ fontSize: '0.74rem', color: dev.status === 'online' ? 'var(--xc-teal)' : '#FF4D67' }}>
                      ● {dev.status?.toUpperCase()}
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
                      style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--xc-aqua)' }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Recent Alerts Feed */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Recent Security Alerts
          </h2>

          {alerts.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No active alerts detected. All traffic patterns within normal limits.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alerts.slice(0, 5).map((al) => (
                <div
                  key={al.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(14, 21, 31, 0.75)',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <SeverityBadge severity={al.severity} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {al.created_at}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {al.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {al.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sensor Health Probes */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
            NIDS Detection Sensor Probes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sensors.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(14, 21, 31, 0.75)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Probe Engine: <strong style={{ color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{s.source_type}</strong> | Host: {s.hostname}
                  </div>
                </div>
                <span style={{ fontSize: '0.74rem', color: s.status === 'online' ? 'var(--xc-teal)' : '#FF4D67' }}>
                  ● {s.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Read-Only Posture Report Summary */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Continuous Network Intrusion Posture Summary (Read-Only)
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          XCIDION continuous network intrusion detection verifies all active IPv4 flows across approved subnets. Rule-based signatures and Scikit-learn machine learning flow models operate concurrently to isolate reconnaissance, credential brute force, and anomalous connection floods without exposing active configuration controls to unauthorized users.
        </p>
      </div>

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
