import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import doctorService from '../../services/doctorService';

const AutoCompleteTagInput = ({ tags, setTags, type, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await doctorService.getSuggestions(type, '');
        // Filter by what is typed and remove already selected tags
        const filtered = data.filter(s => 
          s.toLowerCase().includes(inputValue.toLowerCase()) && 
          !tags.includes(s.toUpperCase())
        );
        setSuggestions(filtered);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };
    
    // Simple debounce
    const timeoutId = setTimeout(fetchSuggestions, 300);
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
    if (!tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setInputValue('');
    setShowDropdown(false);
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
    <div className="flex-grow-1 border rounded p-2 d-flex flex-wrap gap-2 align-items-center bg-white shadow-sm position-relative" ref={dropdownRef}>
      {tags.map((tag, i) => (
        <span key={i} className="badge text-dark d-flex align-items-center gap-1" style={{ fontSize: '0.8rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c' }}>
          {tag} <X size={12} className="cursor-pointer" onClick={() => handleRemoveTag(i)}/>
        </span>
      ))}
      <div className="position-relative flex-grow-1" style={{ minWidth: '150px' }}>
        <input 
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
          <div className="position-absolute bg-white border rounded shadow mt-1" style={{ top: '100%', left: 0, right: 0, zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
            {suggestions.map((suggestion, idx) => (
              <div 
                key={idx} 
                className="px-3 py-2 cursor-pointer text-primary" 
                style={{ fontSize: '0.85rem' }}
                onMouseEnter={e => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
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
