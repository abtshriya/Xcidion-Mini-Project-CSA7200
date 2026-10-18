import React, { useState, useEffect } from 'react';
import {
  Settings, Key, Shield, User, Database, CheckCircle2,
  AlertTriangle, Users, Plus, X, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const SettingsPage = () => {
  const { user, role } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwStatus, setPwStatus] = useState(null);

  // Admin users list
  const [users, setUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'analyst' });

  // System stats
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const h = await api.getDashboardHealth();
        setHealth(h);
        if (role === 'admin') {
          const uList = await api.getUsers();
          setUsers(uList);
        }
      } catch (e) {
        console.error('Failed to load settings data:', e);
      }
    };
    fetchSettingsData();
  }, [role]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus(null);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      setPwStatus({ success: true, message: res.message });
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPwStatus({ success: false, message: err.message });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setShowAddUserModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'analyst' });
      const uList = await api.getUsers();
      setUsers(uList);
    } catch (err) {
      alert(`User creation failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
          System Settings & User Administration
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Manage your credentials, system operational preferences, and user role-based access.
        </p>
      </div>

      {/* Profile & Password Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* User Profile Info */}
        <div style={{ padding: '22px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <User size={18} color="var(--xc-aqua)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Analyst Profile
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Username</span>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{user?.username}</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Email Address</span>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>{user?.email}</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Assigned Role</span>
              <div style={{ fontWeight: '700', color: 'var(--xc-violet)', textTransform: 'uppercase', marginTop: '2px' }}>
                {user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Password Update Form */}
        <div style={{ padding: '22px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Key size={18} color="var(--xc-violet)" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Change Password
            </h3>
          </div>

          {pwStatus && (
            <div
              style={{
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '0.80rem',
                backgroundColor: pwStatus.success ? 'var(--sev-low-bg)' : 'var(--sev-critical-bg)',
                border: `1px solid ${pwStatus.success ? 'var(--sev-low)' : 'var(--sev-critical)'}`,
                color: pwStatus.success ? 'var(--sev-low)' : 'var(--sev-critical)'
              }}
            >
              {pwStatus.message}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>New Password (min 6 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <button
              type="submit"
              style={{
                marginTop: '6px',
                padding: '9px',
                borderRadius: '6px',
                backgroundColor: 'var(--xc-violet)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.84rem'
              }}
            >
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* System Infrastructure Details */}
      <div style={{ padding: '22px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
          Host Infrastructure & Connectivity Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.80rem' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Backend Engine:</span>
            <div style={{ fontWeight: '700', color: 'var(--xc-teal)', marginTop: '2px' }}>FastAPI (Uvicorn) Online</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database Driver:</span>
            <div style={{ fontWeight: '700', color: 'var(--xc-aqua)', textTransform: 'capitalize', marginTop: '2px' }}>
              {health?.database_type || 'SQLAlchemy / SQLite'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>TShark Binary:</span>
            <div style={{ fontWeight: '700', color: health?.tshark_available ? 'var(--xc-teal)' : 'var(--sev-medium)', marginTop: '2px' }}>
              {health?.tshark_available ? 'Available' : 'Standby / Python Parser'}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Passive Capture Safety:</span>
            <div style={{ fontWeight: '700', color: 'var(--xc-teal)', marginTop: '2px' }}>Enforced (No Injection)</div>
          </div>
        </div>
      </div>

      {/* Admin User Management Section (visible for Admin role) */}
      {role === 'admin' && (
        <div style={{ padding: '22px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-raised)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={18} color="var(--xc-aqua)" />
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                User Administration & Roles
              </h3>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--xc-violet)',
                color: 'var(--text-primary)',
                fontSize: '0.80rem',
                fontWeight: '600'
              }}
            >
              <Plus size={14} />
              <span>Create User</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>ID</th>
                  <th style={{ padding: '10px 12px' }}>Username</th>
                  <th style={{ padding: '10px 12px' }}>Email</th>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(55, 70, 93, 0.35)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-primary)' }}>{u.username}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--xc-violet)', fontWeight: '600', textTransform: 'uppercase' }}>
                      {u.role}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: u.active ? 'var(--sev-low-bg)' : 'var(--sev-critical-bg)', color: u.active ? 'var(--sev-low)' : 'var(--sev-critical)', fontSize: '0.72rem', fontWeight: '600' }}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(8, 12, 18, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <form
            onSubmit={handleCreateUser}
            style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>Create New Operator Account</h3>
              <button type="button" onClick={() => setShowAddUserModal(false)} style={{ background: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Username</label>
              <input type="text" required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</label>
              <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Temporary Password</label>
              <input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Role</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%' }}>
                <option value="analyst">Security Analyst</option>
                <option value="viewer">Viewer (Read-only)</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAddUserModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', backgroundColor: 'var(--xc-violet)', color: 'var(--text-primary)', fontWeight: '600' }}>Create User</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
