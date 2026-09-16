import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader, X, CheckCircle } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';

const PatientSearchAutocomplete = ({ onSelect, selectedPatient, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onClear) onClear(); // Tell parent we are typing again (clears selectedPat)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || val.trim().length < 1) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await frontdeskService.searchPatients(val.trim());
        setSuggestions(results || []);
        setDropdownOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const fillPatient = (p) => {
    setSearchQuery(p.name);
    setDropdownOpen(false);
    setSuggestions([]);
    if (onSelect) onSelect(p);
  };

  return (
    <div className="mb-4" ref={searchRef}>
      {/* Search input */}
      <div className="position-relative">
        <div className="d-flex align-items-center rounded-3 border overflow-hidden"
          style={{ backgroundColor: '#fff', borderColor: dropdownOpen ? '#1d4ed8' : '#d1d5db', boxShadow: dropdownOpen ? '0 0 0 3px rgba(29,78,216,0.12)' : 'none', transition: 'all 0.15s' }}>
          <div className="d-flex align-items-center px-3" style={{ color: '#9ca3af', flexShrink: 0 }}>
            {searching
              ? <Loader size={17} style={{ animation: 'spin 1s linear infinite', color: '#1d4ed8' }} />
              : <Search size={17} />}
          </div>
          <input
            type="text"
            className="form-control border-0 shadow-none py-2 px-0 fw-medium"
            placeholder="Search by Patient ID (ASR000001), name, or phone…"
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
            onKeyDown={e => e.key === 'Escape' && setDropdownOpen(false)}
            autoComplete="off"
            style={{ fontSize: '0.88rem', color: '#1e293b', background: 'transparent' }}
          />
          {searchQuery && (
            <button type="button" className="btn border-0 p-0 px-3 text-secondary"
              onClick={() => { setSearchQuery(''); setSuggestions([]); setDropdownOpen(false); if (onClear) onClear(); }}>
              <X size={15} />
            </button>
          )}
        </div>
        <div className="mt-1 small" style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
          Type any 1+ character to search · Works with ID, name, or phone number
        </div>

        {/* Dropdown */}
        {dropdownOpen && suggestions.length > 0 && (
          <div className="position-absolute w-100 bg-white rounded-3 border shadow-lg"
            style={{ top: 'calc(100% - 2px)', left: 0, zIndex: 9999, maxHeight: 300, overflowY: 'auto', borderColor: '#e2e8f0' }}>
            <div className="px-3 py-2 border-bottom" style={{ backgroundColor: '#f8fafc' }}>
              <span className="small text-secondary fw-semibold">{suggestions.length} patient{suggestions.length !== 1 ? 's' : ''} found</span>
            </div>
            {suggestions.map((p, i) => (
              <div key={p._id || i}
                className="d-flex align-items-center gap-3 px-3 py-2 border-bottom"
                style={{ cursor: 'pointer', backgroundColor: '#fff', transition: 'background 0.1s', borderLeft: '3px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f0f7ff'; e.currentTarget.style.borderLeftColor = '#1d4ed8'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderLeftColor = 'transparent'; }}
                onMouseDown={e => { e.preventDefault(); fillPatient(p); }}
              >
                {/* Avatar */}
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: '#fff', fontSize: '0.9rem' }}>
                  {p.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.9rem' }}>{p.name}</span>
                    {p.patientId && (
                      <span className="badge rounded-pill px-2"
                        style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                        {p.patientId}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {p.age && <span>{p.age} yrs</span>}
                    {p.gender && <span>· {p.gender}</span>}
                    {p.phone && <><span>·</span><span style={{ color: '#1d4ed8', fontWeight: 600 }}>{p.phone}</span></>}
                    {p.latestAppointment?.doctorName && (
                      <span style={{ color: '#94a3b8' }}>· Dr. {p.latestAppointment.doctorName}</span>
                    )}
                  </div>
                </div>
                <div className="fw-semibold flex-shrink-0" style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>Select ›</div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {dropdownOpen && !searching && suggestions.length === 0 && searchQuery.trim().length >= 1 && (
          <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm text-center py-3"
            style={{ top: 'calc(100% - 2px)', left: 0, zIndex: 9999 }}>
            <div className="small text-secondary">No matching patient found</div>
            <div className="small text-secondary" style={{ fontSize: '0.72rem' }}>Fill the details below to register as new patient</div>
          </div>
        )}
      </div>

      {/* Selected confirmation ribbon */}
      {selectedPatient && (
        <div className="mt-2 d-flex align-items-center gap-2 px-3 py-2 rounded-3"
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CheckCircle size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span className="small fw-semibold" style={{ color: '#15803d' }}>
            Auto-filled: <strong>{selectedPatient.name}</strong>
          </span>
          <span className="badge rounded-pill ms-1" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.68rem', border: '1px solid #bbf7d0' }}>
            {selectedPatient.patientId}
          </span>
        </div>
      )}
    </div>
  );
};

export default PatientSearchAutocomplete;
