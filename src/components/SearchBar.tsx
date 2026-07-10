import React, { useState } from 'react';
import { Search, Globe, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  currentEngine: 'google' | 'duckduckgo' | 'bing';
  onEngineChange: (engine: 'google' | 'duckduckgo' | 'bing') => void;
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

export default function SearchBar({ currentEngine, onEngineChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Check if query is a URL
    let url = query.trim();
    const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(url);

    if (isUrl) {
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      window.location.href = url;
    } else {
      const searchUrl = ENGINES[currentEngine].url + encodeURIComponent(query);
      window.location.href = searchUrl;
    }
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
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ENGINES[currentEngine].placeholder}
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
      </form>
    </div>
  );
}
