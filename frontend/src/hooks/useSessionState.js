import { useState, useEffect } from 'react';

function useSessionState(key, initialValue) {
  // Read initial value from sessionStorage or use provided initialValue
  const [state, setState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch (e) {
      console.warn('Error reading sessionStorage key', key, e);
      return initialValue;
    }
  });

  // Write state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      if (state === undefined || state === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('Error setting sessionStorage key', key, e);
    }
  }, [key, state]);

  return [state, setState];
}

export default useSessionState;
