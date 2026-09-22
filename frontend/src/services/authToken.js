/**
 * Returns the active auth token for API calls.
 * In a doctor portal session, doctorToken is used.
 * In a normal admin/staff session, the standard user token is used.
 */
export const getAuthToken = () => {
  return localStorage.getItem('doctorToken') || localStorage.getItem('token') || '';
};

/**
 * Safely decode a JWT payload (client-side only — no signature verification).
 * Signature verification happens on the server for every authenticated request.
 */
export const decodeJwtPayload = (token) => {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};
