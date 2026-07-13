import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Globe, ChevronDown, History, X } from 'lucide-react';
import { CustomSearchEngine } from '../types';

interface SearchBarProps {
  currentEngine: 'google' | 'duckduckgo' | 'bing';
  onEngineChange: (engine: 'google' | 'duckduckgo' | 'bing') => void;
  customSearchEngines?: CustomSearchEngine[];
  linkTarget?: 'self' | 'blank';
}

const ENGINES = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    placeholder: 'Search Google or type a URL...',
    color: 'from-blue-500 to-red-500',
    logo: 'G',
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    placeholder: 'Search privately with DuckDuckGo...',
    color: 'from-orange-400 to-red-500',
    logo: 'D',
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    placeholder: 'Search Bing...',
    color: 'from-teal-400 to-blue-500',
    logo: 'b',
  },
};

export default function SearchBar({ 
  currentEngine, 
  onEngineChange,
  customSearchEngines = [],
  linkTarget = 'blank'
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Keyboard Shortcuts for search focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Focus search input on '/' or 'Ctrl+K' / 'Cmd+K' if no input or textarea is active
      const isInputActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      
      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Compute contextual placeholder dynamically based on typed search shortcuts
  const currentPlaceholder = useMemo(() => {
    const trimmed = query.trim();
    const allShortcuts = [
      { shortcut: '!g', name: 'Google' },
      { shortcut: '!d', name: 'DuckDuckGo' },
      { shortcut: '!b', name: 'Bing' },
      ...(customSearchEngines || []).map(e => ({ shortcut: e.shortcut, name: e.name }))
    ];
    
    const matchedShortcut = allShortcuts.find(s => 
      trimmed.toLowerCase().startsWith(s.shortcut.toLowerCase() + ' ')
    );
    
    if (matchedShortcut) {
      return `Searching ${matchedShortcut.name}...`;
    }
    
    return ENGINES[currentEngine]?.placeholder || 'Search or type URL...';
  }, [query, currentEngine, customSearchEngines]);

  // Auto-focus search input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const executeSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    // Save to search history (max 5 items, no duplicates)
    const trimmed = searchTerm.trim();
    const updatedHistory = [trimmed, ...searchHistory.filter((item) => item !== trimmed)].slice(0, 5);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));

    // Check shortcuts
    let targetUrl = '';
    let isShortcut = false;

    const allShortcuts = [
      { shortcut: '!g', url: ENGINES.google.url },
      { shortcut: '!d', url: ENGINES.duckduckgo.url },
      { shortcut: '!b', url: ENGINES.bing.url },
      ...(customSearchEngines || []).map(e => ({ shortcut: e.shortcut, url: e.url }))
    ];

    const matchedShortcut = allShortcuts.find(s => 
      trimmed.toLowerCase().startsWith(s.shortcut.toLowerCase() + ' ') || 
      trimmed.toLowerCase() === s.shortcut.toLowerCase()
    );

    if (matchedShortcut) {
      isShortcut = true;
      const cleanQuery = trimmed.slice(matchedShortcut.shortcut.length).trim();
      if (matchedShortcut.url.includes('{query}')) {
        targetUrl = matchedShortcut.url.replace('{query}', encodeURIComponent(cleanQuery));
      } else {
        targetUrl = matchedShortcut.url + encodeURIComponent(cleanQuery);
      }
    }

    if (!isShortcut) {
      // Check if query is a URL
      const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(trimmed);
      if (isUrl) {
        targetUrl = trimmed;
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }
      } else {
        targetUrl = ENGINES[currentEngine].url + encodeURIComponent(trimmed);
      }
    }

    // Open targetUrl based on linkTarget
    if (linkTarget === 'self') {
      window.location.href = targetUrl;
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="w-full max-w-2xl mx-auto" id="search-bar-container">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        {/* Engine Selector Dropdown */}
        <div className="absolute left-2 z-10">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl hover:bg-neutral-500/10 dark:hover:bg-neutral-400/10 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            id="engine-selector-btn"
          >
            <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-xs font-bold text-white bg-gradient-to-r ${ENGINES[currentEngine].color}`}>
              {ENGINES[currentEngine].logo}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-white/95 dark:bg-elegant-card border border-neutral-200 dark:border-elegant-border shadow-xl backdrop-blur-md py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                {Object.entries(ENGINES).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onEngineChange(key as any);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-elegant-border-hover/60 ${
                      currentEngine === key
                        ? 'text-neutral-900 dark:text-white font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-xs font-bold text-white bg-gradient-to-r ${value.color}`}>
                      {value.logo}
                    </span>
                    {value.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={currentPlaceholder}
          className="w-full pl-18 pr-12 py-3.5 rounded-2xl border border-neutral-200 dark:border-elegant-border bg-white/60 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all shadow-sm text-base"
          id="search-input"
        />

        {/* Search Action Icon */}
        <button
          type="submit"
          className="absolute right-3.5 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          id="search-submit-btn"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Search History Dropdown */}
        {isFocused && searchHistory.length > 0 && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onMouseDown={() => setIsFocused(false)} 
            />
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-white/95 dark:bg-elegant-card border border-neutral-200 dark:border-elegant-border shadow-xl backdrop-blur-md py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                <span className="flex items-center gap-1">
                  <History className="w-3.5 h-3.5" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchHistory([]);
                    localStorage.removeItem('searchHistory');
                  }}
                  className="hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="mt-1 divide-y divide-neutral-100/50 dark:divide-elegant-border/30 max-h-48 overflow-y-auto scrollbar-thin">
                {searchHistory.map((item, index) => (
                  <div
                    key={index}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuery(item);
                      setIsFocused(false);
                      executeSearch(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-elegant-border-hover/60 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                      <span className="truncate font-medium">{item}</span>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const updated = searchHistory.filter((h) => h !== item);
                        setSearchHistory(updated);
                        localStorage.setItem('searchHistory', JSON.stringify(updated));
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 dark:hover:bg-elegant-border text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer"
                      title="Remove search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
