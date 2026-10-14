import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import doctorService from '../../services/doctorService';

const AutoCompleteTagInput = ({ tags = [], setTags, type, placeholder }) => {
  const safeTags = Array.isArray(tags) ? tags : [];

  // Main input state (for adding tags at the end)
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Insert in middle / at index state
  const [insertingAtIndex, setInsertingAtIndex] = useState(null);
  const [insertValue, setInsertValue] = useState('');
  const [insertSuggestions, setInsertSuggestions] = useState([]);
  const [showInsertDropdown, setShowInsertDropdown] = useState(false);
  const insertBoxRef = useRef(null);
  const insertInputRef = useRef(null);

  // Inline editing state (for double-click edit)
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);

  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Suggestions for main input (only fetched if not inserting in middle)
  useEffect(() => {
    if (insertingAtIndex !== null) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      if (!type) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await doctorService.getSuggestions(type, inputValue.trim());
        setSuggestions(data || []);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [inputValue, type, insertingAtIndex]);

  // Suggestions for middle-insert input
  useEffect(() => {
    if (insertingAtIndex === null || !type) {
      setInsertSuggestions([]);
      return;
    }
    const fetchInsertSuggestions = async () => {
      try {
        const data = await doctorService.getSuggestions(type, insertValue.trim());
        setInsertSuggestions(data || []);
      } catch (err) {
        console.error('Error fetching insert suggestions', err);
      }
    };

    const timeoutId = setTimeout(fetchInsertSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [insertValue, insertingAtIndex, type]);

  // Handle outside clicks: closes both dropdowns and inactive insert box
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (insertBoxRef.current && !insertBoxRef.current.contains(event.target)) {
        if (!insertValue.trim()) {
          setInsertingAtIndex(null);
        }
        setShowInsertDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [insertValue]);

  // Add tag at the end (from main input)
  const handleAddTag = (text) => {
    if (!text || !text.trim()) return;
    const newTag = text.trim().toUpperCase();
    setTags([...safeTags, newTag]);
    setInputValue('');
    setShowDropdown(false);

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  // Remove tag by index
  const handleRemoveTag = (indexToRemove) => {
    setTags(safeTags.filter((_, index) => index !== indexToRemove));
    if (insertingAtIndex !== null) {
      setInsertingAtIndex(null);
      setShowInsertDropdown(false);
    }
    if (editingIndex !== null) {
      setEditingIndex(null);
    }
  };

  // Confirm insert at middle index
  const handleConfirmInsert = (text) => {
    if (!text || !text.trim()) {
      handleCancelInsert();
      return;
    }
    const newTag = text.trim().toUpperCase();
    const targetIdx = insertingAtIndex !== null ? insertingAtIndex : safeTags.length;
    const nextTags = [...safeTags];
    nextTags.splice(targetIdx, 0, newTag);
    setTags(nextTags);

    setInsertingAtIndex(null);
    setInsertValue('');
    setShowInsertDropdown(false);
    setShowDropdown(false);

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  // Cancel middle insert
  const handleCancelInsert = () => {
    setInsertingAtIndex(null);
    setInsertValue('');
    setShowInsertDropdown(false);
    setShowDropdown(false);
  };

  // Confirm inline edit
  const handleConfirmEdit = () => {
    if (editingIndex === null) return;
    if (!editValue.trim()) {
      handleRemoveTag(editingIndex);
    } else {
      const nextTags = [...safeTags];
      nextTags[editingIndex] = editValue.trim().toUpperCase();
      setTags(nextTags);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const nextTags = [...safeTags];
    const [moved] = nextTags.splice(draggedIndex, 1);
    nextTags.splice(targetIndex, 0, moved);
    setTags(nextTags);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Key down for main input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && safeTags.length > 0) {
      handleRemoveTag(safeTags.length - 1);
    }
  };

  // Open insertion in middle: suppresses main dropdown and focuses middle input
  const openInsertAtIndex = (index) => {
    // 1. Force close and blur main input to ensure NO duplicate dropdown
    setShowDropdown(false);
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.blur();
    }

    // 2. Open middle insert
    setInsertingAtIndex(index);
    setInsertValue('');
    setShowInsertDropdown(true);

    setTimeout(() => {
      if (insertInputRef.current) {
        insertInputRef.current.focus();
      }
    }, 30);
  };

  // Focus main input: ensures middle input is closed
  const handleMainInputFocus = () => {
    if (insertingAtIndex !== null) {
      setInsertingAtIndex(null);
      setInsertValue('');
      setShowInsertDropdown(false);
    }
    setShowDropdown(true);
  };

  // Render insertion gap or active inline input at a given index
  const renderInsertSlot = (index) => {
    if (insertingAtIndex === index) {
      return (
        <div
          key={`insert-slot-${index}`}
          ref={insertBoxRef}
          className="hp-inline-insert-wrapper d-inline-flex align-items-center position-relative"
          style={{ zIndex: 1050 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={insertInputRef}
            type="text"
            className="hp-inline-insert-input"
            placeholder={placeholder ? `Add ${placeholder.toLowerCase().replace('...', '')}...` : "Add..."}
            value={insertValue}
            onChange={(e) => {
              setInsertValue(e.target.value);
              setShowInsertDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (insertValue.trim()) {
                  handleConfirmInsert(insertValue);
                } else {
                  handleCancelInsert();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelInsert();
              } else if (e.key === 'Backspace' && !insertValue) {
                e.preventDefault();
                handleCancelInsert();
              }
            }}
            onFocus={() => {
              setShowDropdown(false);
              setShowInsertDropdown(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                if (!insertValue.trim()) {
                  setInsertingAtIndex(null);
                  setShowInsertDropdown(false);
                }
              }, 180);
            }}
            autoFocus
          />

          {/* Autocomplete suggestions dropdown - ONLY rendered when insertingAtIndex === index */}
          {showInsertDropdown && insertingAtIndex === index && insertSuggestions.length > 0 && (
            <div
              className="hp-dropdown position-absolute"
              style={{
                top: 'calc(100% + 4px)',
                left: 0,
                minWidth: '200px',
                maxWidth: '300px',
                maxHeight: '180px',
                overflowY: 'auto',
                zIndex: 1100,
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
            >
              {insertSuggestions.map((suggestion, sIdx) => (
                <div
                  key={sIdx}
                  className="hp-dropdown-item p-2 cursor-pointer text-dark"
                  style={{ borderBottom: '1px solid #f8f9fa', fontSize: '0.85rem' }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#eff6ff')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConfirmInsert(suggestion);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <span
        key={`gap-${index}`}
        className="hp-tag-insert-gap"
        title="Click to add here"
        onClick={(e) => {
          e.stopPropagation();
          openInsertAtIndex(index);
        }}
      />
    );
  };

  // Smart container click: detects clicking in the middle between tags vs at the end
  const handleContainerClick = (e) => {
    e.stopPropagation();

    if (
      e.target.closest('.hp-tag-badge') ||
      e.target.closest('.hp-inline-insert-wrapper') ||
      e.target.closest('.hp-tag-insert-gap') ||
      e.target.closest('.hp-dropdown')
    ) {
      return;
    }

    const container = dropdownRef.current;
    if (!container || safeTags.length === 0) {
      handleMainInputFocus();
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    const tagElements = Array.from(container.querySelectorAll('.hp-tag-badge'));
    const clickX = e.clientX;
    const clickY = e.clientY;

    let handled = false;
    for (let i = 0; i < tagElements.length; i++) {
      const rect = tagElements[i].getBoundingClientRect();
      if (clickY >= rect.top - 8 && clickY <= rect.bottom + 8) {
        if (i === 0 && clickX < rect.left) {
          openInsertAtIndex(0);
          handled = true;
          break;
        }
        if (i < tagElements.length - 1) {
          const nextRect = tagElements[i + 1].getBoundingClientRect();
          if (nextRect.top < rect.bottom && clickX >= rect.right && clickX <= nextRect.left) {
            openInsertAtIndex(i + 1);
            handled = true;
            break;
          }
        }
      }
    }

    if (!handled) {
      // Clicked to the right of all tags or empty space at end
      handleMainInputFocus();
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <div
      className="hp-tag-container d-flex flex-wrap gap-2 align-items-center position-relative w-100 border rounded p-2 bg-white"
      style={{ minHeight: '40px' }}
      ref={dropdownRef}
      onClick={handleContainerClick}
    >
      {safeTags.map((tag, i) => {
        const tagLabel = typeof tag === 'string' ? tag : (tag?.name || tag?.text || String(tag));
        return (
          <React.Fragment key={i}>
            {/* Insertion slot before tag i */}
            {renderInsertSlot(i)}

            {/* Tag badge */}
            <span
              className={`badge text-dark d-inline-flex align-items-center gap-1 position-relative hp-tag-badge ${dragOverIndex === i ? 'hp-tag-drag-over' : ''}`}
              draggable={editingIndex !== i && insertingAtIndex === null}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              style={{
                fontSize: '0.85rem',
                backgroundColor: '#fff3cd',
                border: dragOverIndex === i ? '2px dashed #0d6efd' : '1px solid #ffe69c',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: editingIndex === i ? 'text' : 'default',
                opacity: draggedIndex === i ? 0.4 : 1,
                transition: 'border-color 0.15s ease, opacity 0.15s ease'
              }}
            >
              {editingIndex === i ? (
                <input
                  ref={editInputRef}
                  type="text"
                  className="border-0 bg-transparent fw-semibold text-dark p-0"
                  style={{
                    outline: 'none',
                    minWidth: '60px',
                    width: `${Math.max(editValue.length * 8 + 10, 60)}px`,
                    fontSize: '0.85rem'
                  }}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmEdit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingIndex(null);
                    }
                  }}
                  onBlur={handleConfirmEdit}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingIndex(i);
                    setEditValue(tagLabel);
                  }}
                >
                  {tagLabel}
                </span>
              )}

              {editingIndex !== i && (
                <X
                  size={12}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(i);
                  }}
                />
              )}
            </span>
          </React.Fragment>
        );
      })}

      {/* Main input for adding tags at the end */}
      <div className="position-relative flex-grow-1" style={{ minWidth: '150px' }}>
        <input
          ref={inputRef}
          type="text"
          className="border-0 w-100"
          placeholder={insertingAtIndex !== null ? '' : placeholder}
          style={{ outline: 'none', backgroundColor: 'transparent' }}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleMainInputFocus}
          onClick={(e) => {
            e.stopPropagation();
            handleMainInputFocus();
          }}
        />

        {/* Main dropdown: NEVER rendered when inserting in middle (insertingAtIndex === null guard) */}
        {showDropdown && insertingAtIndex === null && suggestions.length > 0 && (
          <div
            className="hp-dropdown position-absolute mt-2"
            style={{
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="hp-dropdown-item p-2 cursor-pointer"
                style={{ borderBottom: '1px solid #f8f9fa', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f8f9fa')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddTag(suggestion);
                }}
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
