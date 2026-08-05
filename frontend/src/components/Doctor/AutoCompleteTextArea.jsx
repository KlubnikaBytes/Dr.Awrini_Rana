import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

const AutoCompleteTextArea = ({ value, onChange, type, placeholder, rows = 2 }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchSuggestions = async () => {
    try {
      const data = await doctorService.getSuggestions(type, '');
      setSuggestions(data);
    } catch (err) {
      console.error('Error fetching suggestions', err);
    }
  };

  const handleFocus = () => {
    if (suggestions.length === 0) {
      fetchSuggestions();
    }
    setShowDropdown(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion) => {
    const lines = (value || '').split('\n');
    lines.pop(); // Remove the current line being typed
    const newVal = lines.length > 0 ? `${lines.join('\n')}\n${suggestion}\n` : `${suggestion}\n`;
    onChange(newVal);
    setShowDropdown(false);
  };

  // Filter suggestions based on the last line typed
  const currentLine = (value || '').split('\n').pop().toLowerCase();
  const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(currentLine));

  return (
    <div className="position-relative flex-grow-1" ref={dropdownRef}>
      <textarea
        className="form-control shadow-sm"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
      />
      
      {showDropdown && filteredSuggestions.length > 0 && (
        <div 
          className="position-absolute bg-white border rounded shadow" 
          style={{ 
            top: '100%', 
            left: 0, 
            width: '300px', 
            zIndex: 1000, 
            maxHeight: '200px', 
            overflowY: 'auto',
            marginTop: '2px'
          }}
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className="px-3 py-2 cursor-pointer text-primary border-bottom" 
              style={{ fontSize: '0.85rem' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoCompleteTextArea;
