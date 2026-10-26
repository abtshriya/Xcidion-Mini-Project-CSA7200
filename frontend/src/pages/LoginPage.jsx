import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
          maxWidth: '460px',
          padding: '36px 32px',
          boxShadow: 'var(--glass-shadow-lg)'
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              margin: '0 auto 16px auto',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--xc-violet), var(--xc-aqua))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(114, 110, 255, 0.35)'
            }}
          >
            <Shield size={30} color="var(--xc-obsidian)" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            XCIDION
          </h1>
          <p style={{ fontSize: '0.80rem', color: 'var(--xc-aqua)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Explainable Network Intrusion Detection System
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Two Operational Dashboards: Admin Operations & User Monitoring
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 77, 103, 0.15)',
              border: '1px solid #FF4D67',
              color: '#FF4D67',
              fontSize: '0.84rem',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={{ width: '100%', paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', paddingLeft: '38px', paddingRight: '38px' }}
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
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              marginTop: '6px',
              padding: '12px',
              justifyContent: 'center',
              fontSize: '0.92rem'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations'}
          </button>
        </form>

        {/* Evaluation Accounts Quick Select */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quick Demo Accounts:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'Admin@Xcidion2026')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(114, 110, 255, 0.1)',
                border: '1px solid rgba(114, 110, 255, 0.3)',
                color: 'var(--xc-violet)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.82rem' }}>Administrator</strong>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Admin Dashboard (Full control, scanning, rules)</div>
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--xc-aqua)', fontFamily: 'var(--font-mono)' }}>admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('analyst', 'Analyst@Xcidion2026')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(89, 255, 231, 0.08)',
                border: '1px solid rgba(89, 255, 231, 0.25)',
                color: 'var(--xc-aqua)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.82rem' }}>Security Analyst</strong>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Admin Dashboard (Device investigation, alert triage)</div>
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--xc-teal)', fontFamily: 'var(--font-mono)' }}>analyst</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('viewer', 'Viewer@Xcidion2026')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(8, 198, 172, 0.08)',
                border: '1px solid rgba(8, 198, 172, 0.25)',
                color: 'var(--xc-teal)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <strong style={{ fontSize: '0.82rem' }}>Standard User</strong>
                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>User Dashboard (Basic monitoring, device status, reports)</div>
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>viewer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
