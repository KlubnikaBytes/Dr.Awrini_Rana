import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

// Module-level cache for DB suggestions by type when disableFilter is true
const dbSuggestionsCache = {};

const AutoCompleteSingleInput = ({
  value = '',
  onChange,
  onSelect,
  onKeyDown,
  type,
  placeholder,
  defaultOptions = [],
  className = '',
  style = {},
  disableFilter = false
}) => {
  const [suggestions, setSuggestions] = useState(() => {
    return Array.isArray(defaultOptions) ? defaultOptions : [];
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const selectedItemRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const buildSuggestions = (dbList) => {
      let dynamicOpts = [];
      if (type === 'DURATION' && value && String(value).trim().length > 0) {
        const numMatch = String(value).trim().match(/^(\d+)$/);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          const suffixS = num > 1 ? 's' : '';
          dynamicOpts = [
            `${num} Day${suffixS}`,
            `${num} Week${suffixS}`,
            `${num} Month${suffixS}`,
            `${num} Year${suffixS}`
          ];
        }
      }

      let combined = [...dynamicOpts, ...(defaultOptions || []), ...(dbList || [])];

      // If disableFilter is true and value is non-empty, ensure value is in options if custom
      if (disableFilter && value && String(value).trim().length > 0) {
        const valTrimmed = String(value).trim();
        const exists = combined.some(
          item => typeof item === 'string' && item.toLowerCase() === valTrimmed.toLowerCase()
        );
        if (!exists) {
          combined = [valTrimmed, ...combined];
        }
      }

      // Deduplicate case-insensitively while preserving order
      const seen = new Set();
      combined = combined.filter(item => {
        if (!item || typeof item !== 'string' || !item.trim()) return false;
        const lower = item.trim().toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });

      // Filter only if disableFilter is FALSE and value is present
      if (!disableFilter && value && String(value).trim().length > 0) {
        const valLower = String(value).toLowerCase();
        combined = combined.filter(s => {
          if (dynamicOpts.includes(s)) return true;
          return s.toLowerCase().includes(valLower);
        });
      }

      return combined;
    };

    const fetchSuggestions = async () => {
      if (!type) {
        if (isMounted) setSuggestions(buildSuggestions([]));
        return;
      }

      try {
        let dbList = [];

        if (disableFilter) {
          // Check cache first for instant dropdown options
          if (dbSuggestionsCache[type]) {
            dbList = dbSuggestionsCache[type];
            if (isMounted) setSuggestions(buildSuggestions(dbList));
          } else {
            // Immediately show default options while fetching from DB
            if (isMounted) setSuggestions(buildSuggestions([]));
          }

          // Fetch from API with empty query to get all items
          const res = await doctorService.getSuggestions(type, '');
          dbSuggestionsCache[type] = res || [];
          if (isMounted) {
            setSuggestions(buildSuggestions(dbSuggestionsCache[type]));
          }
        } else {
          // Normal search filtering (e.g. MEDICINE)
          if (value && String(value).trim().length > 0) {
            dbList = await doctorService.getSuggestions(type, value);
          }
          if (isMounted) {
            setSuggestions(buildSuggestions(dbList));
          }
        }
      } catch (err) {
        console.error('Error fetching suggestions', err);
        if (isMounted) {
          setSuggestions(buildSuggestions([]));
        }
      }
    };

    if (disableFilter) {
      // Immediate execution without debounce if disableFilter is true
      fetchSuggestions();
      return () => { isMounted = false; };
    } else {
      // Debounce only when user is typing in a filtering input (like MEDICINE)
      const timeoutId = setTimeout(fetchSuggestions, 300);
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [value, type, disableFilter, JSON.stringify(defaultOptions)]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDropdown && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [showDropdown]);

  const handleSelect = (text) => {
    onChange(text);
    if (onSelect) onSelect(text);
    setShowDropdown(false);
  };

  return (
    <div className="position-relative w-100" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        className={className}
        style={style}
        placeholder={placeholder}
        value={value || ''}
        onChange={e => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onClick={() => setShowDropdown(true)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => {
          if (onSelect && value && String(value).trim().length > 0) {
            onSelect(value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowDropdown(false);
          }
          if (onKeyDown) onKeyDown(e);
        }}
      />
      {showDropdown && suggestions.length > 0 && (
        <div
          className="hp-dropdown position-absolute mt-1 shadow-sm"
          style={{
            top: '100%',
            left: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '320px',
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 1050,
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
          }}
        >
          {suggestions.map((suggestion, idx) => {
            const isSelected = Boolean(
              value &&
              String(value).trim().toLowerCase() === String(suggestion).trim().toLowerCase()
            );
            return (
              <div
                key={idx}
                ref={isSelected ? selectedItemRef : null}
                className="hp-dropdown-item px-3 py-2 cursor-pointer d-flex align-items-center justify-content-between"
                style={{
                  borderBottom: idx < suggestions.length - 1 ? '1px solid #f1f3f5' : 'none',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#e8f0fe' : 'transparent',
                  color: isSelected ? '#0d6efd' : '#212529',
                  fontWeight: isSelected ? '600' : '400',
                  fontSize: '0.88rem',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected ? '#e8f0fe' : 'transparent';
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents input from losing focus prematurely
                  handleSelect(suggestion);
                }}
              >
                <span>{suggestion}</span>
                {isSelected && (
                  <span className="ms-2 text-primary fw-bold" style={{ fontSize: '0.85rem' }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutoCompleteSingleInput;
