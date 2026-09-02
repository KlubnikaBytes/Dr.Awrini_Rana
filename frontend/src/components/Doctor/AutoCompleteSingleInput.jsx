import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

const AutoCompleteSingleInput = ({ value, onChange, onSelect, onKeyDown, type, placeholder, defaultOptions = [], className = '', style = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions(defaultOptions);
        return;
      }
      try {
        // Fetch suggestions for this type matching the current input
        const dbSuggestions = await doctorService.getSuggestions(type, value);
        
        // Combine default options and DB suggestions
        const valLower = value.toLowerCase();
        
        let combined = [...defaultOptions, ...dbSuggestions];
        // Unique options
        combined = [...new Set(combined)];
        
        // Filter by current input
        if (value.trim().length > 0) {
            combined = combined.filter(s => s.toLowerCase().includes(valLower));
        }

        setSuggestions(combined);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [value, type, JSON.stringify(defaultOptions)]); // stringify to prevent infinite loop from inline arrays

  // Handle outside click
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
  };

  return (
    <div className="position-relative w-100" ref={dropdownRef}>
      <input 
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
        <div className="hp-dropdown position-absolute mt-1" style={{ top: '100%', left: 0, minWidth: '150px', maxHeight: '200px', overflowY: 'auto' }}>
          {suggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className="hp-dropdown-item" 
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
