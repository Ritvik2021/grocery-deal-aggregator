import { useState, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);

  // Debounce: only fire onChange 400ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => onChange(inputValue), 400);
    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  // Keep in sync if parent resets
  useEffect(() => setInputValue(value), [value]);

  return (
    <div className="relative w-full max-w-md">
      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
        🔍
      </span>
      <input
        type="search"
        placeholder="Search deals (e.g. chicken, milk, pasta…)"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-full bg-white shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                   placeholder-gray-400"
      />
      {inputValue && (
        <button
          onClick={() => { setInputValue(''); onChange(''); }}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
}
