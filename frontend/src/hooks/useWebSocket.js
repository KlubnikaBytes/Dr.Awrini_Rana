import { useEffect } from 'react';
import { useWS } from '../context/WebSocketContext';

/**
 * Convenience hook to subscribe to one or more WebSocket events.
 * Automatically unsubscribes on cleanup.
 *
 * @param {Object} handlers - mapping of { EVENT_TYPE: callbackFn }
 *
 * @example
 *   useWebSocket({
 *     APPOINTMENT_CREATED: (payload) => fetchAppointments(),
 *     APPOINTMENT_STATUS_CHANGED: (payload) => fetchAppointments(),
 *   });
 */
const useWebSocket = (handlers) => {
  const { subscribe } = useWS();

  useEffect(() => {
    if (!handlers) return;
    const unsubscribers = Object.entries(handlers).map(([eventType, callback]) =>
      subscribe(eventType, callback)
    );
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);
};

export default useWebSocket;
