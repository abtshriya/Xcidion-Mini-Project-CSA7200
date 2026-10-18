import React, { useState, useEffect } from 'react';
import { FileText, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      if (outcome) params.outcome = outcome;
      const data = await api.getAuditLogs(params);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [outcome]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Security Audit Logs & Compliance
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Immutable audit record of user logins, rule updates, alert status changes, and analyst feedback.
          </p>
        </div>
        <button
          onClick={fetchLogs}
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

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Username, Action, or Resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            style={{ width: '100%', paddingLeft: '38px' }}
          />
        </div>

        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={{ minWidth: '140px' }}>
          <option value="">All Outcomes</option>
          <option value="success">Success</option>
          <option value="denied">Denied</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      {/* Logs Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--shadow-raised)',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <LoadingSpinner message="Querying security audit records..." />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit entries" message="No audit records matched your current search parameters." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>User</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                  <th style={{ padding: '12px 14px' }}>Resource Type</th>
                  <th style={{ padding: '12px 14px' }}>Resource ID</th>
                  <th style={{ padding: '12px 14px' }}>Outcome</th>
                  <th style={{ padding: '12px 14px' }}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid rgba(55, 70, 93, 0.35)', transition: 'var(--transition)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--xc-aqua)' }}>
                      {log.username}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {log.resource_type}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {log.resource_id || '-'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          backgroundColor: log.outcome === 'success' ? 'var(--sev-low-bg)' : 'var(--sev-critical-bg)',
                          color: log.outcome === 'success' ? 'var(--sev-low)' : 'var(--sev-critical)',
                          border: `1px solid ${log.outcome === 'success' ? 'var(--sev-low)' : 'var(--sev-critical)'}`
                        }}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      {log.metadata_json ? JSON.stringify(log.metadata_json) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
