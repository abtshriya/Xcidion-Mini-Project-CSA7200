import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Plot from 'react-plotly.js';
import {
  Activity, ShieldAlert, AlertTriangle, Radio, Server,
  TrendingUp, Dna, ArrowRight, RefreshCw, CheckCircle2, Clock
} from 'lucide-react';
import { api } from '../api/client';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { refreshKey } = useOutletContext() || {};

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [threats, setThreats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [health, setHealth] = useState(null);
  const [trajectories, setTrajectories] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, trafRes, threatRes, evtRes, healthRes, trajRes, incRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTraffic(),
        api.getDashboardThreats(),
        api.getDashboardRecentEvents(8),
        api.getDashboardHealth(),
        api.getTrajectories(),
        api.getIncidents({ limit: 4 })
      ]);
      setSummary(sumRes);
      setTraffic(trafRes);
      setThreats(threatRes);
      setRecentEvents(evtRes);
      setHealth(healthRes);
      setTrajectories(trajRes);
      setIncidents(incRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  if (loading && !summary) {
    return <LoadingSpinner message="Aggregating network threat intelligence..." />;
  }

  // Prep Plotly Data
  const trafficTimes = traffic?.timeline?.map(t => t.time) || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const trafficCounts = traffic?.timeline?.map(t => t.count) || [0, 0, 0, 0, 0, 0];

  const severityLabels = threats?.severity_distribution?.map(s => s.severity.toUpperCase()) || [];
  const severityValues = threats?.severity_distribution?.map(s => s.count) || [];
  const severityColors = {
    CRITICAL: '#FF4D67',
    HIGH: '#FF8A4C',
    MEDIUM: '#F5C451',
    LOW: '#08C6AC'
  };

  const primaryTraj = trajectories?.[0] || null;
  const primaryIncident = incidents?.[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header / Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Security Operations Overview
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Real-time telemetry, hybrid detection metrics, and multi-stage incident correlation.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem'
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh View</span>
        </button>
      </div>

      {/* Top 6 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Events', value: summary?.total_events ?? 0, icon: Activity, color: 'var(--xc-aqua)', link: '/traffic' },
          { label: 'Active Alerts', value: summary?.active_alerts ?? 0, icon: AlertTriangle, color: 'var(--sev-medium)', link: '/alerts' },
          { label: 'Critical Alerts', value: summary?.critical_alerts ?? 0, icon: ShieldAlert, color: 'var(--sev-critical)', link: '/alerts' },
          { label: 'Open Incidents', value: summary?.open_incidents ?? 0, icon: Dna, color: 'var(--xc-violet)', link: '/incidents' },
          { label: 'Monitored Hosts', value: summary?.monitored_hosts ?? 0, icon: Radio, color: 'var(--xc-teal)', link: '/traffic' },
          { label: 'Sensors Health', value: `${summary?.sensor_health?.online ?? 0}/${summary?.sensor_health?.total ?? 0}`, icon: Server, color: 'var(--xc-teal)', link: '/sensors' }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.link)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '18px',
                boxShadow: 'var(--shadow-raised)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {card.label}
                </span>
                <div style={{ color: card.color }}>
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Charts (Traffic Volume over Time & Severity Distribution) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Network Flow Volume */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '20px',
            boxShadow: 'var(--shadow-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Network Activity Flow
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Event Count by Time</span>
          </div>
          <Plot
            data={[
              {
                x: trafficTimes,
                y: trafficCounts,
                type: 'scatter',
                mode: 'lines+markers',
                fill: 'tozeroy',
                line: { color: '#59FFE7', width: 2 },
                marker: { color: '#726EFF', size: 6 }
              }
            ]}
            layout={{
              autosize: true,
              height: 240,
              margin: { l: 40, r: 20, t: 10, b: 35 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: { color: '#8492A3', gridcolor: '#1B2735', showgrid: true },
              yaxis: { color: '#8492A3', gridcolor: '#1B2735', showgrid: true }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '240px' }}
          />
        </div>

        {/* Severity Breakdown */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '20px',
            boxShadow: 'var(--shadow-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Alerts by Severity
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Proportion</span>
          </div>
          <Plot
            data={[
              {
                labels: severityLabels,
                values: severityValues,
                type: 'pie',
                hole: 0.55,
                marker: {
                  colors: severityLabels.map(l => severityColors[l] || '#37465D')
                },
                textinfo: 'value',
                hoverinfo: 'label+value+percent'
              }
            ]}
            layout={{
              autosize: true,
              height: 240,
              margin: { l: 20, r: 20, t: 10, b: 20 },
              paper_bgcolor: 'transparent',
              showlegend: true,
              legend: { font: { color: '#C5CED8', size: 10 }, orientation: 'h', x: 0, y: -0.2 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '240px' }}
          />
        </div>
      </div>

      {/* Row 3: Attack DNA & Threat Trajectory Spotlight Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Attack DNA Widget */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '20px',
            boxShadow: 'var(--shadow-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dna size={18} color="var(--xc-violet)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Attack DNA Fingerprint
              </h3>
            </div>
            <button
              onClick={() => navigate('/attack-dna')}
              style={{ background: 'none', color: 'var(--xc-aqua)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Explore Graph</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {primaryIncident ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--xc-aqua)' }}>
                    {primaryIncident.id}
                  </span>
                  <SeverityBadge severity={primaryIncident.severity} />
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {primaryIncident.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Correlated Alerts: <strong>{primaryIncident.alert_count}</strong> | Confidence: <strong>{Math.round(primaryIncident.correlation_confidence * 100)}%</strong>
                </div>
              </div>
              <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {primaryIncident.description}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No active correlated incidents.</div>
          )}
        </div>

        {/* Threat Trajectory Widget */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '20px',
            boxShadow: 'var(--shadow-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--xc-violet)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Threat Trajectory Status
              </h3>
            </div>
            <button
              onClick={() => navigate('/trajectory')}
              style={{ background: 'none', color: 'var(--xc-aqua)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View Stages</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {primaryTraj && primaryTraj.evaluation_status !== 'insufficient_evidence' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Stage</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--sev-high)', marginTop: '4px' }}>
                    {primaryTraj.current_stage}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Predicted Stage</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--xc-aqua)', marginTop: '4px' }}>
                    {primaryTraj.predicted_stage || 'Unknown'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Confidence: <strong>{Math.round(primaryTraj.confidence * 100)}%</strong> | Model: <strong>{primaryTraj.model_version}</strong>
              </div>
              <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {primaryTraj.evidence_summary}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Insufficient evidence for a reliable prediction.
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Recent Security Events Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '20px',
          boxShadow: 'var(--shadow-raised)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Recent Monitored Events
          </h3>
          <button
            onClick={() => navigate('/traffic')}
            style={{ background: 'none', color: 'var(--xc-aqua)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View All Traffic</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Source IP</th>
                <th style={{ padding: '10px 12px' }}>Destination IP</th>
                <th style={{ padding: '10px 12px' }}>Protocol</th>
                <th style={{ padding: '10px 12px' }}>Detection</th>
                <th style={{ padding: '10px 12px' }}>Severity</th>
                <th style={{ padding: '10px 12px' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((evt) => (
                <tr
                  key={evt.id}
                  onClick={() => evt.alert_id ? navigate(`/alerts?search=${evt.alert_id}`) : navigate(`/traffic?search=${evt.source_ip}`)}
                  style={{
                    borderBottom: '1px solid rgba(55, 70, 93, 0.4)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {evt.source_ip}:{evt.source_port || 0}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {evt.destination_ip}:{evt.destination_port || 0}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--xc-aqua)', fontWeight: '600' }}>
                    {evt.protocol}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                    {evt.detection_name}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <SeverityBadge severity={evt.severity} />
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {evt.detection_source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
