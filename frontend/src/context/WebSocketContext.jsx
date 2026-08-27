import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

// Derive WS URL from the VITE_API_URL env var
const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // Replace http(s) with ws(s), strip /api suffix, add /ws path
  return apiUrl
    .replace(/^https/, 'wss')
    .replace(/^http/, 'ws')
    .replace(/\/api\/?$/, '') + '/ws';
};

export const WebSocketProvider = ({ children }) => {
  const wsRef = useRef(null);
  const handlersRef = useRef({}); // { eventType: Set<callback> }
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    // Don't reconnect if already open or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = getWsUrl();
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to', url);
      reconnectDelay.current = 1000; // Reset backoff
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        const callbacks = handlersRef.current[type];
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
        // Also fire wildcard handlers
        const wildcards = handlersRef.current['*'];
        if (wildcards) {
          wildcards.forEach((cb) => cb({ type, payload }));
        }
      } catch (_) {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting...');
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 30000);
      connect();
    }, reconnectDelay.current);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  /**
   * Subscribe to WebSocket events.
   * Returns an unsubscribe function.
   *
   * @param {string} eventType - e.g. 'APPOINTMENT_CREATED', or '*' for all
   * @param {Function} callback - called with payload
   */
  const subscribe = useCallback((eventType, callback) => {
    if (!handlersRef.current[eventType]) {
      handlersRef.current[eventType] = new Set();
    }
    handlersRef.current[eventType].add(callback);

    return () => {
      handlersRef.current[eventType]?.delete(callback);
    };
  }, []);

  /**
   * Get current connection status
   */
  const isConnected = () => wsRef.current?.readyState === WebSocket.OPEN;

  return (
    <WebSocketContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWS = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWS must be used inside WebSocketProvider');
  return ctx;
};

export default WebSocketContext;
