import React, { useState } from 'react';
import { Search, Sparkles, RefreshCw, Radio, CheckCircle, Shield } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export const Header = ({ onDemoInjected }) => {
  const { status: wsStatus } = useWebSocket();
  const { user } = useAuth();
  const [injecting, setInjecting] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const handleInjectScenario = async (scenario) => {
    setInjecting(true);
    setShowDemoMenu(false);
    try {
      await api.generateDemoScenario(scenario);
      if (onDemoInjected) onDemoInjected();
    } catch (err) {
      console.error('Demo injection failed:', err);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'rgba(10, 15, 23, 0.85)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}
    >
      {/* Title & Tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
          XCIDION NIDS
        </div>
        <span style={{ color: 'var(--glass-border)', fontSize: '0.8rem' }}>|</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Explainable Network Intrusion Detection System
        </span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Controlled Attack Simulation Dropdown for Viva / Demo */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            disabled={injecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'rgba(114, 110, 255, 0.15)',
              border: '1px solid rgba(114, 110, 255, 0.35)',
              borderRadius: '20px',
              color: 'var(--xc-violet)',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            <Sparkles size={13} color="var(--xc-aqua)" />
            <span>{injecting ? 'Injecting Telemetry...' : 'Lab Test Scenarios'}</span>
          </button>

          {showDemoMenu && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '270px',
                backgroundColor: 'rgba(14, 21, 31, 0.95)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                boxShadow: 'var(--glass-shadow-lg)',
                zIndex: 200,
                padding: '8px 0'
              }}
            >
              <div style={{ padding: '6px 14px', fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Simulate Controlled Attack Sequences
              </div>
              {[
                { id: 'complete_campaign', name: 'Multi-stage Attack (Port Scan to Exfil)' },
                { id: 'port_scan', name: 'Horizontal Reconnaissance Scan' },
                { id: 'brute_force', name: 'SSH Auth Brute Force Flood' },
                { id: 'data_exfiltration', name: 'High-Volume Outbound Exfiltration' },
                { id: 'normal', name: 'Benign Corporate Web Flow' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleInjectScenario(item.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: '0.80rem',
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(114, 110, 255, 0.12)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Network Stream Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            backgroundColor: 'rgba(18, 27, 40, 0.6)',
            border: '1px solid var(--glass-border)',
            borderRadius: '20px',
            fontSize: '0.78rem'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: wsStatus === 'connected' ? 'var(--xc-teal)' : '#F5C451',
              boxShadow: wsStatus === 'connected' ? '0 0 8px var(--xc-teal)' : 'none'
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            Pipeline: <strong style={{ color: 'var(--text-primary)' }}>{wsStatus === 'connected' ? 'Connected' : 'Offline'}</strong>
          </span>
        </div>
      </div>
    </header>
  );
};
