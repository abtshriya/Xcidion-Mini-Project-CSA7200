import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Shield, AlertTriangle, ArrowRight,
  CheckCircle, ThumbsUp, ThumbsDown, HelpCircle, RefreshCw, Info
} from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

const ALL_STAGES = [
  'Reconnaissance',
  'Initial Access',
  'Execution',
  'Credential Access',
  'Lateral Movement',
  'Command and Control',
  'Exfiltration',
  'Impact'
];

export const ThreatTrajectoryPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [trajectory, setTrajectory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const incs = await api.getIncidents({ limit: 20 });
        setIncidents(incs);
        if (incs.length > 0 && !selectedIncidentId) {
          setSelectedIncidentId(incs[0].id);
        }
      } catch (err) {
        console.error('Failed to load incidents:', err);
      }
    };
    fetchIncidents();
  }, []);

  const fetchTrajectory = async () => {
    if (!selectedIncidentId) return;
    setLoading(true);
    try {
      const data = await api.getIncidentTrajectory(selectedIncidentId);
      setTrajectory(data);
    } catch (err) {
      console.error('Failed to load trajectory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrajectory();
  }, [selectedIncidentId]);

  const handleFeedback = async (feedbackType) => {
    setSubmittingFeedback(true);
    setFeedbackSuccess(null);
    try {
      await api.submitFeedback(selectedIncidentId, feedbackType);
      setTrajectory(prev => ({ ...prev, feedback: feedbackType }));
      setFeedbackSuccess(`Feedback '${feedbackType}' recorded.`);
    } catch (err) {
      alert(`Feedback submission failed: ${err.message}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const isInsufficient = trajectory?.evaluation_status === 'insufficient_evidence';
  const currentStage = trajectory?.current_stage || 'Unknown';
  const currentIdx = ALL_STAGES.indexOf(currentStage);

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
              <TrendingUp size={18} />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              Threat Trajectory — Attack-Stage Estimation
            </h1>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-stage sequence tracking, current kill-chain position estimation, and candidate next stage projections.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>Target Incident:</span>
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
        <LoadingSpinner message="Calculating sequence progression and Markov transition vectors..." />
      ) : !trajectory ? (
        <EmptyState title="No trajectory available" message="Select a valid incident to evaluate its threat trajectory." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Attack Stage Progression Ribbon */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '24px',
              boxShadow: 'var(--shadow-raised)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Enterprise Attack Stage Pipeline
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Model Version: <strong>{trajectory.model_version}</strong> | Evaluated at: {new Date(trajectory.prediction_timestamp).toLocaleTimeString()}
                </span>
              </div>

              {isInsufficient ? (
                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--sev-medium-bg)',
                    color: 'var(--sev-medium)',
                    fontSize: '0.76rem',
                    fontWeight: '700'
                  }}
                >
                  Insufficient Evidence
                </div>
              ) : (
                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(114, 110, 255, 0.15)',
                    border: '1px solid var(--xc-violet)',
                    color: 'var(--xc-violet)',
                    fontSize: '0.76rem',
                    fontWeight: '700'
                  }}
                >
                  Confidence: {Math.round(trajectory.confidence * 100)}%
                </div>
              )}
            </div>

            {/* Stage Steps Visual */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '8px',
                position: 'relative'
              }}
            >
              {ALL_STAGES.map((stage, idx) => {
                const isPassed = !isInsufficient && currentIdx >= 0 && idx < currentIdx;
                const isCurrent = !isInsufficient && idx === currentIdx;
                const isPredicted = !isInsufficient && stage === trajectory.predicted_stage;

                let border = 'var(--border-color)';
                let bg = 'var(--bg-elevated)';
                let textColor = 'var(--text-disabled)';

                if (isCurrent) {
                  border = 'var(--sev-high)';
                  bg = 'var(--sev-high-bg)';
                  textColor = 'var(--sev-high)';
                } else if (isPredicted) {
                  border = 'var(--xc-aqua)';
                  bg = 'rgba(89, 255, 231, 0.12)';
                  textColor = 'var(--xc-aqua)';
                } else if (isPassed) {
                  border = 'var(--xc-violet)';
                  bg = 'rgba(114, 110, 255, 0.10)';
                  textColor = 'var(--xc-violet)';
                }

                return (
                  <div
                    key={stage}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${border}`,
                      backgroundColor: bg,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Step 0{idx + 1}
                    </div>
                    <div style={{ fontSize: '0.80rem', fontWeight: '700', color: textColor }}>
                      {stage}
                    </div>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: '700' }}>
                      {isCurrent ? 'Current' : isPredicted ? 'Next Candidate' : isPassed ? 'Observed' : 'Pending'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence & Next Stage Projections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            {/* Supporting Evidence Panel */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '20px',
                boxShadow: 'var(--shadow-raised)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} color="var(--xc-aqua)" />
                <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Sequence Evidence Narrative
                </h3>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {trajectory.evidence_summary}
              </div>

              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Observed Stage Indicators ({trajectory.supporting_events?.length || 0}):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {(trajectory.supporting_events || []).map((evt, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{evt.title}</strong>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          Mapped Category: <span style={{ color: 'var(--xc-aqua)' }}>{evt.category}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(114, 110, 255, 0.2)',
                          color: 'var(--xc-violet)',
                          fontWeight: '600'
                        }}
                      >
                        {evt.mapped_stage}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Candidate Next Stages & Analyst Feedback */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '20px',
                boxShadow: 'var(--shadow-raised)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Ranked Next Potential Stages
                </h3>

                {isInsufficient ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Insufficient event evidence to compute reliable transition probabilities.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(trajectory.ranked_candidates || []).map((cand, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 14px',
                          backgroundColor: 'var(--bg-elevated)',
                          borderRadius: '6px',
                          border: idx === 0 ? '1px solid var(--xc-aqua)' : '1px solid transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: '700', color: idx === 0 ? 'var(--xc-aqua)' : 'var(--text-primary)' }}>
                            {cand.stage}
                          </span>
                          <span style={{ fontSize: '0.80rem', fontWeight: '700', color: 'var(--xc-violet)' }}>
                            {Math.round(cand.probability * 100)}% Prob
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Indicators: {cand.evidence_indicators.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Analyst Feedback Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Analyst Trajectory Evaluation:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { type: 'useful', label: 'Useful', icon: ThumbsUp, color: 'var(--xc-teal)' },
                    { type: 'incorrect', label: 'Incorrect', icon: ThumbsDown, color: 'var(--sev-critical)' },
                    { type: 'inconclusive', label: 'Inconclusive', icon: HelpCircle, color: 'var(--sev-medium)' }
                  ].map((fb) => {
                    const Icon = fb.icon;
                    const isSelected = trajectory.feedback === fb.type;
                    return (
                      <button
                        key={fb.type}
                        disabled={submittingFeedback}
                        onClick={() => handleFeedback(fb.type)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--bg-elevated)',
                          border: `1.5px solid ${isSelected ? fb.color : 'var(--border-color)'}`,
                          color: isSelected ? fb.color : 'var(--text-secondary)',
                          fontSize: '0.76rem',
                          fontWeight: '600'
                        }}
                      >
                        <Icon size={14} />
                        <span>{fb.label}</span>
                      </button>
                    );
                  })}
                </div>
                {feedbackSuccess && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--xc-teal)', marginTop: '8px' }}>
                    {feedbackSuccess}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
