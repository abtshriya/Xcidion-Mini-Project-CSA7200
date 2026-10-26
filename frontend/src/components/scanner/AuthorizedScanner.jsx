import React, { useState, useEffect } from 'react';
import { Network, ShieldCheck, ShieldAlert, Play, RefreshCw, Plus, Search, AlertTriangle, CheckCircle, ExternalLink, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const AuthorizedScanner = ({ onInvestigateDevice }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [approvedSubnets, setApprovedSubnets] = useState([]);
  const [selectedSubnet, setSelectedSubnet] = useState('');
  const [activeJob, setActiveJob] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Subnet Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCidr, setNewCidr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [subnetsData, devsData, jobsData] = await Promise.all([
        api.getApprovedSubnets(),
        api.getDevices(),
        api.getScanJobs()
      ]);

      setApprovedSubnets(subnetsData || []);
      if (subnetsData?.length > 0 && !selectedSubnet) {
        setSelectedSubnet(subnetsData[0].cidr);
      }
      setDevices(devsData || []);
      setScanHistory(jobsData || []);
    } catch (err) {
      console.error('Failed to load scanning data:', err);
      setErrorMsg('Failed to fetch scanning configuration: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartScan = async () => {
    if (!isAdmin) {
      setErrorMsg('Permission denied: Network scanning is strictly restricted to Administrators.');
      return;
    }

    if (!selectedSubnet) {
      setErrorMsg('Please select an authorized network subnet.');
      return;
    }

    try {
      setIsScanning(true);
      setErrorMsg('');
      setSuccessMsg('');

      const job = await api.startScan({
        subnet: selectedSubnet,
        scan_type: 'standard'
      });

      setActiveJob(job);

      if (job.status === 'blocked') {
        setErrorMsg(`Scan blocked by security policy: Subnet ${selectedSubnet} is not within authorized scope.`);
      } else {
        setSuccessMsg(`Authorized scan completed for scope ${selectedSubnet}: Discovered ${job.devices_found} devices with ${job.open_ports_found} open ports.`);
      }

      // Refresh inventory & history
      await loadData();
    } catch (err) {
      setErrorMsg('Scan failed: ' + (err.message || 'Unknown network error'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddSubnet = async (e) => {
    e.preventDefault();
    if (!newCidr.trim() || !newLabel.trim()) return;

    try {
      await api.addApprovedSubnet({
        cidr: newCidr.trim(),
        label: newLabel.trim(),
        description: newDesc.trim() || undefined
      });
      setShowAddModal(false);
      setNewCidr('');
      setNewLabel('');
      setNewDesc('');
      setSuccessMsg(`Approved subnet ${newCidr} registered successfully.`);
      await loadData();
    } catch (err) {
      setErrorMsg('Failed to register approved subnet: ' + err.message);
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return <span className="badge" style={{ backgroundColor: 'rgba(255, 77, 103, 0.2)', color: '#FF4D67', border: '1px solid #FF4D67' }}>Critical</span>;
      case 'high':
        return <span className="badge" style={{ backgroundColor: 'rgba(255, 138, 76, 0.2)', color: '#FF8A4C', border: '1px solid #FF8A4C' }}>High</span>;
      case 'medium':
        return <span className="badge" style={{ backgroundColor: 'rgba(245, 196, 81, 0.2)', color: '#F5C451', border: '1px solid #F5C451' }}>Medium</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'rgba(8, 198, 172, 0.2)', color: 'var(--xc-teal)', border: '1px solid var(--xc-teal)' }}>Low</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Scanner Controls */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="var(--xc-aqua)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Authorised Network Scanner & Scope Controller
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Active subnet reconnaissance, open-port verification, and threat exposure auditing restricted to authorized CIDR boundaries.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-secondary"
                style={{ fontSize: '0.82rem' }}
              >
                <Plus size={15} />
                <span>Add Approved Subnet</span>
              </button>
            )}
            <button
              onClick={loadData}
              className="btn-secondary"
              style={{ fontSize: '0.82rem' }}
              disabled={loading || isScanning}
              title="Refresh inventory"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Permission Disclaimer if non-admin */}
        {!isAdmin && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(245, 196, 81, 0.08)',
              border: '1px solid rgba(245, 196, 81, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              fontSize: '0.83rem',
              color: '#F5C451'
            }}
          >
            <Lock size={16} />
            <span>
              <strong>Analyst Role View:</strong> Network scanning execution is restricted to Administrators. You have full permission to inspect scan results, verify open ports, and conduct device investigations.
            </span>
          </div>
        )}

        {/* Scan Execution Form */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            backgroundColor: 'rgba(8, 12, 18, 0.6)',
            padding: '14px 18px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)'
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              APPROVED SCANNING SCOPE (CIDR / TARGET)
            </label>
            <select
              value={selectedSubnet}
              onChange={(e) => setSelectedSubnet(e.target.value)}
              disabled={isScanning}
              style={{
                width: '100%',
                backgroundColor: 'rgba(24, 35, 49, 0.8)',
                color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '0.88rem'
              }}
            >
              {approvedSubnets.map((sub) => (
                <option key={sub.id} value={sub.cidr}>
                  {sub.cidr} — {sub.label} {sub.description ? `(${sub.description})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '18px' }}>
            <button
              onClick={handleStartScan}
              disabled={!isAdmin || isScanning || !selectedSubnet}
              className="btn-primary"
              style={{
                height: '40px',
                padding: '0 20px',
                fontSize: '0.88rem',
                opacity: (!isAdmin || isScanning) ? 0.6 : 1,
                cursor: (!isAdmin || isScanning) ? 'not-allowed' : 'pointer'
              }}
            >
              {isScanning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Scanning Scope...</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>Initiate Authorised Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 77, 103, 0.12)',
              border: '1px solid rgba(255, 77, 103, 0.35)',
              borderRadius: '6px',
              color: '#FF4D67',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 16px',
              backgroundColor: 'rgba(8, 198, 172, 0.12)',
              border: '1px solid rgba(8, 198, 172, 0.35)',
              borderRadius: '6px',
              color: 'var(--xc-teal)',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Discovered Devices / Host Inventory Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Discovered Network Assets & Exposure Audit ({devices.length})
            </h3>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
              Authorised host discovery records, verified open ports, and risk index.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Hostname / Identity</th>
                <th>Status</th>
                <th>Verified Open Ports</th>
                <th>Suspicious Indicators</th>
                <th>Risk Level</th>
                <th style={{ textAlign: 'right' }}>Investigation</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No devices discovered in inventory. Select an approved subnet above and initiate an authorised scan.
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--xc-aqua)' }}>
                        {dev.ip_address}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {dev.hostname || 'Unresolved Hostname'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: dev.status === 'online' ? 'rgba(8, 198, 172, 0.15)' : 'rgba(255, 77, 103, 0.15)',
                          color: dev.status === 'online' ? 'var(--xc-teal)' : '#FF4D67'
                        }}
                      >
                        ● {dev.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                        {dev.open_ports && dev.open_ports.length > 0 ? (
                          dev.open_ports.map((p, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.70rem',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: 'rgba(114, 110, 255, 0.14)',
                                color: 'var(--xc-violet)',
                                border: '1px solid rgba(114, 110, 255, 0.25)',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              {p.port}/{p.service || 'tcp'}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No open ports exposed</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {dev.suspicious_indicators && dev.suspicious_indicators.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {dev.suspicious_indicators.slice(0, 2).map((ind, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.72rem',
                                color: '#F5C451',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              ⚠ {ind}
                            </span>
                          ))}
                          {dev.suspicious_indicators.length > 2 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              +{dev.suspicious_indicators.length - 2} more...
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clean Baseline</span>
                      )}
                    </td>
                    <td>{getRiskBadge(dev.risk_level)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onInvestigateDevice && onInvestigateDevice(dev.ip_address)}
                        className="btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          color: 'var(--xc-aqua)',
                          borderColor: 'rgba(89, 255, 231, 0.3)'
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>Investigate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Approved Subnet Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 12, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
              Register Approved Scanning Scope
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Define an authorized CIDR network segment (e.g., 192.168.1.0/24). Scans will only be permitted within these boundaries.
            </p>

            <form onSubmit={handleAddSubnet} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SUBNET CIDR (e.g., 10.10.10.0/24 or 192.168.2.0/24)
                </label>
                <input
                  type="text"
                  required
                  placeholder="192.168.1.0/24"
                  value={newCidr}
                  onChange={(e) => setNewCidr(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SCOPE LABEL
                </label>
                <input
                  type="text"
                  required
                  placeholder="Internal Servers VLAN"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Application servers and local databases"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: '0.84rem' }}
                >
                  Confirm & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
