import React, { useState, useEffect } from 'react';
import {
  Sliders, Search, RefreshCw, CheckCircle2, XCircle,
  Play, Edit3, X, Save, AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DetectionRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState(null);
  const [testingRule, setTestingRule] = useState(null);
  const [testPayload, setTestPayload] = useState('{\n  "source_port": 50123,\n  "destination_port": 22,\n  "protocol": "TCP",\n  "normalised_payload": {\n    "duration": 0.5,\n    "orig_bytes": 1200,\n    "conn_frequency_window": 12,\n    "dst_port_diversity": 1\n  }\n}');
  const [testResult, setTestResult] = useState(null);
  const [runningTest, setRunningTest] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await api.getRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (rule) => {
    try {
      const updated = await api.updateRule(rule.id, { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    } catch (err) {
      alert(`Failed to toggle rule: ${err.message}`);
    }
  };

  const handleRunTest = async (e) => {
    e.preventDefault();
    if (!testingRule) return;
    setRunningTest(true);
    setTestResult(null);

    try {
      const parsed = JSON.parse(testPayload);
      const res = await api.testRule(testingRule.id, parsed);
      setTestResult(res);
    } catch (err) {
      setTestResult({ error: `JSON Parse or Test Error: ${err.message}` });
    } finally {
      setRunningTest(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Detection Rules Engine
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Configurable heuristic threshold rules and signature evaluators.
          </p>
        </div>
        <button
          onClick={fetchRules}
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

      {loading ? (
        <LoadingSpinner message="Loading configured detection rules..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '20px',
                boxShadow: 'var(--shadow-raised)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.80rem', color: 'var(--xc-aqua)', fontWeight: '700', fontFamily: 'monospace' }}>
                    {rule.id}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SeverityBadge severity={rule.severity} />
                    <button
                      onClick={() => handleToggle(rule)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: rule.enabled ? 'rgba(8, 198, 172, 0.15)' : 'rgba(82, 97, 115, 0.2)',
                        border: `1px solid ${rule.enabled ? 'var(--xc-teal)' : 'var(--border-color)'}`,
                        color: rule.enabled ? 'var(--xc-teal)' : 'var(--text-disabled)',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {rule.name}
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                  {rule.description}
                </p>

                <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Configuration Thresholds:</span>
                  <pre style={{ marginTop: '4px', fontFamily: 'monospace', color: 'var(--xc-aqua)', fontSize: '0.74rem' }}>
                    {JSON.stringify(rule.configuration, null, 2)}
                  </pre>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Category: <strong style={{ color: 'var(--text-primary)' }}>{rule.category}</strong>
                </span>
                <button
                  onClick={() => {
                    setTestingRule(rule);
                    setTestResult(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--xc-aqua)',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}
                >
                  <Play size={13} />
                  <span>Test Rule</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Tester Modal */}
      {testingRule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 12, 18, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Test Rule: {testingRule.name}
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--xc-aqua)', fontFamily: 'monospace' }}>
                  {testingRule.id}
                </span>
              </div>
              <button onClick={() => setTestingRule(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Test Flow Event Payload (JSON):
              </label>
              <textarea
                rows={8}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.80rem',
                  color: 'var(--xc-aqua)',
                  padding: '10px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={handleRunTest}
                disabled={runningTest}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--xc-violet)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '0.84rem'
                }}
              >
                {runningTest ? 'Evaluating...' : 'Run Safe Evaluation'}
              </button>
            </div>

            {testResult && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '6px',
                  backgroundColor: testResult.matched ? 'var(--sev-high-bg)' : 'var(--bg-elevated)',
                  border: `1px solid ${testResult.matched ? 'var(--sev-high)' : 'var(--border-color)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {testResult.matched ? (
                    <CheckCircle2 size={16} color="var(--sev-high)" />
                  ) : (
                    <XCircle size={16} color="var(--text-muted)" />
                  )}
                  <strong style={{ fontSize: '0.86rem', color: testResult.matched ? 'var(--sev-high)' : 'var(--text-primary)' }}>
                    {testResult.matched ? 'RULE MATCH TRIGGERED' : 'No Match (Thresholds Not Exceeded)'}
                  </strong>
                </div>
                {testResult.evidence && (
                  <pre style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '6px' }}>
                    {JSON.stringify(testResult.evidence, null, 2)}
                  </pre>
                )}
                {testResult.error && (
                  <div style={{ color: 'var(--sev-critical)', fontSize: '0.80rem' }}>
                    {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
