import React from 'react';

export const StatusBadge = ({ status }) => {
  const st = (status || 'unknown').toLowerCase();

  const styles = {
    new: { color: '#818CF8', bg: 'rgba(79, 70, 229, 0.12)', border: 'rgba(79, 70, 229, 0.3)' },
    acknowledged: { color: '#38BDF8', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.3)' },
    investigating: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    contained: { color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)' },
    resolved: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    closed: { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.2)' },
    online: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    degraded: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
    offline: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
    active: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    inactive: { color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.2)' }
  }[st] || { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', border: '#222E42' };

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
