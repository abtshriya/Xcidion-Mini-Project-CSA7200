import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Plot from 'react-plotly.js';
import {
  Dna, Search, RefreshCw, Shield, AlertTriangle,
  Server, ArrowRight, Info, CheckCircle2, Link2
} from 'lucide-react';
import { api } from '../api/client';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const AttackDNAPage = () => {
  const [searchParams] = useSearchParams();
  const queryIncId = searchParams.get('incident');

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(queryIncId || '');
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidentsList = async () => {
      try {
        const incs = await api.getIncidents({ limit: 20 });
        setIncidents(incs);
        if (incs.length > 0 && !selectedIncidentId) {
          setSelectedIncidentId(incs[0].id);
        }
      } catch (err) {
        console.error('Failed to load incidents list:', err);
      }
    };
    fetchIncidentsList();
  }, []);

  useEffect(() => {
    if (!selectedIncidentId) return;

    const fetchGraph = async () => {
      setLoading(true);
      try {
        const data = await api.getIncidentAttackDNA(selectedIncidentId);
        setGraphData(data);
        if (data.nodes?.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      } catch (err) {
        console.error('Failed to load Attack DNA graph:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [selectedIncidentId]);

  // Construct Plotly network graph visualization
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  // Generate circular / spring layout coordinates
  const nodeCoords = {};
  const N = nodes.length || 1;
  nodes.forEach((n, idx) => {
    const angle = (2 * Math.PI * idx) / N;
    const radius = n.type.includes('host') ? 1.4 : 0.8;
    nodeCoords[n.id] = {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  });

  // Edge trace
  const edgeX = [];
  const edgeY = [];
  edges.forEach((edge) => {
    const src = nodeCoords[edge.source];
    const dst = nodeCoords[edge.target];
    if (src && dst) {
      edgeX.push(src.x, dst.x, null);
      edgeY.push(src.y, dst.y, null);
    }
  });

  const edgeTrace = {
    x: edgeX,
    y: edgeY,
    mode: 'lines',
    line: { color: 'rgba(114, 110, 255, 0.45)', width: 1.8 },
    hoverinfo: 'none',
    type: 'scatter'
  };

  // Node trace
  const nodeX = nodes.map(n => nodeCoords[n.id]?.x || 0);
  const nodeY = nodes.map(n => nodeCoords[n.id]?.y || 0);
  const nodeColors = nodes.map(n => {
    if (n.type === 'adversary_host') return '#FF4D67';
    if (n.type === 'target_host') return '#59FFE7';
    return '#726EFF'; // alert nodes
  });
  const nodeSizes = nodes.map(n => n.type.includes('host') ? 24 : 16);
  const nodeLabels = nodes.map(n => n.label);

  const nodeTrace = {
    x: nodeX,
    y: nodeY,
    mode: 'markers+text',
    text: nodeLabels,
    textposition: 'top center',
    textfont: { color: '#F4F7FA', size: 10 },
    marker: {
      color: nodeColors,
      size: nodeSizes,
      line: { color: '#080C12', width: 2 }
    },
    hoverinfo: 'text',
    type: 'scatter'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(114, 110, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--xc-violet)'
              }}
            >
              <Dna size={18} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              Attack DNA — Behavioural Fingerprinting
            </h1>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Evidence-backed incident graph correlating adversary source hosts, targets, and chronological alert sequences.
          </p>
        </div>

        {/* Incident Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>Active Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            style={{ minWidth: '220px', fontWeight: '600', color: 'var(--xc-aqua)' }}
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id}: {inc.title.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating graph layout and evidence relationships..." />
      ) : !graphData || nodes.length === 0 ? (
        <EmptyState title="No graph relationships" message="This incident has no correlated graph nodes." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Main Graph Visualization */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '20px',
              boxShadow: 'var(--shadow-raised)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Interactive Relationship Graph
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Directly Observed Entities: <strong>{graphData.observed_events_count}</strong> | Inferred Links: <strong>{graphData.inferred_links_count}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.74rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#FF4D67', borderRadius: '50%' }} />
                  Adversary
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#59FFE7', borderRadius: '50%' }} />
                  Target Asset
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#726EFF', borderRadius: '50%' }} />
                  Security Alert
                </span>
              </div>
            </div>

            <Plot
              data={[edgeTrace, nodeTrace]}
              layout={{
                autosize: true,
                height: 440,
                margin: { l: 20, r: 20, t: 20, b: 20 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { showgrid: false, zeroline: false, showticklabels: false },
                yaxis: { showgrid: false, zeroline: false, showticklabels: false },
                showlegend: false,
                hovermode: 'closest'
              }}
              config={{ responsive: true, displayModeBar: false }}
              onClick={(data) => {
                const pt = data.points[0];
                if (pt && nodes[pt.pointIndex]) {
                  setSelectedNode(nodes[pt.pointIndex]);
                }
              }}
              style={{ width: '100%', height: '440px' }}
            />
          </div>

          {/* Evidence Inspector Panel */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '20px',
              boxShadow: 'var(--shadow-raised)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <Info size={16} color="var(--xc-aqua)" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Correlation Evidence Inspector
              </h3>
            </div>

            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selected Entity</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedNode.label}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--xc-violet)', fontWeight: '600', textTransform: 'capitalize', marginTop: '2px' }}>
                    Type: {selectedNode.type.replace('_', ' ')}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '0.80rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Observed Entity Metadata:</span>
                  <pre
                    style={{
                      marginTop: '6px',
                      fontFamily: 'monospace',
                      color: 'var(--xc-aqua)',
                      fontSize: '0.76rem',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {JSON.stringify(selectedNode.details, null, 2)}
                  </pre>
                </div>

                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Connected Relationship Edges:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {edges
                      .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '0.76rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--xc-aqua)', fontWeight: '600' }}>
                            <Link2 size={13} />
                            <span>{e.relationship} ({Math.round(e.confidence * 100)}% confidence)</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {e.evidence}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Click on any node in the graph to inspect evidence and relationships.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chronological Attack Progression Timeline */}
      {graphData?.timeline?.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '20px',
            boxShadow: 'var(--shadow-raised)'
          }}
        >
          <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Attack Sequence Narrative
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {graphData.timeline.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: '6px',
                  borderLeft: '3px solid var(--xc-violet)'
                }}
              >
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', minWidth: '75px', fontFamily: 'monospace' }}>
                  {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : `Step #${idx + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{step.title}</strong>
                    <SeverityBadge severity={step.severity} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {step.source_ip} ➔ {step.destination_ip} | Engine: {step.detection_source}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--xc-aqua)', maxWidth: '320px', textAlign: 'right' }}>
                  {step.evidence_snippet}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
