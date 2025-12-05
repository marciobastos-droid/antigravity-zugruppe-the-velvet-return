import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, X } from "lucide-react";
import { 
  PORTUGAL_LOCATIONS, 
  getDistritos, 
  getConcelhos, 
  searchLocations,
  getDistritoByConcelho
} from "@/components/common/PortugalLocationsData";

export default function LocationAutocomplete({ 
  value, 
  onChange, 
  field, // 'state' (distrito), 'city' (concelho), or 'address'
  label,
  placeholder,
  required = false,
  otherFieldValue, // For city, pass state value; for state, pass city value
  existingData = [], // Array of existing values from properties
  className = ""
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Build suggestions based on field type
  const allSuggestions = useMemo(() => {
    if (field === 'state') {
      // Distritos from Portugal data + existing data
      const distritos = getDistritos();
      const existing = existingData.filter(d => d && !distritos.includes(d));
      return [...new Set([...distritos, ...existing])].sort();
    } else if (field === 'city') {
      // Concelhos based on selected distrito
      let concelhos = [];
      if (otherFieldValue && PORTUGAL_LOCATIONS[otherFieldValue]) {
        concelhos = getConcelhos(otherFieldValue);
      } else {
        // All concelhos if no distrito selected
        Object.values(PORTUGAL_LOCATIONS).forEach(d => {
          concelhos.push(...Object.keys(d.concelhos));
        });
      }
      const existing = existingData.filter(c => c && !concelhos.includes(c));
      return [...new Set([...concelhos, ...existing])].sort();
    }
    return existingData.filter(Boolean).sort();
  }, [field, otherFieldValue, existingData]);

  useEffect(() => {
    if (!inputValue || inputValue.length < 1) {
      setSuggestions(allSuggestions.slice(0, 10));
      return;
    }

    const search = inputValue.toLowerCase();
    const filtered = allSuggestions.filter(item => 
      item.toLowerCase().includes(search)
    );
    setSuggestions(filtered.slice(0, 10));
  }, [inputValue, allSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selected) => {
    setInputValue(selected);
    onChange(selected);
    setIsOpen(false);

    // If selecting city and state is empty, auto-fill state
    if (field === 'city' && !otherFieldValue) {
      const distrito = getDistritoByConcelho(selected);
      if (distrito) {
        // This needs to be handled by parent component
      }
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <Label htmlFor={field}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          id={field}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          className="pl-9"
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              onChange("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                suggestion === inputValue ? "bg-slate-100" : ""
              }`}
            >
              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{suggestion}</span>
              {existingData.includes(suggestion) && !getDistritos().includes(suggestion) && (
                <Badge variant="outline" className="ml-auto text-xs">existente</Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}