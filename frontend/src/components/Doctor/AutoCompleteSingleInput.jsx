import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

const AutoCompleteSingleInput = ({ value, onChange, onSelect, onKeyDown, type, placeholder, defaultOptions = [], className = '', style = {}, disableFilter = false }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions(defaultOptions);
        return;
      }
      try {
        let dbSuggestions = [];
        if (disableFilter || value.trim().length > 0) {
            dbSuggestions = await doctorService.getSuggestions(type, disableFilter ? '' : value);
        }
        
        const valLower = value.toLowerCase();
        
        let dynamicOpts = [];
        if (type === 'DURATION' && value.trim().length > 0) {
            const numMatch = value.trim().match(/^(\d+)$/);
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

        let combined = [...dynamicOpts, ...defaultOptions, ...dbSuggestions];
        const seen = new Set();
        combined = combined.filter(item => {
            const lower = item.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
        });
        
        if (!disableFilter && value.trim().length > 0) {
            combined = combined.filter(s => {
                if (dynamicOpts.includes(s)) return true;
                return s.toLowerCase().includes(valLower);
            });
        }

        setSuggestions(combined);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };
    
    // Reduced debounce to 100ms for snappier responses
    const timeoutId = setTimeout(fetchSuggestions, 100);
    return () => clearTimeout(timeoutId);
  }, [value, type, JSON.stringify(defaultOptions)]); 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (text) => {
    onChange(text);
    if (onSelect) onSelect(text);
    setShowDropdown(false);
    
    // Refocus so the user can easily tab to the next field or continue typing
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  return (
    <div className="position-relative w-100" ref={dropdownRef}>
      <input 
        ref={inputRef}
        type="text" 
        className={className}
        style={style}
        placeholder={placeholder} 
        value={value} 
        onChange={e => {
            onChange(e.target.value);
            setShowDropdown(true);
        }} 
        onBlur={() => {
            if (onSelect && value.trim().length > 0) {
                onSelect(value);
            }
        }}
        onKeyDown={(e) => {
          if (onKeyDown) onKeyDown(e);
        }}
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="hp-dropdown position-absolute mt-1" style={{ top: '100%', left: 0, minWidth: '150px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {suggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className="hp-dropdown-item p-2 cursor-pointer"
              style={{ borderBottom: '1px solid #f8f9fa', cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoCompleteSingleInput;
