import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, LogOut, ChevronDown } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { CircularLogo } from '../common/CircularLogo';

export const Header = ({ onDemoInjected }) => {
  const { status: wsStatus } = useWebSocket();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [injecting, setInjecting] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const isAdminOrAnalyst = user?.role === 'admin' || user?.role === 'analyst';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
        height: '54px',
        backgroundColor: '#0F141E',
        borderBottom: '1px solid #1E2736',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      {/* Left: Branding & Role Specific Dashboard Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CircularLogo size={30} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '0.98rem', letterSpacing: '0.5px', color: '#F1F5F9' }}>
              XCIDION
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748B', borderLeft: '1px solid #232E40', paddingLeft: '8px' }}>
              Network Intrusion Detection
            </span>
          </div>
        </div>

        {/* Dedicated Role Badge */}
        <span
          className="badge"
          style={{
            backgroundColor: isAdminOrAnalyst ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: isAdminOrAnalyst ? '#818CF8' : '#34D399',
            border: `1px solid ${isAdminOrAnalyst ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            padding: '2px 8px',
            fontSize: '0.68rem',
            letterSpacing: '0.3px'
          }}
        >
          {isAdminOrAnalyst ? 'ADMIN CONSOLE' : 'VIEWER PORTAL'}
        </span>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Controlled Attack Simulation Dropdown (Admin / Analyst only) */}
        {isAdminOrAnalyst && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              disabled={injecting}
              className="btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '5px 11px',
                height: '32px'
              }}
            >
              <Play size={12} fill="currentColor" />
              <span>{injecting ? 'Injecting Traffic...' : 'Simulate Traffic'}</span>
              <ChevronDown size={12} />
            </button>

            {showDemoMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '38px',
                  right: 0,
                  width: '260px',
                  backgroundColor: '#131A26',
                  border: '1px solid #263346',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  zIndex: 200,
                  padding: '6px 0'
                }}
              >
                <div style={{ padding: '6px 12px', fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>
                  Inject Test Scenario Telemetry
                </div>
                {[
                  { id: 'complete_campaign', name: 'Multi-stage Attack Campaign' },
                  { id: 'port_scan', name: 'Horizontal Reconnaissance Scan' },
                  { id: 'brute_force', name: 'SSH Credential Brute Force' },
                  { id: 'data_exfiltration', name: 'High-Volume Data Exfiltration' },
                  { id: 'normal', name: 'Benign Enterprise Web Flow' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleInjectScenario(item.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 12px',
                      fontSize: '0.80rem',
                      color: '#E2E8F0',
                      backgroundColor: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1C2638'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Network Stream Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: '#131A26',
            border: '1px solid #202B3C',
            borderRadius: '4px',
            fontSize: '0.74rem',
            height: '32px'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: wsStatus === 'connected' ? '#10B981' : '#F59E0B'
            }}
          />
          <span style={{ color: '#94A3B8' }}>
            Telemetry: <strong style={{ color: '#F1F5F9' }}>{wsStatus === 'connected' ? 'Live' : 'Offline'}</strong>
          </span>
        </div>

        {/* User Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '3px 10px',
            backgroundColor: '#131A26',
            border: '1px solid #202B3C',
            borderRadius: '4px',
            height: '32px'
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: isAdminOrAnalyst ? '#312E81' : '#064E3B',
              color: isAdminOrAnalyst ? '#C7D2FE' : '#A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.68rem',
              flexShrink: 0
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span style={{ fontSize: '0.80rem', fontWeight: '500', color: '#F1F5F9' }}>
            {user?.username}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn-secondary"
          style={{
            fontSize: '0.76rem',
            padding: '5px 10px',
            height: '32px',
            color: '#F87171',
            borderColor: 'rgba(239, 68, 68, 0.25)'
          }}
          title="Sign out of XCIDION"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
