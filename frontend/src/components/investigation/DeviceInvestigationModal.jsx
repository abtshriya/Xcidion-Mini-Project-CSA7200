import React, { useState, useEffect } from 'react';
import {
  X, ShieldAlert, Cpu, AlertTriangle, Activity, Dna,
  TrendingUp, CheckCircle2, HelpCircle, Network, ArrowRight,
  Shield, Server, Radio, FileText, Lock
} from 'lucide-react';
import { api } from '../../api/client';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const DeviceInvestigationModal = ({ ipAddress, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline'); // 'profile', 'alerts', 'timeline', 'trajectory'

  useEffect(() => {
    if (!ipAddress) return;

    const fetchInvestigation = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.investigateDevice(ipAddress);
        setData(res);
      } catch (err) {
        console.error('Failed to load device investigation:', err);
        setError(err.message || 'Failed to retrieve device dossier');
      } finally {
        setLoading(false);
      }
    };

    fetchInvestigation();
  }, [ipAddress]);

  if (!ipAddress) return null;

  const device = data?.device;
  const alerts = data?.associated_alerts || [];
  const timeline = data?.attack_dna_timeline || [];
  const trajectory = data?.threat_trajectory || {};

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical': return '#FF4D67';
      case 'high': return '#FF8A4C';
      case 'medium': return '#F5C451';
      default: return 'var(--xc-teal)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 12, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '24px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1080px',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(14, 21, 31, 0.95)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'rgba(114, 110, 255, 0.15)',
                border: '1px solid rgba(114, 110, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Server size={22} color="var(--xc-aqua)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {ipAddress}
                </h2>
                {device && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${getRiskColor(device.risk_level)}20`,
                      color: getRiskColor(device.risk_level),
                      border: `1px solid ${getRiskColor(device.risk_level)}`
                    }}
                  >
                    Risk: {device.risk_level?.toUpperCase()}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(8, 198, 172, 0.15)',
                    color: 'var(--xc-teal)'
                  }}
                >
                  ● ONLINE ASSET
                </span>
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Host: <strong>{device?.hostname || 'Unknown Host'}</strong> | Discovered via {device?.scan_source || 'network telemetry'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px', borderRadius: '6px', height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close dossier"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            backgroundColor: 'rgba(10, 15, 23, 0.8)',
            padding: '0 24px'
          }}
        >
          {[
            { id: 'timeline', label: 'Attack DNA Timeline', icon: Dna, count: timeline.length },
            { id: 'trajectory', label: 'Threat Trajectory & Predictions', icon: TrendingUp },
            { id: 'alerts', label: 'Associated Alerts', icon: AlertTriangle, count: alerts.length },
            { id: 'profile', label: 'Port Audit & Profile', icon: Cpu, count: device?.open_ports?.length }
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
                  padding: '14px 18px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--xc-aqua)' : '2px solid transparent',
                  background: 'none',
                  color: isActive ? 'var(--xc-aqua)' : 'var(--text-muted)',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'rgba(89, 255, 231, 0.2)' : 'rgba(255, 255, 255, 0.08)',
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

        {/* Modal Main Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <LoadingSpinner message="Correlating device evidence, Attack DNA graph, and trajectory predictions..." />
            </div>
          ) : error ? (
            <div style={{ padding: '20px', color: '#FF4D67', backgroundColor: 'rgba(255, 77, 103, 0.1)', borderRadius: '8px' }}>
              Error loading investigation dossier: {error}
            </div>
          ) : (
            <>
              {/* TAB 1: ATTACK DNA TIMELINE (CONFIRMED VS INFERRED DELINEATED) */}
              {activeTab === 'timeline' && (
                <div>
                  {/* Delineation Legend */}
                  <div
                    style={{
                      padding: '12px 18px',
                      backgroundColor: 'rgba(18, 27, 40, 0.7)',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
                      <strong>Evidence Delineation Standard:</strong> Observed network traffic records are strictly distinguished from graph-correlated inferences.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--xc-teal)' }} />
                        <span style={{ color: 'var(--xc-teal)', fontWeight: '600' }}>Confirmed Observed Event ({data.confirmed_events_count})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px dashed #F5C451', backgroundColor: 'transparent' }} />
                        <span style={{ color: '#F5C451', fontWeight: '600' }}>Inferred Relationship ({data.inferred_relations_count})</span>
                      </div>
                    </div>
                  </div>

                  {timeline.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No events or graph correlations recorded for this device.
                    </div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: '28px', borderLeft: '2px solid rgba(114, 110, 255, 0.2)' }}>
                      {timeline.map((evt, idx) => {
                        const isConfirmed = evt.is_confirmed;
                        return (
                          <div
                            key={evt.id || idx}
                            style={{
                              position: 'relative',
                              marginBottom: '20px',
                              padding: '16px',
                              borderRadius: '8px',
                              backgroundColor: isConfirmed ? 'rgba(14, 21, 31, 0.75)' : 'rgba(24, 35, 49, 0.65)',
                              border: isConfirmed ? '1px solid rgba(8, 198, 172, 0.35)' : '1px dashed rgba(245, 196, 81, 0.45)',
                              boxShadow: 'var(--glass-shadow-sm)'
                            }}
                          >
                            {/* Timeline Node Marker */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '-35px',
                                top: '18px',
                                width: '14px',
                                height: '14px',
                                borderRadius: isConfirmed ? '50%' : '3px',
                                backgroundColor: isConfirmed ? 'var(--xc-teal)' : '#080C12',
                                border: isConfirmed ? '2px solid #080C12' : '2px dashed #F5C451',
                                boxShadow: isConfirmed ? '0 0 8px rgba(8, 198, 172, 0.6)' : 'none'
                              }}
                            />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: isConfirmed ? 'rgba(8, 198, 172, 0.18)' : 'rgba(245, 196, 81, 0.18)',
                                    color: isConfirmed ? 'var(--xc-teal)' : '#F5C451',
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  {isConfirmed ? 'CONFIRMED OBSERVED EVENT' : 'INFERRED RELATIONSHIP'}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {evt.timestamp}
                                </span>
                              </div>

                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: 'rgba(114, 110, 255, 0.15)',
                                  color: 'var(--xc-violet)',
                                  fontFamily: 'var(--font-mono)'
                                }}
                              >
                                Source: {evt.detection_source}
                              </span>
                            </div>

                            <h4 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                              {evt.title}
                            </h4>
                            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                              {evt.description}
                            </p>

                            <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Protocol: <strong style={{ color: 'var(--text-primary)' }}>{evt.protocol || 'N/A'}</strong></span>
                              {evt.port && <span>Target Port: <strong style={{ color: 'var(--text-primary)' }}>{evt.port}</strong></span>}
                              <span>Evidence: <strong style={{ color: 'var(--text-primary)' }}>{evt.evidence_type}</strong></span>
                              <span>Confidence: <strong style={{ color: isConfirmed ? 'var(--xc-teal)' : '#F5C451' }}>{evt.confidence_score * 100}%</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: THREAT TRAJECTORY (PROBABILISTIC ESTIMATION VS GROUND TRUTH) */}
              {activeTab === 'trajectory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Prominent Prediction Methodology Callout */}
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: 'rgba(114, 110, 255, 0.08)',
                      border: '1px solid rgba(114, 110, 255, 0.25)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <Info size={18} color="var(--xc-violet)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                      <strong style={{ color: 'var(--xc-violet)' }}>Conventional Probabilistic Markov Trajectory Engine:</strong>
                      <br />
                      Predictions represent mathematical transitions across MITRE ATT&CK stages based on prior attack sequences. Projections are clearly designated as <strong>prospective estimates</strong> to distinguish them from confirmed ground-truth intrusion telemetry.
                    </div>
                  </div>

                  {/* Current Observed Threat Stage */}
                  <div className="glass-card">
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      CONFIRMED OBSERVED ATTACK PHASE
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          color: 'var(--xc-aqua)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {trajectory.current_threat_stage || 'Baseline'}
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(8, 198, 172, 0.15)',
                          color: 'var(--xc-teal)',
                          border: '1px solid var(--xc-teal)'
                        }}
                      >
                        Ground Truth Telemetry Verified
                      </span>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                      Observed Tactics: {trajectory.observed_stages?.join(' ➔ ') || 'None'}
                    </div>
                  </div>

                  {/* Projected Next Attacker Stages */}
                  <div className="glass-card">
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      PROJECTED ATTACK VECTOR TRAJECTORY (STATISTICAL ESTIMATION)
                    </span>

                    {trajectory.trajectory_predictions && trajectory.trajectory_predictions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                        {trajectory.trajectory_predictions.map((pred, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '14px 18px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(8, 12, 18, 0.7)',
                              border: '1px solid rgba(114, 110, 255, 0.18)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ArrowRight size={16} color="var(--xc-aqua)" />
                                <span style={{ fontWeight: '700', fontSize: '0.96rem', color: 'var(--text-primary)' }}>
                                  {pred.stage}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.80rem',
                                  fontWeight: '800',
                                  color: 'var(--xc-aqua)',
                                  fontFamily: 'var(--font-mono)'
                                }}
                              >
                                {pred.confidence_percentage}% Probability
                              </span>
                            </div>

                            {/* Probability Progress Bar */}
                            <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', margin: '8px 0' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pred.confidence_percentage}%`,
                                  background: 'linear-gradient(90deg, var(--xc-violet), var(--xc-aqua))'
                                }}
                              />
                            </div>

                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Supporting indicators: {pred.supporting_reasons?.join('; ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hostile trajectory progression detected. Device traffic matches normal operation baseline.
                      </div>
                    )}
                  </div>

                  {/* Remediation & Countermeasures */}
                  {trajectory.recommended_action && (
                    <div
                      style={{
                        padding: '16px 20px',
                        backgroundColor: 'rgba(8, 198, 172, 0.08)',
                        border: '1px solid rgba(8, 198, 172, 0.3)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--xc-teal)', fontWeight: '700', fontSize: '0.88rem', marginBottom: '6px' }}>
                        <Shield size={16} />
                        <span>Recommended Proactive Countermeasures</span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {trajectory.recommended_action}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASSOCIATED ALERTS */}
              {activeTab === 'alerts' && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
                    Associated Intrusion Detection Alerts ({alerts.length})
                  </h3>

                  {alerts.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No active intrusion alerts linked to this host.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {alerts.map((al) => (
                        <div
                          key={al.id}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(18, 27, 40, 0.7)',
                            border: `1px solid ${getRiskColor(al.severity)}40`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: `${getRiskColor(al.severity)}20`,
                                  color: getRiskColor(al.severity),
                                  border: `1px solid ${getRiskColor(al.severity)}`
                                }}
                              >
                                {al.severity?.toUpperCase()}
                              </span>
                              <span style={{ fontWeight: '700', fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                                {al.title}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {al.created_at}
                            </span>
                          </div>

                          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {al.description}
                          </p>

                          <div style={{ display: 'flex', gap: '16px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            <span>Category: <strong style={{ color: 'var(--text-primary)' }}>{al.detection_category}</strong></span>
                            <span>Engine: <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>{al.detection_source}</strong></span>
                            <span>Status: <strong style={{ color: 'var(--text-primary)' }}>{al.status}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PORT AUDIT & PROFILE */}
              {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="glass-card">
                    <h4 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
                      Verified Open Ports & Services
                    </h4>

                    {device?.open_ports && device.open_ports.length > 0 ? (
                      <table className="glass-table">
                        <thead>
                          <tr>
                            <th>Port</th>
                            <th>Protocol</th>
                            <th>Identified Service</th>
                            <th>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {device.open_ports.map((p, i) => (
                            <tr key={i}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--xc-aqua)' }}>
                                {p.port}
                              </td>
                              <td>{p.protocol || 'TCP'}</td>
                              <td>{p.service || 'unknown'}</td>
                              <td>
                                <span style={{ color: 'var(--xc-teal)', fontSize: '0.75rem' }}>
                                  ● OPEN
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No listening ports verified on this host.
                      </div>
                    )}
                  </div>

                  {device?.suspicious_indicators && device.suspicious_indicators.length > 0 && (
                    <div className="glass-card">
                      <h4 style={{ fontSize: '0.96rem', fontWeight: '700', color: '#F5C451', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} />
                        <span>Suspicious Security Indicators</span>
                      </h4>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {device.suspicious_indicators.map((ind, i) => (
                          <li key={i}>{ind}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
