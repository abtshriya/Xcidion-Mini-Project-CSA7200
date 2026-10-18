import React from 'react';
import { Database } from 'lucide-react';

export const EmptyState = ({ title = 'No data available', message = 'No records found matching current criteria.', icon: Icon = Database }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border-color)',
      color: 'var(--text-muted)',
      margin: '20px 0'
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'var(--bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        color: 'var(--color-primary)'
      }}>
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.85rem', maxWidth: 400, margin: 0 }}>
        {message}
      </p>
    </div>
  );
};

export default EmptyState;
