import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

const AutoCompleteTextArea = ({ value, onChange, type, placeholder, rows = 2 }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const textareaRef = useRef(null);
  const [cursorPos, setCursorPos] = useState(0);

  // Update cursor position
  const updateCursorPos = () => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  };

  const textBeforeCursor = (value || '').substring(0, cursorPos);
  const currentLine = textBeforeCursor.split('\n').pop() || '';

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await doctorService.getSuggestions(type, currentLine.trim());
        setSuggestions(data);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };

    // Reduced debounce to 150ms for faster feedback
    const timeoutId = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [currentLine, type]);

  const handleFocus = () => {
    updateCursorPos();
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
    const fullText = value || '';
    const textBefore = fullText.substring(0, cursorPos);
    const textAfter = fullText.substring(cursorPos);
    
    // Replace the current line in textBefore with the suggestion + newline
    const linesBefore = textBefore.split('\n');
    linesBefore.pop(); // remove the partial line being typed
    
    let newTextBefore = linesBefore.length > 0 ? linesBefore.join('\n') + '\n' : '';
    newTextBefore += suggestion + '\n';
    
    const newVal = newTextBefore + textAfter;
    onChange(newVal);
    
    setShowDropdown(false);
    
    // Focus back on the textarea and move cursor to the end of the newly inserted suggestion
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = newTextBefore.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPos(newCursorPos);
      }
    }, 0);
  };

  const currentLineLower = currentLine.toLowerCase();
  const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(currentLineLower));

  return (
    <div className="position-relative flex-grow-1 w-100" ref={dropdownRef}>
      <textarea
        ref={textareaRef}
        className="hp-form-input"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          updateCursorPos();
          setShowDropdown(true);
        }}
        onKeyUp={updateCursorPos}
        onClick={updateCursorPos}
        onFocus={handleFocus}
      />
      
      {showDropdown && filteredSuggestions.length > 0 && (
        <div className="hp-dropdown position-absolute mt-2" style={{ top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', width: '100%', zIndex: 1000 }}>
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
