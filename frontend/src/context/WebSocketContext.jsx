import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

// Derive WS URL from the VITE_API_URL env var or current host for robust multi-server / VPS support
const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    let url = apiUrl
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:')
      .replace(/\/api\/?$/, '') + '/ws';
    // If accessing via 127.0.0.1 or custom local hostname, match the current window hostname
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && url.includes('localhost')) {
      url = url.replace('localhost', window.location.hostname);
    }
    return url;
  }
  // Handles relative URLs (e.g. '/api') behind Hostinger Nginx reverse proxy
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

export const WebSocketProvider = ({ children }) => {
  const wsRef = useRef(null);
  const [socketId, setSocketId] = useState(null);
  const socketIdRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef({}); // { eventType: Set<callback> }
  const messageQueueRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    // If already active or connecting, don't recreate
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        setConnected(true);
        return;
      }
      if (wsRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    const url = getWsUrl();
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.warn('[WS] WebSocket instantiation error:', e);
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected successfully to', url);
      reconnectDelay.current = 1000;
      setConnected(true);

      // Flush buffered messages
      while (messageQueueRef.current.length > 0) {
        const pending = messageQueueRef.current.shift();
        try {
          ws.send(pending);
        } catch (e) {
          console.warn('[WS] Failed to send queued message:', e);
        }
      }

      // Notify WS_OPEN subscribers
      const openCallbacks = handlersRef.current['WS_OPEN'];
      if (openCallbacks) {
        openCallbacks.forEach((cb) => {
          try { cb(); } catch (err) { console.warn('[WS] Error in WS_OPEN callback:', err); }
        });
      }

      // Notify CONNECTED subscribers
      const connectedCallbacks = handlersRef.current['CONNECTED'];
      if (connectedCallbacks) {
        connectedCallbacks.forEach((cb) => {
          try { cb({ status: 'open', socketId: socketIdRef.current }); } catch (_) {}
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'CONNECTED') {
          setConnected(true);
          if (payload?.socketId) {
            setSocketId(payload.socketId);
            socketIdRef.current = payload.socketId;
          }
        }
        if (type === 'PRESCRIPTION_DIRECTORY_UPDATED' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hp-prescription-directory-updated', { detail: payload }));
        }
        const callbacks = handlersRef.current[type];
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
        const wildcards = handlersRef.current['*'];
        if (wildcards) {
          wildcards.forEach((cb) => cb({ type, payload }));
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting...');
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      setConnected(false);
      const discCallbacks = handlersRef.current['DISCONNECTED'];
      if (discCallbacks) {
        discCallbacks.forEach((cb) => {
          try { cb(); } catch (_) {}
        });
      }
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.warn('[WS] Socket error encountered');
      // Closing will trigger onclose and schedule reconnect
      try { ws.close(); } catch (_) {}
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 10000);
      connect();
    }, reconnectDelay.current);
  }, [connect]);

  // Establish connection on mount and keep an active watchdog interval
  useEffect(() => {
    connect();

    // Watchdog check every 2.5s: if closed or null, reconnect immediately!
    const watchdog = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
        setConnected(false);
        connect();
      } else if (wsRef.current.readyState === WebSocket.OPEN) {
        setConnected(true);
      }
    }, 2500);

    return () => {
      clearInterval(watchdog);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      // NOTE: We deliberately do NOT close wsRef.current here.
      // This protects the singleton WebSocket against React 18 StrictMode unmount-remount cycles.
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

    // If client is already open and subscribing to CONNECTED, fire immediately!
    if (eventType === 'CONNECTED' && wsRef.current?.readyState === WebSocket.OPEN) {
      try { callback({ status: 'open', socketId: socketIdRef.current }); } catch (_) {}
    }

    return () => {
      handlersRef.current[eventType]?.delete(callback);
    };
  }, []);

  /**
   * Get current connection status (stable reference)
   */
  const isConnected = useCallback(() => wsRef.current?.readyState === WebSocket.OPEN, []);

  /**
   * Send a message through the active WebSocket connection
   */
  const sendMessage = useCallback((data) => {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
      return true;
    }
    // Buffer message to send as soon as connection is established
    messageQueueRef.current.push(msg);
    return false;
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe, isConnected, sendMessage, socketId, connected, ws: wsRef.current }}>
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
