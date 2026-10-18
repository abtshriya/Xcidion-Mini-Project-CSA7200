import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert, Activity, AlertTriangle, GitCommit, Dna,
  TrendingUp, BarChart3, Sliders, Radio, Database,
  FileText, Settings, LogOut, ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const { status: wsStatus } = useWebSocket();

  const navItems = [
    { label: 'Overview', to: '/', icon: Activity },
    { label: 'Live Traffic', to: '/traffic', icon: Radio },
    { label: 'Alerts', to: '/alerts', icon: AlertTriangle },
    { label: 'Incidents', to: '/incidents', icon: ShieldAlert },
    { label: 'Attack DNA', to: '/attack-dna', icon: Dna },
    { label: 'Threat Trajectory', to: '/trajectory', icon: TrendingUp },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Detection Rules', to: '/rules', icon: Sliders },
    { label: 'Sensors', to: '/sensors', icon: GitCommit },
    { label: 'Datasets & Models', to: '/models', icon: Database },
    { label: 'Audit Logs', to: '/audit-logs', icon: FileText },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {/* Top Branding */}
      <div>
        <div
          style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0' : '0 18px',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--xc-violet), var(--xc-aqua))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--xc-obsidian)',
                fontWeight: '900',
                fontSize: '1rem',
                boxShadow: 'var(--glow-violet)'
              }}
            >
              X
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: '800', fontSize: '1.05rem', letterSpacing: '1px', color: 'var(--text-primary)' }}>
                  XCIDION
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--xc-aqua)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Explainable NIDS
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px'
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '10px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '8px',
                  color: isActive ? 'var(--xc-aqua)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--xc-aqua)' : '3px solid transparent',
                  boxShadow: isActive ? 'var(--shadow-raised)' : 'none',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'var(--transition)'
                })}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom User & Health Footer */}
      <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 10px' }}>
        {/* System Health Status */}
        {!collapsed && (
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '6px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Live Stream</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: wsStatus === 'connected' ? 'var(--xc-teal)' : 'var(--sev-high)',
                  boxShadow: wsStatus === 'connected' ? '0 0 8px var(--xc-teal)' : 'none'
                }}
              />
              <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: '500' }}>
                {wsStatus}
              </span>
            </div>
          </div>
        )}

        {/* User Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: '6px 4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--xc-aqua)'
              }}
            >
              <User size={16} />
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.username || 'Analyst'}
                </div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {user?.role || 'analyst'}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'var(--transition)'
            }}
            title="Log out of XCIDION"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
