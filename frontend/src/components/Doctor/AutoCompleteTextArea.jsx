import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';

const AutoCompleteTextArea = ({ value, onChange, type, placeholder, rows = 2, className = '', style = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const textareaRef = useRef(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    if (showDropdown && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [showDropdown]);

  // Update cursor position
  const updateCursorPos = () => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  };

  const textBeforeCursor = (value || '').substring(0, cursorPos);
  const currentLine = textBeforeCursor.split('\n').pop() || '';

  useEffect(() => {
    let cancelled = false;
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await doctorService.getSuggestions(type, currentLine.trim());
        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };

    // Reduced debounce to 150ms for faster feedback
    const timeoutId = setTimeout(fetchSuggestions, 150);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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

  const currentLineLower = currentLine.trim().toLowerCase();
  const filteredSuggestions = (suggestions || [])
    .filter(s => typeof s === 'string' && (!currentLineLower || s.toLowerCase().includes(currentLineLower)))
    .sort((a, b) => {
      if (!currentLineLower) return 0;
      const aStarts = a.toLowerCase().startsWith(currentLineLower);
      const bStarts = b.toLowerCase().startsWith(currentLineLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });

  return (
    <div className="position-relative flex-grow-1 w-100" ref={dropdownRef}>
      <textarea
        ref={textareaRef}
        className={`hp-form-input ${className}`}
        style={style}
        rows={rows}
        placeholder={placeholder}
        value={value || ''}
        onChange={e => {
          const nextVal = e.target.value;
          const nextPos = e.target.selectionStart ?? nextVal.length;
          onChange(nextVal);
          setCursorPos(nextPos);
          setShowDropdown(true);
        }}
        onKeyUp={updateCursorPos}
        onClick={updateCursorPos}
        onFocus={handleFocus}
      />
      
      {showDropdown && filteredSuggestions.length > 0 && (
        <div
          className="hp-dropdown position-absolute"
          style={{
            top: openUpward ? 'auto' : '100%',
            bottom: openUpward ? '100%' : 'auto',
            marginTop: openUpward ? 0 : '6px',
            marginBottom: openUpward ? '6px' : 0,
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            width: '100%',
            zIndex: 9999,
            background: '#ffffff',
            backgroundColor: '#ffffff',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            opacity: 1,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
          }}
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div 
              key={idx} 
              className="hp-dropdown-item"
              style={{
                backgroundColor: '#ffffff',
                borderBottom: idx < filteredSuggestions.length - 1 ? '1px solid #f1f3f5' : 'none'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectSuggestion(suggestion);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectSuggestion(suggestion);
              }}
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
