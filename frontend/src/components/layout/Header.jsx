import React, { useState } from 'react';
import { Search, Bell, Sparkles, Wifi, Shield, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { api } from '../../api/client';

export const Header = ({ onDemoInjected }) => {
  const { status: wsStatus } = useWebSocket();
  const [injecting, setInjecting] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        backgroundColor: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}
    >
      {/* Global Search */}
      <div style={{ position: 'relative', width: '380px' }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="Global search by IP, Alert ID, Rule, or Incident..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '38px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            fontSize: '0.84rem'
          }}
        />
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Demonstration Mode Controller */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            disabled={injecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: 'rgba(114, 110, 255, 0.15)',
              border: '1px solid var(--xc-violet)',
              borderRadius: '20px',
              color: 'var(--xc-violet)',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
          >
            <Sparkles size={14} />
            <span>{injecting ? 'Injecting Attack...' : 'Demo Scenarios'}</span>
          </button>

          {showDemoMenu && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '260px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-elevated)',
                zIndex: 200,
                padding: '8px 0'
              }}
            >
              <div style={{ padding: '6px 14px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Simulate Controlled Attacks
              </div>
              {[
                { id: 'complete_campaign', name: 'Multi-stage Attack (Full Story)' },
                { id: 'port_scan', name: 'Horizontal Port Scan' },
                { id: 'brute_force', name: 'SSH/RDP Auth Brute Force' },
                { id: 'data_exfiltration', name: 'Outbound Exfiltration Spike' },
                { id: 'normal', name: 'Benign HTTP/DNS Flow' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleInjectScenario(item.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-card)'}
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
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            fontSize: '0.78rem'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: wsStatus === 'connected' ? 'var(--xc-teal)' : 'var(--sev-high)',
              boxShadow: wsStatus === 'connected' ? '0 0 8px var(--xc-teal)' : 'none'
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            Engine: <strong style={{ color: 'var(--text-primary)' }}>Active</strong>
          </span>
        </div>
      </div>
    </header>
  );
};
