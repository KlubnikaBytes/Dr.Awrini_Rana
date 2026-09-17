
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
    
    // Store timeout IDs for debouncing
    const debounceTimers = {};

    // Subscribe using the ref so callbacks always have access to latest state
    const unsubscribers = Object.entries(handlersRef.current).map(([eventType]) =>
      subscribe(eventType, (payload) => {
        if (handlersRef.current[eventType]) {
          // Debounce rapid events (e.g., 5 rapid saves = 1 fetch instead of 5)
          if (debounceTimers[eventType]) {
            clearTimeout(debounceTimers[eventType]);
          }
          debounceTimers[eventType] = setTimeout(() => {
            handlersRef.current[eventType](payload);
          }, 300); // 300ms debounce window
        }
      })
    );
    
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [subscribe]);
};

export default useWebSocket;
