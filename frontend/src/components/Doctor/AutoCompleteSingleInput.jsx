import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

const AutoCompleteSingleInput = ({ value, onChange, onSelect, type, placeholder, defaultOptions = [], className = '', style = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        // Fetch all suggestions for this type
        const dbSuggestions = await doctorService.getSuggestions(type, '');
        
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
  }, [value, type, defaultOptions]);

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
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="position-absolute bg-white border rounded shadow mt-1" style={{ top: '100%', left: 0, minWidth: '150px', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
          {suggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className="px-3 py-2 cursor-pointer text-primary" 
              style={{ fontSize: '0.85rem' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
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
