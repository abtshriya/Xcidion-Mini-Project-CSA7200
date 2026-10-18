import React from 'react';

export const SeverityBadge = ({ severity }) => {
  const sev = (severity || 'low').toLowerCase();

  const styles = {
    critical: { color: 'var(--sev-critical)', bg: 'var(--sev-critical-bg)', border: 'var(--sev-critical)' },
    high: { color: 'var(--sev-high)', bg: 'var(--sev-high-bg)', border: 'var(--sev-high)' },
    medium: { color: 'var(--sev-medium)', bg: 'var(--sev-medium-bg)', border: 'var(--sev-medium)' },
    low: { color: 'var(--sev-low)', bg: 'var(--sev-low-bg)', border: 'var(--sev-low)' }
  }[sev] || { color: 'var(--text-muted)', bg: 'rgba(132, 146, 163, 0.15)', border: 'var(--border-color)' };

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
      {sev}
    </span>
  );
};
