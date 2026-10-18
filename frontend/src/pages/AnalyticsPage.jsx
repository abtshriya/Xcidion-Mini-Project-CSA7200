import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { BarChart3, RefreshCw, Download, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return <LoadingSpinner message="Calculating telemetry analytics and distributions..." />;
  }

  // Top source IPs
  const topSrcX = data?.top_source_ips?.map(item => item.ip) || [];
  const topSrcY = data?.top_source_ips?.map(item => item.count) || [];

  // Top dest IPs
  const topDstX = data?.top_destination_ips?.map(item => item.ip) || [];
  const topDstY = data?.top_destination_ips?.map(item => item.count) || [];

  // Protocol share
  const protoLabels = data?.protocols?.map(p => p.protocol) || [];
  const protoValues = data?.protocols?.map(p => p.count) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Cybersecurity Analytics & Telemetry
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Long-term operational statistics, protocol breakdowns, and adversary destination vectors.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
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
          <span>Refresh</span>
        </button>
      </div>

      {/* Row 1: High Level Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Stored Flows</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--xc-aqua)', marginTop: '4px' }}>
            {data?.metrics?.total_events?.toLocaleString() || 0}
          </div>
        </div>
        <div style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Triggered Alerts</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--sev-medium)', marginTop: '4px' }}>
            {data?.metrics?.total_alerts?.toLocaleString() || 0}
          </div>
        </div>
        <div style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Correlated Incidents</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--xc-violet)', marginTop: '4px' }}>
            {data?.metrics?.total_incidents?.toLocaleString() || 0}
          </div>
        </div>
        <div style={{ padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Mean Detection Confidence</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--xc-teal)', marginTop: '4px' }}>
            {Math.round((data?.metrics?.mean_confidence || 0.88) * 100)}%
          </div>
        </div>
      </div>

      {/* Row 2: Charts (Top Source IPs and Top Destination IPs) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Top Active Source IP Addresses
          </h3>
          <Plot
            data={[
              {
                x: topSrcX,
                y: topSrcY,
                type: 'bar',
                marker: { color: '#726EFF' }
              }
            ]}
            layout={{
              autosize: true,
              height: 240,
              margin: { l: 40, r: 20, t: 10, b: 60 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: { color: '#8492A3', tickangle: -25 },
              yaxis: { color: '#8492A3', gridcolor: '#1B2735' }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '240px' }}
          />
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Top Targeted Destination Host IPs
          </h3>
          <Plot
            data={[
              {
                x: topDstX,
                y: topDstY,
                type: 'bar',
                marker: { color: '#59FFE7' }
              }
            ]}
            layout={{
              autosize: true,
              height: 240,
              margin: { l: 40, r: 20, t: 10, b: 60 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: { color: '#8492A3', tickangle: -25 },
              yaxis: { color: '#8492A3', gridcolor: '#1B2735' }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '240px' }}
          />
        </div>
      </div>

      {/* Row 3: Protocol Distribution */}
      <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
        <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
          Network Protocol Composition
        </h3>
        <Plot
          data={[
            {
              labels: protoLabels,
              values: protoValues,
              type: 'pie',
              hole: 0.6,
              marker: {
                colors: ['#08C6AC', '#59FFE7', '#726EFF', '#F5C451']
              }
            }
          ]}
          layout={{
            autosize: true,
            height: 220,
            margin: { l: 20, r: 20, t: 10, b: 20 },
            paper_bgcolor: 'transparent',
            showlegend: true,
            legend: { font: { color: '#C5CED8', size: 10 }, orientation: 'h', x: 0.2, y: -0.15 }
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%', height: '220px' }}
        />
      </div>
    </div>
  );
};
