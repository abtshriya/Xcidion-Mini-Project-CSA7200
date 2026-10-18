import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('analyst');
  const [password, setPassword] = useState('Analyst@Xcidion2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
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
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '36px 32px'
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px auto',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--xc-violet), var(--xc-aqua))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-violet)'
            }}
          >
            <Shield size={32} color="var(--xc-obsidian)" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            XCIDION
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--xc-aqua)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Explainable Network Intrusion Detection
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            "From Raw Network Traffic to an Explainable Attack Story."
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
              backgroundColor: 'var(--sev-critical-bg)',
              border: '1px solid var(--sev-critical)',
              color: 'var(--sev-critical)',
              fontSize: '0.84rem',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
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
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'var(--xc-violet)',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '0.92rem',
              boxShadow: 'var(--glow-violet)',
              transition: 'var(--transition)'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations'}
          </button>
        </form>

        {/* Evaluation Credentials Shortcut */}
        <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Evaluation Accounts:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleQuickFill('analyst', 'Analyst@Xcidion2026')}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--xc-aqua)'
              }}
            >
              Analyst
            </button>
            <button
              onClick={() => handleQuickFill('admin', 'Admin@Xcidion2026')}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--xc-violet)'
              }}
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickFill('viewer', 'Viewer@Xcidion2026')}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)'
              }}
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
