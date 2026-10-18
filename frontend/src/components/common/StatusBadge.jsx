import React from 'react';

export const StatusBadge = ({ status }) => {
  const st = (status || 'unknown').toLowerCase();

  const styles = {
    new: { color: 'var(--xc-violet)', bg: 'rgba(114, 110, 255, 0.15)', border: 'var(--xc-violet)' },
    acknowledged: { color: 'var(--xc-aqua)', bg: 'rgba(89, 255, 231, 0.15)', border: 'var(--xc-aqua)' },
    investigating: { color: 'var(--sev-medium)', bg: 'var(--sev-medium-bg)', border: 'var(--sev-medium)' },
    contained: { color: '#FFA726', bg: 'rgba(255, 167, 38, 0.15)', border: '#FFA726' },
    resolved: { color: 'var(--xc-teal)', bg: 'rgba(8, 198, 172, 0.15)', border: 'var(--xc-teal)' },
    closed: { color: 'var(--text-muted)', bg: 'rgba(132, 146, 163, 0.12)', border: 'var(--border-color)' },
    online: { color: 'var(--xc-teal)', bg: 'rgba(8, 198, 172, 0.15)', border: 'var(--xc-teal)' },
    degraded: { color: 'var(--sev-medium)', bg: 'var(--sev-medium-bg)', border: 'var(--sev-medium)' },
    offline: { color: 'var(--sev-critical)', bg: 'var(--sev-critical-bg)', border: 'var(--sev-critical)' },
    active: { color: 'var(--xc-teal)', bg: 'rgba(8, 198, 172, 0.15)', border: 'var(--xc-teal)' },
    inactive: { color: 'var(--text-disabled)', bg: 'rgba(82, 97, 115, 0.15)', border: 'var(--border-color)' }
  }[st] || { color: 'var(--text-muted)', bg: 'rgba(132, 146, 163, 0.15)', border: 'var(--border-color)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '0.72rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: styles.color,
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`
      }}
    >
      {st}
    </span>
  );
};
