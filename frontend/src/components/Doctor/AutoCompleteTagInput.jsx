import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import doctorService from '../../services/doctorService';

const AutoCompleteTagInput = ({ tags, setTags, type, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await doctorService.getSuggestions(type, inputValue.trim());
        setSuggestions(data);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };
    
    // Reduce debounce to 150ms for faster feedback
    const timeoutId = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [inputValue, type, tags]);

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

  const handleAddTag = (text) => {
    if (!text.trim()) return;
    const newTag = text.trim().toUpperCase();
    setTags([...tags, newTag]);
    setInputValue('');
    setShowDropdown(false);
    
    // Refocus the input so user can immediately type the next tag
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue) {
        handleAddTag(inputValue);
      }
    }
  };

  return (
    <div className="hp-tag-container d-flex flex-wrap gap-2 align-items-center position-relative w-100" ref={dropdownRef}>
      {tags.map((tag, i) => (
        <span key={i} className="badge text-dark d-flex align-items-center gap-1" style={{ fontSize: '0.8rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c' }}>
          {tag} <X size={12} className="cursor-pointer" onClick={() => handleRemoveTag(i)}/>
        </span>
      ))}
      <div className="position-relative flex-grow-1" style={{ minWidth: '150px' }}>
        <input 
          ref={inputRef}
          type="text" 
          className="border-0 w-100" 
          placeholder={placeholder} 
          style={{ outline: 'none', backgroundColor: 'transparent' }} 
          value={inputValue} 
          onChange={e => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }} 
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && suggestions.length > 0 && (
          <div className="hp-dropdown position-absolute mt-2" style={{ top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', zIndex: 1000, backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            {suggestions.map((suggestion, idx) => (
              <div 
                key={idx} 
                className="hp-dropdown-item p-2 cursor-pointer"
                style={{ borderBottom: '1px solid #f8f9fa', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={() => handleAddTag(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoCompleteTagInput;
