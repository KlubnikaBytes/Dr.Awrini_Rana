import { useEffect, useRef } from 'react';
import { useWS } from '../context/WebSocketContext';

/**
 * Convenience hook to subscribe to one or more WebSocket events.
 * Automatically unsubscribes on cleanup.
 *
 * @param {Object} handlers - mapping of { EVENT_TYPE: callbackFn }
 */
const useWebSocket = (handlers) => {
  const { subscribe } = useWS();
  const handlersRef = useRef(handlers);

  // Keep ref updated with latest handlers to avoid stale closures
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!handlersRef.current) return;
    
    // Subscribe using the ref so callbacks always have access to latest state
    const unsubscribers = Object.entries(handlersRef.current).map(([eventType]) =>
      subscribe(eventType, (payload) => {
        if (handlersRef.current[eventType]) {
          handlersRef.current[eventType](payload);
        }
      })
    );
    
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe]);
};

export default useWebSocket;
