import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Activity, AlertTriangle, Radio, Server,
  TrendingUp, Dna, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Terminal, Network, Eye, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const { status: wsStatus } = useWebSocket();
  const navigate = useNavigate();

  const isAdminOrAnalyst = user?.role === 'admin' || user?.role === 'analyst';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'rgba(10, 15, 23, 0.95)',
        backdropFilter: 'var(--glass-blur)',
        borderRight: '1px solid var(--glass-border)',
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
            borderBottom: '1px solid var(--glass-border)'
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
                boxShadow: '0 4px 12px rgba(114, 110, 255, 0.3)'
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
        <nav style={{ padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {!collapsed && (
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              DASHBOARD SELECTION
            </div>
          )}

          {isAdminOrAnalyst ? (
            <>
              {/* Admin Dashboard */}
              <NavLink
                to="/admin"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '10px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '6px',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(114, 110, 255, 0.18)' : 'transparent',
                  border: isActive ? '1px solid var(--glass-border-focus)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? '700' : '500',
                  transition: 'var(--transition)'
                })}
                title={collapsed ? 'Admin Dashboard' : undefined}
              >
                <ShieldAlert size={18} color="var(--xc-violet)" />
                {!collapsed && <span>Admin Dashboard</span>}
              </NavLink>

              {/* User Dashboard Preview */}
              <NavLink
                to="/user"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '10px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '6px',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(8, 198, 172, 0.18)' : 'transparent',
                  border: isActive ? '1px solid var(--xc-teal)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? '700' : '500',
                  transition: 'var(--transition)'
                })}
                title={collapsed ? 'User Dashboard' : undefined}
              >
                <Eye size={18} color="var(--xc-teal)" />
                {!collapsed && <span>User Dashboard</span>}
              </NavLink>
            </>
          ) : (
            /* User Dashboard for standard users */
            <NavLink
              to="/user"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '10px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '6px',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(8, 198, 172, 0.18)' : 'transparent',
                border: isActive ? '1px solid var(--xc-teal)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '0.86rem',
                fontWeight: isActive ? '700' : '500',
                transition: 'var(--transition)'
              })}
              title={collapsed ? 'User Dashboard' : undefined}
            >
              <Eye size={18} color="var(--xc-teal)" />
              {!collapsed && <span>User Dashboard</span>}
            </NavLink>
          )}
        </nav>
      </div>

      {/* Bottom User & Health Footer */}
      <div style={{ borderTop: '1px solid var(--glass-border)', padding: '14px 10px' }}>
        {!collapsed && (
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'rgba(18, 27, 40, 0.6)',
              border: '1px solid var(--glass-border-subtle)',
              borderRadius: '6px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Telemetry Pipeline</span>
            <span style={{ color: wsStatus === 'connected' ? 'var(--xc-teal)' : '#F5C451', fontWeight: '600' }}>
              ● {wsStatus === 'connected' ? 'Active' : 'Offline'}
            </span>
          </div>
        )}

        {/* User Card & Logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '8px'
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(114, 110, 255, 0.2)',
                  border: '1px solid var(--xc-violet)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--xc-violet)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  flexShrink: 0
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.username}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--xc-aqua)', textTransform: 'uppercase' }}>
                  {user?.role}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px'
            }}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
