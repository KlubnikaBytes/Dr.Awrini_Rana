import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, User, Phone, Hash, Clock, Users } from 'lucide-react';
import frontdeskService from '../services/frontdeskService';
import PatientDashboardModal from './FrontDesk/PatientDashboard/PatientDashboardModal';

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const MatchBadge = ({ type }) => {
  const map = {
    name:  { label: 'Name',  bg: '#eff6ff', color: '#2563eb', icon: <User size={9} /> },
    id:    { label: 'ID',    bg: '#f0fdf4', color: '#059669', icon: <Hash size={9} /> },
    phone: { label: 'Phone', bg: '#fdf4ff', color: '#9333ea', icon: <Phone size={9} /> },
  };
  const m = map[type] || map.name;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: m.bg, color: m.color,
      fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px',
      borderRadius: 99, letterSpacing: '0.03em'
    }}>
      {m.icon} {m.label}
    </span>
  );
};

const avatarColors = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#9333ea'];
const getAvatarColor = (name = '') => avatarColors[name.charCodeAt(0) % avatarColors.length];

const GlobalPatientSearch = () => {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [error, setError]           = useState('');

  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const debouncedQ   = useDebounce(query, 280);

  // Fetch results
  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setOpen(false); setError(''); return; }
    setLoading(true);
    setError('');
    frontdeskService.searchPatients(debouncedQ)
      .then(data => {
        setResults(data);
        setOpen(true);
      })
      .catch(() => { setError('Search failed'); setResults([]); setOpen(true); })
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  // Group phone results by "family" label
  const isPhoneSearch = results.length > 0 && results[0]?.matchType === 'phone';

  return (
    <>
      <div
        ref={containerRef}
        style={{ position: 'relative' }}
        className="global-search-root"
      >
        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.10)',
          border: `1.5px solid ${open || query ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 10,
          padding: '0 10px',
          width: 220,
          height: 34,
          transition: 'all 0.2s ease',
          gap: 6,
        }}>
          {loading
            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            : <Search size={13} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search patient…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: '0.8rem', minWidth: 0,
            }}
          />
          {query && (
            <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.5)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 360, background: '#fff', borderRadius: 14,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.07)',
            zIndex: 9999, overflow: 'hidden',
            animation: 'fadeSlideDown 0.18s ease',
          }}>

            {/* Header */}
            <div style={{
              padding: '10px 14px 8px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {error ? 'Error' : loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
              </span>
              {isPhoneSearch && results.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#9333ea', fontWeight: 600 }}>
                  <Users size={11} /> Family group
                </span>
              )}
            </div>

            {/* Results */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {error ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626', fontSize: '0.82rem' }}>
                  ⚠️ {error}
                </div>
              ) : results.length === 0 && !loading ? (
                <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔍</div>
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.88rem' }}>No patients found</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                    Try searching by name, ID (e.g. ASR1234), or phone number
                  </div>
                </div>
              ) : (
                results.map((p, i) => {
                  const avatarColor = getAvatarColor(p.name);
                  const initials = p.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
                  const lastVisit = p.latestAppointment?.date
                    ? new Date(p.latestAppointment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : null;

                  return (
                    <button
                      key={p._id}
                      onClick={() => handleSelect(p)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: i < results.length - 1 ? '1px solid #f8fafc' : 'none',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: `${avatarColor}18`,
                        border: `2px solid ${avatarColor}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, color: avatarColor,
                        flexShrink: 0,
                      }}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
                            {p.designation ? `${p.designation}. ` : ''}{p.name}
                          </span>
                          <MatchBadge type={p.matchType} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {p.patientId}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {p.age}Y · {p.gender?.charAt(0) || '?'}
                          </span>
                          {p.phone && (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Phone size={9} /> {p.phone}
                            </span>
                          )}
                        </div>
                        {lastVisit && (
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={9} />
                            Last visit: {lastVisit}
                            {p.latestAppointment?.status && (
                              <span style={{
                                background: p.latestAppointment.status === 'REVIEWED' ? '#d1fae5' : '#eff6ff',
                                color: p.latestAppointment.status === 'REVIEWED' ? '#059669' : '#2563eb',
                                borderRadius: 99, padding: '0 5px', fontSize: '0.6rem', fontWeight: 700,
                              }}>
                                {p.latestAppointment.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer tip */}
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: '#fafbff',
            }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                <kbd style={{ background: '#e2e8f0', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace' }}>Name</kbd>
                &nbsp;or&nbsp;
                <kbd style={{ background: '#e2e8f0', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace' }}>ASR1234</kbd>
                &nbsp;or&nbsp;
                <kbd style={{ background: '#e2e8f0', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace' }}>9876543210</kbd>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Patient Dashboard Modal */}
      {selectedPatient && (
        <PatientDashboardModal
          patient={selectedPatient}
          initialTab="Profile"
          appointmentId={null}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default GlobalPatientSearch;
