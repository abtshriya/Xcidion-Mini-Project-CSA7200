import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('disconnected'); // connected, reconnecting, disconnected
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const connect = () => {
    if (!isAuthenticated) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/events`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        // Setup ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === '{"type": "pong"}') return;
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          // Non-JSON message
        }
      };

      ws.onclose = () => {
        setStatus('reconnecting');
        clearInterval(pingIntervalRef.current);
        // Reconnect after 4s
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated) connect();
        }, 4000);
      };

      ws.onerror = () => {
        setStatus('disconnected');
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      if (socketRef.current) socketRef.current.close();
      setStatus('disconnected');
    }

    return () => {
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ status, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
