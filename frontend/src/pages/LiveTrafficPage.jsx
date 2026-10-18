import React, { useState, useEffect } from 'react';
import {
  Radio, Search, Filter, Upload, Download, RefreshCw,
  Eye, X, ArrowUpDown, CheckCircle, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const LiveTrafficPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [protocol, setProtocol] = useState('');
  const [uploadingPcap, setUploadingPcap] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search) params.search = search;
      if (protocol) params.protocol = protocol;
      const data = await api.getEvents(params);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [protocol]);

  const handlePcapUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPcap(true);
    setUploadFeedback(null);
    try {
      const res = await api.importPcap(file);
      setUploadFeedback(res);
      fetchEvents();
    } catch (err) {
      setUploadFeedback({ status: 'error', error: err.message });
    } finally {
      setUploadingPcap(false);
    }
  };

  const handleExportCSV = () => {
    if (!events.length) return;
    const headers = ['id', 'timestamp', 'source_ip', 'destination_ip', 'source_port', 'destination_port', 'protocol', 'event_type'];
    const rows = events.map(e => [
      e.id,
      e.event_timestamp,
      e.source_ip,
      e.destination_ip,
      e.source_port || '',
      e.destination_port || '',
      e.protocol,
      e.event_type
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xcidion_traffic_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Live Traffic Monitoring
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Ingested network flows, Zeek connection logs, and Suricata packet telemetry.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* PCAP Upload Button */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--xc-aqua)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Upload size={14} />
            <span>{uploadingPcap ? 'Ingesting PCAP...' : 'Import PCAP'}</span>
            <input
              type="file"
              accept=".pcap,.pcapng,.cap"
              onChange={handlePcapUpload}
              style={{ display: 'none' }}
              disabled={uploadingPcap}
            />
          </label>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem'
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchEvents}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
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

      {/* PCAP Feedback Notice */}
      {uploadFeedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: uploadFeedback.status === 'success' ? 'var(--sev-low-bg)' : 'var(--sev-medium-bg)',
            border: `1px solid ${uploadFeedback.status === 'success' ? 'var(--sev-low)' : 'var(--sev-medium)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem'
          }}
        >
          <div>
            <strong>PCAP Analysis: </strong>
            {uploadFeedback.status === 'success'
              ? `Extracted ${uploadFeedback.events_processed} packets, generated ${uploadFeedback.alerts_created} security alert(s).`
              : (uploadFeedback.message || uploadFeedback.error || 'PCAP processing completed.')}
          </div>
          <button onClick={() => setUploadFeedback(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by IP address, Event ID, or Protocol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
            style={{ width: '100%', paddingLeft: '38px' }}
          />
        </div>

        <select
          value={protocol}
          onChange={(e) => setProtocol(e.target.value)}
          style={{ minWidth: '140px' }}
        >
          <option value="">All Protocols</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
          <option value="ICMP">ICMP</option>
        </select>
      </div>

      {/* Events Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--shadow-raised)',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <LoadingSpinner message="Querying live network flows..." />
        ) : events.length === 0 ? (
          <EmptyState title="No network traffic found" message="No network flows matched your search criteria." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Event ID</th>
                  <th style={{ padding: '12px 14px' }}>Source IP:Port</th>
                  <th style={{ padding: '12px 14px' }}>Destination IP:Port</th>
                  <th style={{ padding: '12px 14px' }}>Proto</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Payload Bytes</th>
                  <th style={{ padding: '12px 14px' }}>Sensor</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ borderBottom: '1px solid rgba(55, 70, 93, 0.35)', transition: 'var(--transition)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(evt.event_timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--xc-aqua)', fontWeight: '600', fontFamily: 'monospace' }}>
                      {evt.id}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {evt.source_ip}:{evt.source_port || 0}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {evt.destination_ip}:{evt.destination_port || 0}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--xc-aqua)', fontWeight: '600' }}>
                      {evt.protocol}
                    </td>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize' }}>
                      {evt.event_type}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {((evt.normalised_payload?.orig_bytes || 0) + (evt.normalised_payload?.resp_bytes || 0)).toLocaleString()} B
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {evt.sensor_id}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        style={{
                          background: 'none',
                          color: 'var(--xc-aqua)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Detail Drawer Modal */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 12, 18, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Event Payload Inspection: {selectedEvent.id}
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Observed at {new Date(selectedEvent.event_timestamp).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Source Host</span>
                <div style={{ fontSize: '0.90rem', fontWeight: '600', fontFamily: 'monospace' }}>
                  {selectedEvent.source_ip}:{selectedEvent.source_port}
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Destination Host</span>
                <div style={{ fontSize: '0.90rem', fontWeight: '600', fontFamily: 'monospace' }}>
                  {selectedEvent.destination_ip}:{selectedEvent.destination_port}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Raw / Normalised Payload JSON:
              </span>
              <pre
                style={{
                  marginTop: '6px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: 'var(--xc-aqua)',
                  overflowX: 'auto',
                  maxHeight: '260px'
                }}
              >
                {JSON.stringify(selectedEvent.normalised_payload, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
