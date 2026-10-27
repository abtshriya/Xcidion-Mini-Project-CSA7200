import React, { useState, useEffect } from 'react';
import {
  X, ShieldAlert, Cpu, AlertTriangle, Activity, Dna,
  TrendingUp, CheckCircle2, HelpCircle, Network, ArrowRight,
  Shield, Server, Radio, FileText, Lock, Info
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
      case 'critical': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 12, 18, 0.88)',
        backdropFilter: 'blur(6px)',
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
          backgroundColor: '#0F1520',
          border: '1px solid #243144',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#121927'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                backgroundColor: '#1A2333',
                border: '1px solid #28364C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Server size={18} color="#94A3B8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {ipAddress}
                </h2>
                {device && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${getRiskColor(device.risk_level)}15`,
                      color: getRiskColor(device.risk_level),
                      border: `1px solid ${getRiskColor(device.risk_level)}35`,
                      fontSize: '0.68rem',
                      padding: '2px 7px'
                    }}
                  >
                    Risk: {device.risk_level?.toUpperCase()}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  ● Active Host
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Hostname: <strong>{device?.hostname || 'Unknown'}</strong> | Discovered via {device?.scan_source || 'network telemetry'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '4px', height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close dossier"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1E293B',
            backgroundColor: '#0D131D',
            padding: '0 16px',
            gap: '2px'
          }}
        >
          {[
            { id: 'timeline', label: 'Activity Timeline', icon: Activity, count: timeline.length },
            { id: 'trajectory', label: 'Threat Trajectory & ATT&CK', icon: TrendingUp },
            { id: 'alerts', label: 'Associated Alerts', icon: AlertTriangle, count: alerts.length },
            { id: 'profile', label: 'Port Audit & Fingerprint', icon: Cpu, count: device?.open_ports?.length }
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
                  padding: '11px 14px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #4F46E5' : '2px solid transparent',
                  background: 'none',
                  color: isActive ? '#F1F5F9' : '#8291A5',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
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
                      backgroundColor: isActive ? '#282F48' : '#1A2230',
                      color: isActive ? '#C7D2FE' : '#8291A5'
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
              {/* TAB 1: OBSERVED & INFERRED TIMELINE */}
              {activeTab === 'timeline' && (
                <div>
                  {/* Delineation Legend */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#121824',
                      borderRadius: '6px',
                      border: '1px solid #1E293B',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Evidence Standard:</strong> Confirmed telemetry logs are strictly distinguished from correlated inferences.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.74rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                        <span style={{ color: '#10B981', fontWeight: '600' }}>Confirmed ({data?.confirmed_events_count || 0})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', border: '1px dashed #F59E0B', backgroundColor: 'transparent' }} />
                        <span style={{ color: '#F59E0B', fontWeight: '600' }}>Inferred ({data?.inferred_relations_count || 0})</span>
                      </div>
                    </div>
                  </div>

                  {timeline.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No events recorded for this host.
                    </div>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '1px solid #233044' }}>
                      {timeline.map((evt, idx) => {
                        const isConfirmed = evt.is_confirmed;
                        return (
                          <div
                            key={evt.id || idx}
                            style={{
                              position: 'relative',
                              marginBottom: '16px',
                              padding: '14px',
                              borderRadius: '6px',
                              backgroundColor: isConfirmed ? '#121926' : '#101622',
                              border: isConfirmed ? '1px solid #22324A' : '1px dashed #343E4F'
                            }}
                          >
                            {/* Timeline Node Marker */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '-30px',
                                top: '16px',
                                width: '10px',
                                height: '10px',
                                borderRadius: isConfirmed ? '50%' : '2px',
                                backgroundColor: isConfirmed ? '#10B981' : '#0B0F17',
                                border: isConfirmed ? '2px solid #0B0F17' : '1px dashed #F59E0B'
                              }}
                            />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '0.66rem',
                                    fontWeight: '700',
                                    padding: '2px 7px',
                                    borderRadius: '3px',
                                    backgroundColor: isConfirmed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                    color: isConfirmed ? '#10B981' : '#F59E0B',
                                    letterSpacing: '0.4px'
                                  }}
                                >
                                  {isConfirmed ? 'OBSERVED EVENT' : 'INFERRED RELATION'}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {evt.timestamp}
                                </span>
                              </div>

                              <span
                                style={{
                                  fontSize: '0.70rem',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: '#1E2838',
                                  color: '#94A3B8',
                                  fontFamily: 'var(--font-mono)'
                                }}
                              >
                                {evt.detection_source}
                              </span>
                            </div>

                            <h4 style={{ fontSize: '0.90rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                              {evt.title}
                            </h4>
                            <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                              {evt.description}
                            </p>

                            <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              <span>Protocol: <strong style={{ color: 'var(--text-primary)' }}>{evt.protocol || 'N/A'}</strong></span>
                              {evt.port && <span>Port: <strong style={{ color: 'var(--text-primary)' }}>{evt.port}</strong></span>}
                              <span>Evidence: <strong style={{ color: 'var(--text-primary)' }}>{evt.evidence_type}</strong></span>
                              <span>Confidence: <strong style={{ color: isConfirmed ? '#10B981' : '#F59E0B' }}>{(evt.confidence_score * 100).toFixed(0)}%</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: THREAT TRAJECTORY */}
              {activeTab === 'trajectory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Methodology Callout */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#131A26',
                      border: '1px solid #233146',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <Info size={16} color="#818CF8" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                      <strong style={{ color: '#C7D2FE' }}>ATT&CK Stage Trajectory Model:</strong> Projections calculate statistical transitions across MITRE ATT&CK tactics based on observed preceding event sequences.
                    </div>
                  </div>

                  {/* Current Observed Threat Stage */}
                  <div className="glass-card" style={{ padding: '16px' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      CURRENT OBSERVED STAGE
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                      <div
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: '700',
                          color: '#F1F5F9'
                        }}
                      >
                        {trajectory.current_threat_stage || 'Baseline'}
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.68rem',
                          padding: '2px 7px'
                        }}
                      >
                        Telemetry Verified
                      </span>
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Observed Sequence: {trajectory.observed_stages?.join(' -> ') || 'None'}
                    </div>
                  </div>

                  {/* Projected Next Attacker Stages */}
                  <div className="glass-card" style={{ padding: '16px' }}>
                    <span style={{ fontSize: '0.70rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      STATISTICAL TRAJECTORY PROJECTIONS
                    </span>

                    {trajectory.trajectory_predictions && trajectory.trajectory_predictions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        {trajectory.trajectory_predictions.map((pred, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '5px',
                              backgroundColor: '#111724',
                              border: '1px solid #1E2B3E'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <ArrowRight size={14} color="#818CF8" />
                                <span style={{ fontWeight: '600', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                                  {pred.stage}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.76rem',
                                  fontWeight: '700',
                                  color: '#818CF8',
                                  fontFamily: 'var(--font-mono)'
                                }}
                              >
                                {pred.confidence_percentage}% Probability
                              </span>
                            </div>

                            {/* Probability Progress Bar */}
                            <div style={{ height: '4px', backgroundColor: '#1E2838', borderRadius: '2px', overflow: 'hidden', margin: '6px 0' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pred.confidence_percentage}%`,
                                  backgroundColor: '#4F46E5',
                                  borderRadius: '2px'
                                }}
                              />
                            </div>

                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                              Indicators: {pred.supporting_reasons?.join('; ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
                        No hostile trajectory progression detected. Host behavior matches normal baseline.
                      </div>
                    )}
                  </div>

                  {/* Remediation & Countermeasures */}
                  {trajectory.recommended_action && (
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#101B24',
                        border: '1px solid #1A3732',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#10B981', fontWeight: '600', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <Shield size={14} />
                        <span>Recommended Defensive Mitigations</span>
                      </div>
                      <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {trajectory.recommended_action}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASSOCIATED ALERTS */}
              {activeTab === 'alerts' && (
                <div>
                  <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
                    Associated Detection Alerts ({alerts.length})
                  </h3>

                  {alerts.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No active intrusion alerts linked to this host.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {alerts.map((al) => (
                        <div
                          key={al.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '6px',
                            backgroundColor: '#111724',
                            border: `1px solid ${getRiskColor(al.severity)}30`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: `${getRiskColor(al.severity)}15`,
                                  color: getRiskColor(al.severity),
                                  border: `1px solid ${getRiskColor(al.severity)}35`,
                                  fontSize: '0.66rem',
                                  padding: '1px 6px'
                                }}
                              >
                                {al.severity?.toUpperCase()}
                              </span>
                              <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                {al.title}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {al.created_at}
                            </span>
                          </div>

                          <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {al.description}
                          </p>

                          <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="glass-card" style={{ padding: '18px' }}>
                    <h4 style={{ fontSize: '0.90rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                      Listening Ports & Fingerprinted Services
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
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#38BDF8' }}>
                                {p.port}
                              </td>
                              <td>{p.protocol || 'TCP'}</td>
                              <td>{p.service || 'unknown'}</td>
                              <td>
                                <span style={{ color: '#10B981', fontSize: '0.72rem', fontWeight: '600' }}>
                                  ● OPEN
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.80rem' }}>
                        No listening ports verified on this host.
                      </div>
                    )}
                  </div>

                  {device?.suspicious_indicators && device.suspicious_indicators.length > 0 && (
                    <div className="glass-card" style={{ padding: '18px' }}>
                      <h4 style={{ fontSize: '0.90rem', fontWeight: '700', color: '#F59E0B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={15} />
                        <span>Security Risk Indicators</span>
                      </h4>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
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
