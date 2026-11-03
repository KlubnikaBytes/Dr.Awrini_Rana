import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';
import { Trash2 } from 'lucide-react';

// Module-level cache for DB suggestions by type
const dbSuggestionsCache = {};

export const addSuggestionToCache = (type, text) => {
  if (!type || !text || !text.trim()) return;
  const trimmed = text.trim();
  if (!dbSuggestionsCache[type]) {
    dbSuggestionsCache[type] = [];
  }
  const exists = dbSuggestionsCache[type].some(
    item => typeof item === 'string' && item.toLowerCase() === trimmed.toLowerCase()
  );
  if (!exists) {
    dbSuggestionsCache[type] = [trimmed, ...dbSuggestionsCache[type]];
  }
};

export const removeSuggestionFromCache = (type, text) => {
  if (!type || !text || !dbSuggestionsCache[type]) return;
  const trimmed = String(text).trim().toLowerCase();
  dbSuggestionsCache[type] = dbSuggestionsCache[type].filter(
    item => typeof item === 'string' && item.trim().toLowerCase() !== trimmed
  );
};

const rankSuggestions = (optionsList, query, dynamicOpts = []) => {
  const q = String(query || '').trim().toLowerCase();

  // Deduplicate case-insensitively while preserving original order
  const seen = new Set();
  const all = [...dynamicOpts, ...optionsList].filter(item => {
    if (!item || typeof item !== 'string' || !item.trim()) return false;
    const lower = item.trim().toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  if (!q) {
    return all;
  }

  const exactMatches = [];
  const prefixMatches = [];
  const wordPrefixMatches = [];
  const substringMatches = [];
  const multiWordMatches = [];
  const otherOptions = [];

  const queryWords = q.split(/\s+/).filter(Boolean);

  all.forEach(item => {
    const itemLower = item.toLowerCase();
    if (itemLower === q) {
      exactMatches.push(item);
    } else if (itemLower.startsWith(q)) {
      prefixMatches.push(item);
    } else {
      const words = itemLower.split(/[\s,./-]+/).filter(Boolean);
      const hasWordPrefix = words.some(w => w.startsWith(q));
      if (hasWordPrefix) {
        wordPrefixMatches.push(item);
      } else if (itemLower.includes(q)) {
        substringMatches.push(item);
      } else if (queryWords.length > 1 && queryWords.every(w => itemLower.includes(w))) {
        multiWordMatches.push(item);
      } else {
        otherOptions.push(item);
      }
    }
  });

  // If the user typed something custom that doesn't match any option prefix or exact,
  // offer the typed text as an option at the top so the user can easily see and select it
  let customOption = [];
  const trimmedRaw = String(query || '').trim();
  const hasPrefixOrExact = exactMatches.length > 0 || prefixMatches.length > 0;
  if (trimmedRaw && !all.some(i => i.toLowerCase() === q) && !hasPrefixOrExact) {
    customOption = [trimmedRaw];
  }

  return [
    ...exactMatches,
    ...customOption,
    ...prefixMatches,
    ...wordPrefixMatches,
    ...substringMatches,
    ...multiWordMatches,
    ...otherOptions
  ];
};

const renderHighlightedText = (text, query) => {
  if (!query || !text || typeof text !== 'string') return text;
  const qTrim = query.trim().toLowerCase();
  if (!qTrim) return text;
  const tLower = text.toLowerCase();
  const idx = tLower.indexOf(qTrim);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + qTrim.length);
  const after = text.slice(idx + qTrim.length);

  return (
    <span>
      {before}
      <span style={{ fontWeight: '700', color: '#0d6efd' }}>{match}</span>
      {after}
    </span>
  );
};

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

  // Persist a new custom value to the database and in-memory cache
  const persistNewValue = async (valToSave) => {
    if (!type || !valToSave || typeof valToSave !== 'string') return;
    const trimmed = valToSave.trim();
    if (!trimmed || trimmed.length < 1) return;

    // Skip pure numbers unless DOSAGE
    if (/^\d+$/.test(trimmed) && type !== 'DOSAGE') return;

    const inDefaults = (defaultOptions || []).some(
      opt => typeof opt === 'string' && opt.toLowerCase() === trimmed.toLowerCase()
    );
    const inCache = (dbSuggestionsCache[type] || []).some(
      opt => typeof opt === 'string' && opt.toLowerCase() === trimmed.toLowerCase()
    );

    if (inDefaults && inCache) return;

    // Update in-memory cache so other rows of this type immediately have it
    addSuggestionToCache(type, trimmed);

    // Update suggestions state
    setSuggestions(prev => {
      const exists = prev.some(
        opt => typeof opt === 'string' && opt.toLowerCase() === trimmed.toLowerCase()
      );
      return exists ? prev : [trimmed, ...prev];
    });

    // Save to DB in background
    try {
      await doctorService.addSuggestion({ type, text: trimmed });
    } catch (err) {
      console.error('Error saving suggestion to DB:', err);
    }
  };

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

      const rawCombined = [...(defaultOptions || []), ...(dbList || [])];
      return rankSuggestions(rawCombined, value, dynamicOpts);
    };

    const fetchSuggestions = async () => {
      if (!type) {
        if (isMounted) setSuggestions(buildSuggestions([]));
        return;
      }

      try {
        let dbList = [];

        if (disableFilter || ['WHEN', 'FREQUENCY', 'DURATION', 'NOTES', 'DOSAGE', 'TEST_INSTRUCTION'].includes(type)) {
          // Check in-memory cache first for instant dropdown display
          if (dbSuggestionsCache[type]) {
            dbList = dbSuggestionsCache[type];
            if (isMounted) setSuggestions(buildSuggestions(dbList));
          } else {
            if (isMounted) setSuggestions(buildSuggestions([]));
          }

          // Fetch all items from API
          const res = await doctorService.getSuggestions(type, '');
          const serverList = Array.isArray(res) ? res : [];
          dbSuggestionsCache[type] = [...new Set([...(dbSuggestionsCache[type] || []), ...serverList])];

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

    if (disableFilter || ['WHEN', 'FREQUENCY', 'DURATION', 'NOTES', 'DOSAGE', 'TEST_INSTRUCTION'].includes(type)) {
      fetchSuggestions();
      return () => { isMounted = false; };
    } else {
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
    if (showDropdown) {
      const container = dropdownRef.current?.querySelector('.hp-dropdown');
      if (container) {
        // If query is empty and there is an exact match, scroll to it; otherwise ensure top is visible
        if (selectedItemRef.current && (!value || String(value).trim() === '')) {
          const item = selectedItemRef.current;
          const itemTop = item.offsetTop;
          const itemBottom = itemTop + item.offsetHeight;
          const containerTop = container.scrollTop;
          const containerBottom = containerTop + container.clientHeight;
          if (itemTop < containerTop) {
            container.scrollTop = itemTop;
          } else if (itemBottom > containerBottom) {
            container.scrollTop = itemBottom - container.clientHeight;
          }
        } else {
          container.scrollTop = 0;
        }
      }
    }
  }, [showDropdown, value]);

  useEffect(() => {
    const handleCustomDelete = (e) => {
      if (e.detail?.type === type && e.detail?.text) {
        const delText = String(e.detail.text).trim().toLowerCase();
        setSuggestions(prev => prev.filter(s => String(s).trim().toLowerCase() !== delText));
      }
    };
    window.addEventListener('hp-suggestion-deleted', handleCustomDelete);
    return () => window.removeEventListener('hp-suggestion-deleted', handleCustomDelete);
  }, [type]);

  const handleSelect = (text) => {
    onChange(text);
    if (onSelect) onSelect(text);
    persistNewValue(text);
    setShowDropdown(false);
  };

  const handleDeleteSuggestion = async (e, itemToDelete) => {
    e.preventDefault();
    e.stopPropagation();

    const trimmed = String(itemToDelete).trim().toLowerCase();

    // 1. Instantly remove from local suggestions state
    setSuggestions(prev => prev.filter(s => String(s).trim().toLowerCase() !== trimmed));

    // 2. Remove from in-memory cache
    removeSuggestionFromCache(type, itemToDelete);

    // 3. Broadcast to any other open input instances
    window.dispatchEvent(new CustomEvent('hp-suggestion-deleted', { detail: { type, text: itemToDelete } }));

    // 4. Delete from DB in background
    try {
      await doctorService.deleteSuggestion(type, itemToDelete);
    } catch (err) {
      console.error('Error deleting suggestion from DB:', err);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (value && String(value).trim().length > 0) {
        if (onSelect) onSelect(value);
        persistNewValue(value);
      }
    }, 200);
  };

  return (
    <div className="position-relative w-100" ref={dropdownRef} onClick={() => setShowDropdown(true)}>
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
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setShowDropdown(false);
          } else if (e.key === 'Enter') {
            if (value && String(value).trim().length > 0) {
              persistNewValue(value);
              setShowDropdown(false);
            }
          }
          if (onKeyDown) onKeyDown(e);
        }}
      />
      {showDropdown && suggestions.length > 0 && (
        <div
          className="hp-dropdown position-absolute mt-1 shadow-sm"
          style={{
            top: '100%',
            left: type === 'NOTES' ? 'auto' : 0,
            right: type === 'NOTES' ? 0 : 'auto',
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '340px',
            maxHeight: '230px',
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
            const isCustomNew = Boolean(
              value &&
              String(value).trim().toLowerCase() === String(suggestion).trim().toLowerCase() &&
              !(defaultOptions || []).some(o => typeof o === 'string' && o.toLowerCase() === String(suggestion).trim().toLowerCase()) &&
              !(dbSuggestionsCache[type] || []).some(o => typeof o === 'string' && o.toLowerCase() === String(suggestion).trim().toLowerCase())
            );

            // Restricted ONLY to these 5 fields
            const isOneOfFive = ['DOSAGE', 'WHEN', 'FREQUENCY', 'DURATION', 'NOTES'].includes(type);

            // Check if it is a default hardcoded option
            const isDefault = (defaultOptions || []).some(
              o => typeof o === 'string' && o.trim().toLowerCase() === String(suggestion).trim().toLowerCase()
            );

            // Check if dynamically generated option (e.g. "852 Days", "852 Weeks", etc.)
            const isDynamic = Boolean(
              type === 'DURATION' &&
              /^\d+\s+(Day|Days|Week|Weeks|Month|Months|Year|Years)$/i.test(String(suggestion).trim()) &&
              !isDefault
            );

            // Only deletable if it is one of the 5, NOT default, NOT dynamic, and NOT an unsaved "Add new" draft
            const isDeletable = isOneOfFive && !isDefault && !isDynamic && !isCustomNew;

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
                  const btn = e.currentTarget.querySelector('.delete-suggestion-btn');
                  if (btn) btn.style.visibility = 'visible';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected ? '#e8f0fe' : 'transparent';
                  const btn = e.currentTarget.querySelector('.delete-suggestion-btn');
                  if (btn) btn.style.visibility = 'hidden';
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents input from losing focus prematurely
                  handleSelect(suggestion);
                }}
              >
                <span className="d-flex align-items-center gap-1">
                  {renderHighlightedText(suggestion, value)}
                  {isCustomNew && (
                    <span className="badge bg-light text-primary border ms-2" style={{ fontSize: '0.68rem', fontWeight: 500 }}>
                      Add new
                    </span>
                  )}
                </span>
                <div className="d-flex align-items-center gap-2 ms-2">
                  {isSelected && (
                    <span className="text-primary fw-bold" style={{ fontSize: '0.85rem' }}>✓</span>
                  )}
                  {isDeletable && (
                    <button
                      type="button"
                      className="delete-suggestion-btn btn btn-sm p-0 border-0 bg-transparent text-secondary"
                      style={{
                        visibility: 'hidden',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        transition: 'color 0.15s, background-color 0.15s',
                        lineHeight: 1
                      }}
                      title={`Delete "${suggestion}"`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#dc3545';
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#6c757d';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleDeleteSuggestion(e, suggestion)}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutoCompleteSingleInput;
