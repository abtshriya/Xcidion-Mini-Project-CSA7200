import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CircularLogo } from '../components/common/CircularLogo';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@Xcidion2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userData = await login(username, password);
      if (userData?.role === 'viewer') {
        navigate('/user');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        padding: '24px',
        position: 'relative'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          boxShadow: 'var(--glass-shadow-lg)',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        {/* Branding with Circular Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <CircularLogo size={68} style={{ margin: '0 auto 14px auto', display: 'flex' }} />
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.3px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            XCIDION
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>
            Network Intrusion Detection & Threat Telemetry System
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '3px 10px', borderRadius: '4px', backgroundColor: '#1A2232', border: '1px solid #28354A' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Role-Based Access Control</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#F87171',
              fontSize: '0.82rem',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  backgroundColor: '#0F1520',
                  border: '1px solid #243042',
                  fontSize: '0.84rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '38px',
                  backgroundColor: '#0F1520',
                  border: '1px solid #243042',
                  fontSize: '0.84rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              marginTop: '4px',
              padding: '11px',
              justifyContent: 'center',
              fontSize: '0.86rem',
              fontWeight: '600'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
            Demo Profiles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'Admin@Xcidion2026')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '5px',
                backgroundColor: username === 'admin' ? '#182030' : '#101622',
                border: username === 'admin' ? '1px solid #4F46E5' : '1px solid #1E2838',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontSize: '0.80rem', fontWeight: '600' }}>Administrator</div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  Scanner, Triage, Trajectory, Rules, Sensor probes
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#818CF8', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('viewer', 'Viewer@Xcidion2026')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '5px',
                backgroundColor: username === 'viewer' ? '#182030' : '#101622',
                border: username === 'viewer' ? '1px solid #0284C7' : '1px solid #1E2838',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ fontSize: '0.80rem', fontWeight: '600' }}>Standard User</div>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  Live traffic view, threat scanner, posture summary
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>viewer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
