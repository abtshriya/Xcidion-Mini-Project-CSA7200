import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Pause, Trash2, ArrowRight, Shield, Radio, CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { api } from '../../api/client';
import { useWebSocket } from '../../context/WebSocketContext';

export const LiveTerminal = ({ initialSubnet = '', onDeviceSelected }) => {
  const { lastMessage, status: wsStatus } = useWebSocket();
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef(null);

  // Initial welcome and initial real logs
  useEffect(() => {
    const initTerminal = async () => {
      const now = new Date().toLocaleTimeString();
      const initialLogs = [
        {
          id: 'init-1',
          timestamp: now,
          level: 'INFO',
          source: 'SYSTEM',
          message: 'XCIDION Real-Time Telemetry & Audit Terminal initialized.'
        },
        {
          id: 'init-2',
          timestamp: now,
          level: 'INFO',
          source: 'WS',
          message: `WebSocket event pipeline: ${wsStatus === 'connected' ? 'STREAMING ACTIVE' : 'CONNECTING...'}`
        }
      ];

      try {
        // Fetch real system status to populate verified baseline output
        const res = await api.executeTerminalCommand('status');
        if (res?.output_lines) {
          res.output_lines.forEach((line, idx) => {
            initialLogs.push({
              id: `baseline-${idx}`,
              timestamp: now,
              level: line.type === 'error' ? 'ERROR' : (line.type === 'warn' ? 'WARN' : 'INFO'),
              source: 'AUDIT',
              message: line.text
            });
          });
        }
      } catch (err) {
        console.warn('Initial terminal status fetch failed:', err);
      }

      setLogs(initialLogs);
    };

    initTerminal();
  }, []);

  // Listen to real WebSocket broadcasts (terminal logs, new events, scan progress, alerts)
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    const now = new Date().toLocaleTimeString();
    let newEntry = null;

    if (lastMessage.type === 'terminal_log') {
      newEntry = {
        id: `tl-${Date.now()}-${Math.random()}`,
        timestamp: now,
        level: lastMessage.level || 'INFO',
        source: (lastMessage.source || 'SCANNER').toUpperCase(),
        message: lastMessage.message
      };
    } else if (lastMessage.type === 'new_event') {
      const evt = lastMessage.data || {};
      newEntry = {
        id: `ne-${Date.now()}-${Math.random()}`,
        timestamp: now,
        level: 'INFO',
        source: 'ZEEK/FLOW',
        message: `Traffic: ${evt.protocol || 'TCP'} ${evt.source_ip}:${evt.source_port} -> ${evt.destination_ip}:${evt.destination_port} (${evt.event_type || 'flow'})`
      };
    } else if (lastMessage.type === 'new_alert') {
      const alert = lastMessage.data || {};
      newEntry = {
        id: `na-${Date.now()}-${Math.random()}`,
        timestamp: now,
        level: alert.severity === 'critical' ? 'CRITICAL' : 'WARN',
        source: (alert.detection_source || 'DETECTION').toUpperCase(),
        message: `[ALERT TRIGGERED] ${alert.title} | Severity: ${(alert.severity || '').toUpperCase()} | Target: ${alert.event?.destination_ip || 'N/A'}`
      };
    } else if (lastMessage.type === 'sensor_heartbeat') {
      const s = lastMessage.data || {};
      newEntry = {
        id: `sh-${Date.now()}-${Math.random()}`,
        timestamp: now,
        level: 'INFO',
        source: 'SENSOR',
        message: `Heartbeat verified: ${s.sensor_id} (${s.source_type}) status=${s.status}`
      };
    }

    if (newEntry) {
      setLogs(prev => [...prev.slice(-300), newEntry]);
    }
  }, [lastMessage, isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const handleCommandSubmit = async (e) => {
    e?.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd || isExecuting) return;

    if (cmd.toLowerCase() === 'clear') {
      setLogs([]);
      setCommandInput('');
      return;
    }

    setIsExecuting(true);
    setCommandInput('');

    const now = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        timestamp: now,
        level: 'COMMAND',
        source: 'CLI',
        message: `$ ${cmd}`
      }
    ]);

    try {
      const res = await api.executeTerminalCommand(cmd);
      if (res?.output_lines) {
        const resultEntries = res.output_lines.map((l, i) => ({
          id: `res-${Date.now()}-${i}`,
          timestamp: now,
          level: l.type === 'error' ? 'ERROR' : (l.type === 'warn' ? 'WARN' : (l.type === 'success' ? 'SUCCESS' : 'INFO')),
          source: 'CLI-OUT',
          message: l.text
        }));
        setLogs(prev => [...prev.slice(-300), ...resultEntries]);
      }
    } catch (err) {
      setLogs(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          timestamp: now,
          level: 'ERROR',
          source: 'CLI-ERROR',
          message: `Execution failed: ${err.message || 'Unknown network error'}`
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickCommand = (cmdText) => {
    setCommandInput(cmdText);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return '#FF4D67';
      case 'WARN':
        return '#F5C451';
      case 'SUCCESS':
        return '#08C6AC';
      case 'COMMAND':
        return '#59FFE7';
      default:
        return '#726EFF';
    }
  };

  return (
    <div className="terminal-window" style={{ height: '520px', display: 'flex', flexDirection: 'column' }}>
      {/* Terminal Title Bar */}
      <div className="terminal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="var(--xc-aqua)" />
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
            XCIDION LIVE MONITORING TERMINAL
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: wsStatus === 'connected' ? 'rgba(8, 198, 172, 0.15)' : 'rgba(245, 196, 81, 0.15)',
              color: wsStatus === 'connected' ? 'var(--xc-teal)' : '#F5C451',
              border: `1px solid ${wsStatus === 'connected' ? 'rgba(8, 198, 172, 0.3)' : 'rgba(245, 196, 81, 0.3)'}`
            }}
          >
            ● {wsStatus === 'connected' ? 'LIVE TELEMETRY STREAM' : 'OFFLINE BUFFER'}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
            title={isPaused ? 'Resume auto-scrolling' : 'Pause terminal scroll'}
          >
            {isPaused ? <Play size={13} color="var(--xc-teal)" /> : <Pause size={13} />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            onClick={() => setLogs([])}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
            title="Clear terminal buffer"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div
        style={{
          padding: '6px 14px',
          backgroundColor: '#0a0f17',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          fontSize: '0.75rem'
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Quick Commands:</span>
        {['status', 'sensors', 'devices', 'alerts', 'subnets', 'help'].map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleQuickCommand(cmd)}
            style={{
              background: 'rgba(114, 110, 255, 0.12)',
              border: '1px solid rgba(114, 110, 255, 0.25)',
              color: 'var(--xc-aqua)',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Terminal Screen Body */}
      <div className="terminal-body" style={{ flex: 1 }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
            Terminal buffer empty. Waiting for real network packets, sensor telemetry, or command execution...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.81rem',
                lineHeight: '1.4'
              }}
            >
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, userSelect: 'none' }}>
                [{log.timestamp}]
              </span>
              <span
                style={{
                  color: getLevelColor(log.level),
                  fontWeight: '600',
                  flexShrink: 0,
                  minWidth: '70px',
                  userSelect: 'none'
                }}
              >
                [{log.source}]
              </span>
              <span
                style={{
                  color: log.level === 'CRITICAL' || log.level === 'ERROR'
                    ? '#FF4D67'
                    : (log.level === 'WARN' ? '#F5C451' : (log.level === 'SUCCESS' ? '#59FFE7' : '#E2E8F0')),
                  wordBreak: 'break-all'
                }}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Command Input Prompt */}
      <form
        onSubmit={handleCommandSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: '#090d14',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '8px'
        }}
      >
        <span style={{ color: 'var(--xc-aqua)', fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
          xcidion@nids:~$&nbsp;
        </span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Type command (e.g., status, devices, sensors, alerts, scan 192.168.1.0/24)..."
          disabled={isExecuting}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.84rem',
            outline: 'none',
            padding: '4px 0'
          }}
        />
        <button
          type="submit"
          disabled={!commandInput.trim() || isExecuting}
          style={{
            background: 'rgba(114, 110, 255, 0.25)',
            border: '1px solid rgba(114, 110, 255, 0.4)',
            color: 'var(--xc-aqua)',
            borderRadius: '4px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <span>Run</span>
          <ArrowRight size={12} />
        </button>
      </form>
    </div>
  );
};
