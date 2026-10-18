import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Search, RefreshCw, Dna, Eye, MessageSquare,
  Clock, ArrowRight, UserCheck, X, Plus
} from 'lucide-react';
import { api } from '../api/client';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const IncidentsPage = () => {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (search) params.search = search;
      if (severity) params.severity = severity;
      if (status) params.status = status;
      const data = await api.getIncidents(params);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [severity, status]);

  const handleSelectIncident = async (inc) => {
    setSelectedIncident(inc);
    try {
      const fullInc = await api.getIncident(inc.id);
      setSelectedIncident(fullInc);
      const timeData = await api.getIncidentTimeline(inc.id);
      setTimeline(timeData.timeline || []);
    } catch (err) {
      console.error('Failed to load incident detail:', err);
    }
  };

  const handleStatusChange = async (incId, newStatus) => {
    try {
      const updated = await api.updateIncident(incId, { status: newStatus });
      setIncidents(prev => prev.map(i => i.id === incId ? { ...i, status: newStatus } : i));
      if (selectedIncident && selectedIncident.id === incId) {
        setSelectedIncident(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedIncident) return;
    setAddingNote(true);
    try {
      const noteObj = await api.addIncidentNote(selectedIncident.id, newNote);
      setSelectedIncident(prev => ({
        ...prev,
        notes: [...(prev.notes || []), noteObj]
      }));
      setNewNote('');
    } catch (err) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Incident Correlation Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Correlated multi-event attacks grouped through Attack DNA graph relationships.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
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

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by Incident Title, ID, or Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchIncidents()}
            style={{ width: '100%', paddingLeft: '38px' }}
          />
        </div>

        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="contained">Contained</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Incident Cards Grid */}
      {loading ? (
        <LoadingSpinner message="Aggregating correlated security incidents..." />
      ) : incidents.length === 0 ? (
        <EmptyState title="No security incidents found" message="No correlated incident groups matched your query." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '20px',
                boxShadow: 'var(--shadow-raised)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
                transition: 'var(--transition)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.80rem', color: 'var(--xc-aqua)', fontWeight: '700', fontFamily: 'monospace' }}>
                    {inc.id}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                </div>

                <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>
                  {inc.title}
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                  {inc.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  <span>Alerts: <strong style={{ color: 'var(--text-primary)' }}>{inc.alert_count}</strong></span>
                  <span>•</span>
                  <span>Confidence: <strong style={{ color: 'var(--xc-aqua)' }}>{Math.round(inc.correlation_confidence * 100)}%</strong></span>
                  <span>•</span>
                  <span>Method: <strong>{inc.correlation_method}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button
                  onClick={() => navigate(`/attack-dna?incident=${inc.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    color: 'var(--xc-violet)',
                    fontSize: '0.80rem',
                    fontWeight: '600'
                  }}
                >
                  <Dna size={15} />
                  <span>Attack DNA</span>
                </button>

                <button
                  onClick={() => handleSelectIncident(inc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--xc-aqua)',
                    fontSize: '0.80rem',
                    fontWeight: '600'
                  }}
                >
                  <Eye size={14} />
                  <span>Timeline & Notes</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incident Detail / Timeline Modal */}
      {selectedIncident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 12, 18, 0.82)',
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
              maxWidth: '860px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--xc-aqua)', fontWeight: '700', fontFamily: 'monospace' }}>
                    {selectedIncident.id}
                  </span>
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {selectedIncident.title}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  First Seen: {new Date(selectedIncident.first_observed_at).toLocaleString()} | Last Seen: {new Date(selectedIncident.last_observed_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setSelectedIncident(null)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            {/* Lifecycle Status Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                Transition Lifecycle:
              </span>
              {['open', 'investigating', 'contained', 'resolved', 'closed'].map((st) => (
                <button
                  key={st}
                  disabled={selectedIncident.status === st}
                  onClick={() => handleStatusChange(selectedIncident.id, st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    backgroundColor: selectedIncident.status === st ? 'var(--xc-violet)' : 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.76rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    opacity: selectedIncident.status === st ? 0.6 : 1
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Chronological Incident Timeline */}
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Chronological Attack Timeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {timeline.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: '6px',
                      borderLeft: `3px solid var(--xc-aqua)`
                    }}
                  >
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', minWidth: '70px', fontFamily: 'monospace' }}>
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          {step.title}
                        </strong>
                        <SeverityBadge severity={step.severity} />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Host Interaction: <span style={{ fontFamily: 'monospace', color: 'var(--xc-aqua)' }}>{step.source_ip}</span> ➔ <span style={{ fontFamily: 'monospace', color: 'var(--xc-aqua)' }}>{step.destination_ip}</span> ({step.protocol})
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Category: {step.category} | Engine: {step.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyst Notes Section */}
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Analyst Investigation Notes
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {(selectedIncident.notes || []).length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No notes added yet.</div>
                ) : (
                  selectedIncident.notes.map((note) => (
                    <div key={note.id} style={{ padding: '8px 12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '3px' }}>
                        <strong>{note.username}</strong>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>{note.note}</div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Record an investigation observation..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={addingNote || !newNote.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--xc-aqua)',
                    color: 'var(--xc-obsidian)',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  <span>Add Note</span>
                </button>
              </form>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                onClick={() => {
                  setSelectedIncident(null);
                  navigate(`/attack-dna?incident=${selectedIncident.id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(114, 110, 255, 0.2)',
                  border: '1px solid var(--xc-violet)',
                  color: 'var(--xc-violet)',
                  fontWeight: '600',
                  fontSize: '0.84rem'
                }}
              >
                <Dna size={16} />
                <span>Open Full Attack DNA Graph</span>
              </button>

              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
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
