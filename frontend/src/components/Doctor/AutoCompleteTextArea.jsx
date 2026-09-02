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
    <div className="position-relative flex-grow-1 w-100" ref={dropdownRef}>
      <textarea
        className="hp-form-input"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
      />
      
      {showDropdown && filteredSuggestions.length > 0 && (
        <div className="hp-dropdown position-absolute mt-2" style={{ top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', width: '100%' }}>
          {filteredSuggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className="hp-dropdown-item" 
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
