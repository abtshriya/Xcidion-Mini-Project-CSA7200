import React from 'react';

export const LoadingSpinner = ({ message = 'Loading records...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '14px' }}>
    <div
      style={{
        width: '36px',
        height: '36px',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--xc-aqua)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
    />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{message}</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export const EmptyState = ({ title = 'No data available', message = 'No security events or alerts matched current query.', action }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      backgroundColor: 'var(--bg-card)',
      borderRadius: 'var(--border-radius)',
      border: '1px dashed var(--border-color)',
      textAlign: 'center',
      gap: '10px'
    }}
  >
    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '4px' }}>
      🔍
    </div>
    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</h3>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: '1.4' }}>{message}</p>
    {action && <div style={{ marginTop: '12px' }}>{action}</div>}
  </div>
);
