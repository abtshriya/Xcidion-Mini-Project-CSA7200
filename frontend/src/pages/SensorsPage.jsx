import React, { useState, useEffect } from 'react';
import {
  Server, RefreshCw, Plus, GitCommit, CheckCircle2,
  AlertTriangle, Radio, Activity, X
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const SensorsPage = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newSensor, setNewSensor] = useState({
    id: '',
    name: '',
    hostname: '',
    source_type: 'zeek'
  });

  const fetchSensors = async () => {
    setLoading(true);
    try {
      const data = await api.getSensors();
      setSensors(data);
    } catch (err) {
      console.error('Failed to load sensors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.registerSensor(newSensor);
      setShowRegisterModal(false);
      setNewSensor({ id: '', name: '', hostname: '', source_type: 'zeek' });
      fetchSensors();
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Network Monitoring Sensors
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Collector instances across Zeek, Suricata, TShark, and synthetic network nodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowRegisterModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--xc-violet)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: '600'
            }}
          >
            <Plus size={15} />
            <span>Register Sensor</span>
          </button>
          <button
            onClick={fetchSensors}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem'
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Checking sensor heartbeats and telemetry streams..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '22px',
                boxShadow: 'var(--shadow-raised)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.80rem', color: 'var(--xc-aqua)', fontWeight: '700', fontFamily: 'monospace' }}>
                    {sensor.id}
                  </span>
                  <StatusBadge status={sensor.status} />
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {sensor.name}
                </h3>
                <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Hostname: <strong style={{ color: 'var(--xc-aqua)', fontFamily: 'monospace' }}>{sensor.hostname}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Source Engine:</span>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', marginTop: '2px' }}>
                      {sensor.source_type}
                    </div>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Event:</span>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {sensor.last_event_at ? new Date(sensor.last_event_at).toLocaleTimeString() : 'Standby'}
                    </div>
                  </div>
                </div>

                {sensor.configuration_metadata && (
                  <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Configuration Metadata:</span>
                    <pre style={{ marginTop: '4px', fontFamily: 'monospace', color: 'var(--xc-aqua)', fontSize: '0.74rem' }}>
                      {JSON.stringify(sensor.configuration_metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                Heartbeat received: {new Date(sensor.last_heartbeat_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Sensor Modal */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 12, 18, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <form
            onSubmit={handleRegister}
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Register Monitoring Sensor
              </h3>
              <button type="button" onClick={() => setShowRegisterModal(false)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Sensor ID</label>
              <input
                type="text"
                required
                placeholder="e.g. SENSOR-CORE-02"
                value={newSensor.id}
                onChange={(e) => setNewSensor({ ...newSensor, id: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Sensor Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Zeek Network Node"
                value={newSensor.name}
                onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Hostname / Interface</label>
              <input
                type="text"
                required
                placeholder="e.g. sensor-02.internal"
                value={newSensor.hostname}
                onChange={(e) => setNewSensor({ ...newSensor, hostname: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.80rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Engine Source</label>
              <select
                value={newSensor.source_type}
                onChange={(e) => setNewSensor({ ...newSensor, source_type: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="zeek">Zeek Network Monitor</option>
                <option value="suricata">Suricata NIDS</option>
                <option value="tshark">TShark Capture</option>
                <option value="synthetic">Synthetic Test Generator</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--xc-violet)',
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}
              >
                Register
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
