import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, ShieldCheck, Play, RefreshCw, AlertTriangle, CheckCircle,
  ExternalLink, Search, Filter, Download, Terminal, Plus, Radio, Server,
  Lock, ArrowRight, Zap, Eye, AlertOctagon, HelpCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { SeverityBadge } from '../common/SeverityBadge';

export const LiveThreatScanner = ({ onInvestigateDevice, onScanComplete }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { lastMessage } = useWebSocket();

  const [approvedSubnets, setApprovedSubnets] = useState([]);
  const [selectedSubnet, setSelectedSubnet] = useState('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanningHost, setCurrentScanningHost] = useState('');
  const [currentHostIndex, setCurrentHostIndex] = useState(0);
  const [totalHostsToScan, setTotalHostsToScan] = useState(0);
  const [liveLogs, setLiveLogs] = useState([]);
  const [lastJob, setLastJob] = useState(null);
  const [scannedSystems, setScannedSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering
  const [filterThreatsOnly, setFilterThreatsOnly] = useState('all'); // 'all', 'threats', 'critical', 'clean'
  const [searchQuery, setSearchQuery] = useState('');

  // Add Subnet Modal (for Admins)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCidr, setNewCidr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const logContainerRef = useRef(null);

  // Auto-scroll live logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs]);

  // Handle incoming WebSocket messages during scan
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'scan_progress') {
      setIsScanning(true);
      setScanProgress(lastMessage.percent || 0);
      setCurrentScanningHost(lastMessage.current_host || '');
      setCurrentHostIndex(lastMessage.index || 0);
      setTotalHostsToScan(lastMessage.total || 0);
    } else if (lastMessage.type === 'terminal_log' && isScanning) {
      setLiveLogs(prev => [...prev.slice(-35), {
        timestamp: lastMessage.timestamp || new Date().toISOString(),
        level: lastMessage.level || 'INFO',
        message: lastMessage.message || ''
      }]);
    } else if (lastMessage.type === 'scan_completed') {
      fetchInitialData();
    }
  }, [lastMessage, isScanning]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [subnetsData, devsData, jobsData] = await Promise.all([
        api.getApprovedSubnets(),
        api.getDevices(),
        api.getScanJobs()
      ]);

      setApprovedSubnets(subnetsData || []);
      
      if (jobsData && jobsData.length > 0 && jobsData[0].scanned_devices?.length > 0) {
        setLastJob(jobsData[0]);
        setScannedSystems(jobsData[0].scanned_devices);
      } else if (devsData && devsData.length > 0) {
        const mapped = devsData.map(d => ({
          id: d.id,
          ip_address: d.ip_address,
          hostname: d.hostname,
          status: d.status,
          risk_level: d.risk_level,
          open_ports: d.open_ports || [],
          suspicious_indicators: d.suspicious_indicators || [],
          threats: (d.suspicious_indicators || []).map(ind => ({
            title: ind,
            severity: d.risk_level,
            engine: 'NIDS Correlation',
            category: 'Risk Indicator',
            description: ind
          })),
          alerts_count: (d.suspicious_indicators || []).length
        }));
        setScannedSystems(mapped);
      }
    } catch (err) {
      console.error('Failed to load scanner initialization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleExecuteScan = async (targetScope = selectedSubnet) => {
    try {
      setIsScanning(true);
      setScanProgress(5);
      setErrorMsg('');
      setSuccessMsg('');
      setLiveLogs([{
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Starting network scan for: ${targetScope === 'all' ? 'All Monitored Subnets' : targetScope}...`
      }]);

      let job;
      if (targetScope === 'all') {
        job = await api.scanAllSystems();
      } else {
        job = await api.startScan({
          subnet: targetScope,
          scan_type: 'standard'
        });
      }

      setLastJob(job);
      setScanProgress(100);

      if (job.status === 'blocked') {
        setErrorMsg(`Scan blocked: Subnet '${targetScope}' is outside authorized scanning scope.`);
      } else {
        setSuccessMsg(`Scan completed: Audited ${job.devices_found || 0} systems, identified ${job.threats_found || 0} systems with potential threats, verified ${job.open_ports_found || 0} open ports.`);
        if (job.scanned_devices && job.scanned_devices.length > 0) {
          setScannedSystems(job.scanned_devices);
        } else {
          const refreshedDevs = await api.getDevices();
          if (refreshedDevs) {
            setScannedSystems(refreshedDevs.map(d => ({
              id: d.id,
              ip_address: d.ip_address,
              hostname: d.hostname,
              status: d.status,
              risk_level: d.risk_level,
              open_ports: d.open_ports || [],
              suspicious_indicators: d.suspicious_indicators || [],
              threats: (d.suspicious_indicators || []).map(ind => ({
                title: ind,
                severity: d.risk_level,
                engine: 'NIDS Correlation',
                category: 'Threat Exposure',
                description: ind
              })),
              alerts_count: (d.suspicious_indicators || []).length
            })));
          }
        }
      }

      if (onScanComplete) {
        onScanComplete(job);
      }
    } catch (err) {
      console.error('Scan execution error:', err);
      setErrorMsg('Scan failed: ' + (err.message || 'Network communication error'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddApprovedSubnet = async (e) => {
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
      setSuccessMsg(`Approved subnet '${newCidr}' successfully registered.`);
      await fetchInitialData();
    } catch (err) {
      setErrorMsg('Failed to add approved subnet: ' + err.message);
    }
  };

  const exportThreatsCsv = () => {
    if (!scannedSystems.length) return;
    const headers = ['IP Address', 'Hostname', 'Status', 'Risk Level', 'Threats Count', 'Open Ports', 'Threat Descriptions'];
    const rows = scannedSystems.map(s => [
      `"${s.ip_address}"`,
      `"${s.hostname || ''}"`,
      `"${s.status}"`,
      `"${s.risk_level}"`,
      s.threats?.length || s.suspicious_indicators?.length || 0,
      `"${(s.open_ports || []).map(p => p.port).join(', ')}"`,
      `"${(s.threats || []).map(t => t.title || t.description).join(' | ').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xcidion_scan_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered systems
  const filteredSystems = scannedSystems.filter(sys => {
    const matchesSearch = !searchQuery ||
      sys.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sys.hostname && sys.hostname.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const hasThreats = (sys.threats && sys.threats.length > 0) || (sys.suspicious_indicators && sys.suspicious_indicators.length > 0) || sys.risk_level !== 'low';

    if (filterThreatsOnly === 'threats') {
      return hasThreats;
    }
    if (filterThreatsOnly === 'critical') {
      return sys.risk_level === 'critical' || sys.risk_level === 'high';
    }
    if (filterThreatsOnly === 'clean') {
      return !hasThreats;
    }
    return true;
  });

  const totalAudited = scannedSystems.length;
  const systemsWithThreatsCount = scannedSystems.filter(s => (s.threats?.length > 0) || (s.suspicious_indicators?.length > 0) || s.risk_level !== 'low').length;
  const criticalThreatsCount = scannedSystems.filter(s => s.risk_level === 'critical').length;
  const totalOpenPorts = scannedSystems.reduce((acc, s) => acc + (s.open_ports?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner & Scanner Controls */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={18} color="#818CF8" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Network Vulnerability & Threat Scanner
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              Host discovery, open-port verification, and NIDS signature correlation across authorized subnets.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-secondary"
                style={{ fontSize: '0.80rem', padding: '6px 12px' }}
              >
                <Plus size={13} />
                <span>Add Subnet Scope</span>
              </button>
            )}

            <button
              onClick={fetchInitialData}
              disabled={isScanning}
              className="btn-secondary"
              style={{ fontSize: '0.80rem', padding: '6px 12px' }}
              title="Refresh inventory"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Trigger Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#0E141E',
            padding: '12px 16px',
            borderRadius: '6px',
            border: '1px solid #1E2738'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExecuteScan('all')}
              disabled={isScanning}
              className="btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '0.86rem',
                fontWeight: '600',
                cursor: isScanning ? 'not-allowed' : 'pointer'
              }}
            >
              {isScanning ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Scanning Network...</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  <span>Scan All Systems</span>
                </>
              )}
            </button>

            <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>or scope:</span>

            <select
              value={selectedSubnet}
              onChange={(e) => setSelectedSubnet(e.target.value)}
              disabled={isScanning}
              style={{
                padding: '7px 11px',
                borderRadius: '4px',
                backgroundColor: '#141C28',
                border: '1px solid #232E40',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                minWidth: '220px'
              }}
            >
              <option value="all">All Systems & Subnets</option>
              {approvedSubnets.map((sub) => (
                <option key={sub.id} value={sub.cidr}>
                  {sub.cidr} — {sub.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleExecuteScan(selectedSubnet)}
              disabled={isScanning}
              className="btn-secondary"
              style={{ fontSize: '0.80rem', padding: '7px 13px' }}
            >
              <span>Scan Scope</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isScanning ? '#F97316' : '#10B981'
              }}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {isScanning ? 'Scanner Running...' : 'Scanner Idle'}
            </span>
          </div>
        </div>

        {/* Real-time In-Progress Scan Bar */}
        {isScanning && (
          <div
            style={{
              marginTop: '14px',
              padding: '16px',
              backgroundColor: '#0A0E15',
              borderRadius: '6px',
              border: '1px solid #1E2738'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#6366F1'
                  }}
                  className="animate-pulse"
                />
                <span style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Auditing Target:
                </span>
                <span style={{ fontSize: '0.84rem', color: '#818CF8', fontFamily: 'var(--font-mono)' }}>
                  {currentScanningHost || 'Initializing...'}
                </span>
                {totalHostsToScan > 0 && (
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    ({currentHostIndex}/{totalHostsToScan})
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {scanProgress}%
              </span>
            </div>

            {/* Clean Progress Bar */}
            <div style={{ height: '5px', width: '100%', backgroundColor: '#1A2332', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${scanProgress}%`,
                  backgroundColor: '#4F46E5',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>

            {/* Live Terminal Log Stream */}
            <div
              ref={logContainerRef}
              style={{
                marginTop: '12px',
                maxHeight: '110px',
                overflowY: 'auto',
                backgroundColor: '#06090E',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #1A2433',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              {liveLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ color: '#4B5563', fontSize: '0.68rem' }}>
                    {log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) : ''}
                  </span>
                  <span
                    style={{
                      color: log.level === 'ERROR' ? '#EF4444' : log.level === 'WARN' ? '#F59E0B' : log.level === 'SUCCESS' ? '#10B981' : '#94A3B8'
                    }}
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Alerts */}
        {errorMsg && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '4px',
              color: '#EF4444',
              fontSize: '0.80rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && !isScanning && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '4px',
              color: '#10B981',
              fontSize: '0.80rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={15} />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={exportThreatsCsv}
              className="btn-secondary"
              style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#10B981' }}
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Audited Systems
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {totalAudited}
          </div>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Verified Host Assets</span>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.70rem', color: systemsWithThreatsCount > 0 ? '#EF4444' : 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Flagged Systems
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: systemsWithThreatsCount > 0 ? '#EF4444' : '#10B981', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {systemsWithThreatsCount}
          </div>
          <span style={{ fontSize: '0.70rem', color: systemsWithThreatsCount > 0 ? '#EF4444' : '#10B981' }}>
            {systemsWithThreatsCount > 0 ? 'Threats / Exposures' : 'Clean Baseline'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.70rem', color: criticalThreatsCount > 0 ? '#EF4444' : 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Critical Nodes
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: criticalThreatsCount > 0 ? '#EF4444' : 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {criticalThreatsCount}
          </div>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>High-Risk Targets</span>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Open Ports
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#818CF8', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {totalOpenPorts}
          </div>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Listening Services</span>
        </div>

        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Security Posture
          </span>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: systemsWithThreatsCount > 0 ? '#F59E0B' : '#10B981', marginTop: '6px' }}>
            {systemsWithThreatsCount > 0 ? 'ATTENTION REQUIRED' : 'NORMAL'}
          </div>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
            {systemsWithThreatsCount > 0 ? 'Follow triage guide' : 'Perimeter secure'}
          </span>
        </div>
      </div>

      {/* Scanned Systems & Live Threat Inventory Section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Host Findings & Threat Inventory ({filteredSystems.length})
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Discovered network endpoints, verified ports, and associated intrusion detections.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {[
                { id: 'all', label: 'All', count: scannedSystems.length },
                { id: 'threats', label: 'Threats', count: systemsWithThreatsCount },
                { id: 'critical', label: 'Critical / High', count: scannedSystems.filter(s => s.risk_level === 'critical' || s.risk_level === 'high').length },
                { id: 'clean', label: 'Clean', count: scannedSystems.filter(s => s.risk_level === 'low').length }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterThreatsOnly(f.id)}
                  style={{
                    padding: '4px 9px',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    border: filterThreatsOnly === f.id ? '1px solid #4F46E5' : '1px solid #1E2738',
                    backgroundColor: filterThreatsOnly === f.id ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    color: filterThreatsOnly === f.id ? '#818CF8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: filterThreatsOnly === f.id ? '600' : '500'
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '200px' }}>
              <input
                type="text"
                placeholder="Search IP or Host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 10px 5px 28px',
                  fontSize: '0.76rem',
                  borderRadius: '4px',
                  backgroundColor: '#0F1520',
                  border: '1px solid #232E40',
                  color: 'var(--text-primary)'
                }}
              />
              <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '9px', top: '8px' }} />
            </div>

            <button
              onClick={exportThreatsCsv}
              disabled={!scannedSystems.length}
              className="btn-secondary"
              style={{ fontSize: '0.74rem', padding: '5px 10px' }}
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Systems Cards Grid */}
        {filteredSystems.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#0D121A', borderRadius: '6px' }}>
            No systems match the selected filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredSystems.map((sys) => {
              const hasThreats = (sys.threats && sys.threats.length > 0) || (sys.suspicious_indicators && sys.suspicious_indicators.length > 0) || sys.risk_level !== 'low';
              const isCrit = sys.risk_level === 'critical';
              const isHigh = sys.risk_level === 'high';

              return (
                <div
                  key={sys.id || sys.ip_address}
                  style={{
                    backgroundColor: '#111722',
                    borderRadius: '6px',
                    border: isCrit
                      ? '1px solid rgba(239, 68, 68, 0.35)'
                      : isHigh
                      ? '1px solid rgba(249, 115, 22, 0.35)'
                      : hasThreats
                      ? '1px solid rgba(245, 158, 11, 0.3)'
                      : '1px solid #1E2738',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* System Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.96rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>
                        {sys.ip_address}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        {sys.hostname || 'Unresolved Host'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10B981'
                        }}
                      >
                        ● {sys.status?.toUpperCase() || 'ONLINE'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SeverityBadge severity={sys.risk_level} />

                      {hasThreats ? (
                        <span
                          style={{
                            fontSize: '0.70rem',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#F87171',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            fontWeight: '600'
                          }}
                        >
                          {(sys.threats?.length || sys.suspicious_indicators?.length || 1)} threat(s) flagged
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.70rem',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#34D399',
                            fontWeight: '500'
                          }}
                        >
                          Clean
                        </span>
                      )}

                      <button
                        onClick={() => onInvestigateDevice && onInvestigateDevice(sys.ip_address)}
                        className="btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.74rem'
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>Investigate</span>
                      </button>
                    </div>
                  </div>

                  {/* Threat Findings Box */}
                  {hasThreats ? (
                    <div
                      style={{
                        backgroundColor: '#0D131C',
                        padding: '10px 14px',
                        borderRadius: '4px',
                        border: '1px solid #1A2332'
                      }}
                    >
                      <div style={{ fontSize: '0.70rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Detected Threat Signatures:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sys.threats && sys.threats.length > 0 ? (
                          sys.threats.map((threat, tIdx) => (
                            <div
                              key={tIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '6px',
                                padding: '6px 10px',
                                borderRadius: '3px',
                                backgroundColor: threat.severity === 'critical' ? 'rgba(239, 68, 68, 0.08)' : threat.severity === 'high' ? 'rgba(249, 115, 22, 0.08)' : 'rgba(245, 158, 11, 0.06)',
                                border: `1px solid ${threat.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : threat.severity === 'high' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(245, 158, 11, 0.15)'}`
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SeverityBadge severity={threat.severity} />
                                <span style={{ fontWeight: '500', fontSize: '0.80rem', color: 'var(--text-primary)' }}>
                                  {threat.title}
                                </span>
                                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                  — {threat.description}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '0.66rem',
                                    padding: '1px 5px',
                                    borderRadius: '2px',
                                    backgroundColor: '#1E2738',
                                    color: '#818CF8',
                                    fontFamily: 'var(--font-mono)'
                                  }}
                                >
                                  {threat.engine || 'NIDS'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          (sys.suspicious_indicators || []).map((ind, indIdx) => (
                            <div
                              key={indIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.78rem',
                                color: '#F59E0B'
                              }}
                            >
                              <AlertTriangle size={13} color="#F59E0B" />
                              <span>{ind}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        color: '#34D399'
                      }}
                    >
                      <CheckCircle size={14} />
                      <span>Clean Baseline — No active threat signatures or anomalous exfiltration traffic.</span>
                    </div>
                  )}

                  {/* Open Ports */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                      Open Ports:
                    </span>
                    {sys.open_ports && sys.open_ports.length > 0 ? (
                      sys.open_ports.map((p, idx) => {
                        const isSensitive = [21, 23, 3389, 445, 5432, 3306, 1433].includes(p.port);
                        return (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.70rem',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              backgroundColor: isSensitive ? 'rgba(249, 115, 22, 0.12)' : '#182230',
                              color: isSensitive ? '#F97316' : '#94A3B8',
                              border: `1px solid ${isSensitive ? 'rgba(249, 115, 22, 0.3)' : '#232F42'}`,
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            {p.port}/{p.service || 'tcp'}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>None discovered</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Approved Subnet Modal (for Admin) */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 12, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Add Authorized Subnet Scope
            </h3>
            <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Define a network boundary in CIDR notation (e.g., 192.168.1.0/24).
            </p>

            <form onSubmit={handleAddApprovedSubnet} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  CIDR Notation (e.g. 192.168.1.0/24)
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
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Scope Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="Internal Servers"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Production application nodes"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.80rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: '0.80rem' }}
                >
                  Add Subnet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
