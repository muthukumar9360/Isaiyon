import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Sparkles } from 'lucide-react';

/**
 * Reusable Smart Autocomplete Input Component
 * Provides debounced, case-insensitive partial matching with keyboard, touch,
 * and multi-value (comma-separated) support.
 */
export default function AutocompleteInput({
  value = '',
  onChange,
  suggestions = [],
  placeholder = '',
  label,
  required = false,
  disabled = false,
  isMultiValue = false,
  icon = null,
  className = '',
  inputClassName = '',
  id
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Extract currently active query segment (handles comma separation for multi-value fields like Cast/Singers)
  const activeSegment = useMemo(() => {
    if (!isMultiValue) return (value || '').trim();
    if (!value) return '';
    const parts = value.split(',');
    return parts[parts.length - 1].trim();
  }, [value, isMultiValue]);

  // Filter unique suggestions matching the query
  const filteredSuggestions = useMemo(() => {
    if (!activeSegment || activeSegment.length < 1) return [];
    const q = activeSegment.toLowerCase();

    // Collect already chosen items in multi-value mode to avoid offering duplicates
    const alreadyChosen = isMultiValue
      ? new Set(value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
      : new Set();

    const seen = new Set();
    const matches = [];

    for (const item of suggestions) {
      if (!item || typeof item !== 'string') continue;
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();

      if (!seen.has(lower) && !alreadyChosen.has(lower) && lower.includes(q)) {
        seen.add(lower);
        matches.push(trimmed);
        if (matches.length >= 8) break; // Limit dropdown length for sleek UX
      }
    }

    return matches;
  }, [suggestions, activeSegment, isMultiValue, value]);

  // Close dropdown on click outside

  // Close dropdown on click outside
  useEffect(() => {
    const handlePointerDownOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, []);

  const handleSelectSuggestion = (selectedText) => {
    if (isMultiValue) {
      const parts = value.split(',');
      // Replace the last part with the selected suggestion
      parts[parts.length - 1] = ' ' + selectedText;
      const combined = parts.join(',').trim();
      // Ensure clean leading comma formatting
      const cleaned = combined.replace(/^,\s*/, '') + ', ';
      onChange(cleaned);
    } else {
      onChange(selectedText);
    }

    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault(); // Don't submit the form!
        handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Render suggestion with matching query highlighted
  const renderHighlighted = (text) => {
    if (!activeSegment) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = activeSegment.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex === -1) return text;

    const before = text.slice(0, matchIndex);
    const match = text.slice(matchIndex, matchIndex + activeSegment.length);
    const after = text.slice(matchIndex + activeSegment.length);

    return (
      <span>
        {before}
        <span className="text-amber-600 font-extrabold underline decoration-amber-400 underline-offset-2">
          {match}
        </span>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-[11px] font-bold text-slate-600 flex items-center justify-between"
        >
          <span>{label}</span>
          {isMultiValue && (
            <span className="text-[10px] text-slate-500 font-normal">
              (Type comma for multiple)
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 pointer-events-none text-slate-500 flex items-center">
            {icon}
          </div>
        )}

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (filteredSuggestions.length > 0) setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`w-full ${icon ? 'pl-9' : 'px-3'} py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden transition-all placeholder:text-slate-500 ${inputClassName}`}
        />
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div 
          className="absolute left-0 right-0 top-full mt-1.5 bg-white/98 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-[modalPop_0.15s_ease-out] max-h-52 overflow-y-auto"
          role="listbox"
        >
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1 text-amber-600">
              <Sparkles size={11} />
              <span>Matching Vault Suggestions</span>
            </span>
            <span className="font-mono">{filteredSuggestions.length} found</span>
          </div>

          <div className="p-1 flex flex-col gap-0.5">
            {filteredSuggestions.map((item, idx) => {
              const isSelected = idx === highlightedIndex;
              return (
                <button
                  key={`${item}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    // Prevent blur event from firing before click registers
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">
                    {isSelected ? item : renderHighlighted(item)}
                  </span>
                  {isSelected && (
                    <Check size={13} className="shrink-0 text-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
