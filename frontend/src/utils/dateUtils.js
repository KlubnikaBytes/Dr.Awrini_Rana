/**
 * Returns today'"'"'s date as "YYYY-MM-DD" using LOCAL time (not UTC).
 *
 * Why: new Date().toISOString() returns UTC, which is 5:30 hours behind IST.
 * So at 12:01 AM IST the UTC date is still the previous day, causing the
 * date picker and filters to show yesterday'"'"'s date.
 */
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
