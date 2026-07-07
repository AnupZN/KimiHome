import { useState, useEffect } from 'react';
import { 
  Sparkles, Sun, Moon, Settings, RefreshCw, AlertCircle, Bookmark as BookmarkIcon,
  Quote, Info, ExternalLink, HelpCircle
} from 'lucide-react';
import { Bookmark, TodoItem, QuickNote, UserSettings } from './types';
import { uploadToCloud, downloadFromCloud, generateSyncCode } from './lib/syncService';

// Import components
import ClockWidget from './components/ClockWidget';
import SearchBar from './components/SearchBar';
import BookmarksWidget from './components/BookmarksWidget';
import WeatherWidget from './components/WeatherWidget';
import TodoWidget from './components/TodoWidget';
import FocusWidget from './components/FocusWidget';
import NotesWidget from './components/NotesWidget';
import SettingsModal from './components/SettingsModal';

// Default values
const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: '1', title: 'Google', url: 'https://google.com', category: 'Favorites', color: 'blue', icon: 'globe' },
  { id: '2', title: 'YouTube', url: 'https://youtube.com', category: 'Favorites', color: 'rose', icon: 'youtube' },
  { id: '3', title: 'GitHub', url: 'https://github.com', category: 'Favorites', color: 'neutral', icon: 'github' },
  { id: '4', title: 'Reddit', url: 'https://reddit.com', category: 'Social', color: 'amber', icon: 'chat' },
  { id: '5', title: 'Gmail', url: 'https://mail.google.com', category: 'Favorites', color: 'rose', icon: 'mail' },
  { id: '6', title: 'Devdocs', url: 'https://devdocs.io', category: 'Work', color: 'emerald', icon: 'code' },
];

const DEFAULT_TODOS: TodoItem[] = [
  { id: '1', text: 'Organize this startpage bookmarks', completed: false, category: 'Personal' },
  { id: '2', text: 'Set a focus block for reading', completed: false, category: 'Study' },
  { id: '3', text: 'Explore weather geocoding', completed: true, category: 'Work' },
];

const DEFAULT_NOTES: QuickNote[] = [
  { 
    id: '1', 
    title: 'Startpage Scratchpad', 
    content: "Welcome to your personal dashboard! Use this scratchpad to capture transient thoughts, code snippet ideas, or shopping items. It auto-saves to your local browser storage instantly.\n\nTips:\n- Single click to copy content to clipboard\n- Double click on your name above to customize it\n- Use the gear icon at the top right to customize background backdrops or toggle active widgets", 
    updatedAt: new Date().toISOString() 
  }
];

const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Alex',
  theme: 'dark',
  bgType: 'solid',
  bgValue: 'bg-elegant-bg',
  searchEngine: 'google',
  enabledWidgets: {
    clock: true,
    search: true,
    bookmarks: true,
    weather: true,
    todo: true,
    notes: true,
    focus: true,
  },
  widgetOrder: ['weather', 'focus', 'bookmarks', 'todo', 'notes'],
};

const DUMMY_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
];

export default function App() {
  // --- States ---
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('bookmarksList');
    return saved ? JSON.parse(saved) : DEFAULT_BOOKMARKS;
  });

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('todosList');
    return saved ? JSON.parse(saved) : DEFAULT_TODOS;
  });

  const [notes, setNotes] = useState<QuickNote[]>(() => {
    const saved = localStorage.getItem('notesList');
    return saved ? JSON.parse(saved) : DEFAULT_NOTES;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quote, setQuote] = useState(() => DUMMY_QUOTES[Math.floor(Math.random() * DUMMY_QUOTES.length)]);

  const [syncCode, setSyncCode] = useState<string>(() => {
    return localStorage.getItem('startpage_sync_code') || '';
  });
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('startpage_auto_sync') === 'true';
  });

  // --- Effects to sync with LocalStorage ---
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('bookmarksList', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('todosList', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem('notesList', JSON.stringify(notes));
  }, [notes]);

  // --- Auto Sync Effect to Cloud ---
  useEffect(() => {
    if (!syncCode || !autoSync) return;

    const timer = setTimeout(async () => {
      try {
        const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
        const catOrder = savedCatOrder ? JSON.parse(savedCatOrder) : undefined;
        await uploadToCloud(syncCode, {
          settings,
          bookmarks,
          todos,
          notes,
          categoryOrder: catOrder,
        });
        console.log('Auto-synced dashboard data to Cloud successfully');
      } catch (err) {
        console.error('Auto-sync failed:', err);
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [settings, bookmarks, todos, notes, syncCode, autoSync]);

  // Synchronize HTML element classes for Dark Mode & Cosmic theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'cosmic');
    if (settings.theme === 'dark' || settings.theme === 'cosmic') {
      root.classList.add('dark');
    }
    if (settings.theme === 'cosmic') {
      root.classList.add('cosmic');
    }
  }, [settings.theme]);

  // --- Bookmark Handlers ---
  const handleAddBookmark = (newB: Bookmark) => {
    setBookmarks([...bookmarks, newB]);
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  const handleUpdateBookmark = (updatedB: Bookmark) => {
    setBookmarks(bookmarks.map((b) => (b.id === updatedB.id ? updatedB : b)));
  };

  const handleReorderBookmarks = (newBookmarks: Bookmark[]) => {
    setBookmarks(newBookmarks);
  };

  // --- Todo Handlers ---
  const handleAddTodo = (text: string, category: string) => {
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text,
      completed: false,
      category,
    };
    setTodos([...todos, newTodo]);
  };

  const handleToggleTodo = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  const handleClearCompleted = () => {
    setTodos(todos.filter((t) => !t.completed));
  };

  // --- Notes Handlers ---
  const handleAddNote = () => {
    const newNote: QuickNote = {
      id: Date.now().toString(),
      title: `Draft Note ${notes.length + 1}`,
      content: '',
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
  };

  const handleUpdateNote = (updatedN: QuickNote) => {
    setNotes(notes.map((n) => (n.id === updatedN.id ? updatedN : n)));
  };

  const handleDeleteNote = (id: string) => {
    if (notes.length <= 1) return; // Keep at least one
    setNotes(notes.filter((n) => n.id !== id));
  };

  // --- Other Actions ---
  const handleCycleQuote = () => {
    let nextQuote = quote;
    while (nextQuote === quote) {
      nextQuote = DUMMY_QUOTES[Math.floor(Math.random() * DUMMY_QUOTES.length)];
    }
    setQuote(nextQuote);
  };

  const handleImportData = (data: {
    settings?: UserSettings;
    bookmarks?: Bookmark[];
    todos?: TodoItem[];
    notes?: QuickNote[];
    categoryOrder?: string[];
  }) => {
    if (data.settings) setSettings(data.settings);
    if (data.bookmarks) setBookmarks(data.bookmarks);
    if (data.todos) setTodos(data.todos);
    if (data.notes) setNotes(data.notes);
    if (data.categoryOrder) {
      localStorage.setItem('bookmarksCategoryOrder', JSON.stringify(data.categoryOrder));
    }
  };

  const handleResetData = () => {
    setSettings(DEFAULT_SETTINGS);
    setBookmarks(DEFAULT_BOOKMARKS);
    setTodos(DEFAULT_TODOS);
    setNotes(DEFAULT_NOTES);
    localStorage.clear();
  };

  const handleSaveSyncSettings = (code: string, auto: boolean) => {
    setSyncCode(code);
    setAutoSync(auto);
    localStorage.setItem('startpage_sync_code', code);
    localStorage.setItem('startpage_auto_sync', auto ? 'true' : 'false');
  };

  // Build backdrop wrapper style classes
  const getBackgroundClass = () => {
    if (settings.bgType === 'solid') {
      return settings.bgValue;
    }
    // Gradient backgrounds
    return `bg-gradient-to-br ${settings.bgValue}`;
  };

  return (
    <div 
      className={`min-h-screen overflow-x-hidden ${getBackgroundClass()} transition-all duration-300 relative text-neutral-800 dark:text-neutral-100 font-sans pb-12`}
      id="app-root-container"
    >
      {/* Decorative Cosmic background overlay */}
      {settings.theme === 'cosmic' && (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none z-0" />
          <div className="cosmic-stars" />
        </>
      )}

      {/* Header bar */}
      <header className="max-w-7xl mx-auto px-4 md:px-10 py-6 flex items-center justify-end" id="app-header">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Quick Theme Switcher */}
          <div className="flex items-center bg-white/60 border border-neutral-200/50 dark:bg-elegant-card dark:border-elegant-border rounded-full p-1 shadow-sm">
            <button
              onClick={() => {
                const newBgValue = settings.bgType === 'solid' ? 'bg-neutral-50' : 'from-slate-50 via-neutral-100 to-zinc-200';
                setSettings({ ...settings, theme: 'light', bgValue: newBgValue });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'light' 
                  ? 'bg-neutral-200 text-neutral-950 dark:bg-elegant-border dark:text-white' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
              id="theme-light-btn"
            >
              Light
            </button>
            <button
              onClick={() => {
                const newBgValue = settings.bgType === 'solid' ? 'bg-elegant-bg' : 'from-neutral-900 via-neutral-950 to-purple-950';
                setSettings({ ...settings, theme: 'dark', bgValue: newBgValue });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'dark' 
                  ? 'bg-neutral-900 text-white dark:bg-elegant-border dark:text-white' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
              id="theme-dark-btn"
            >
              Dark
            </button>
            <button
              onClick={() => {
                setSettings({ 
                  ...settings, 
                  theme: 'cosmic', 
                  bgType: 'gradient', 
                  bgValue: 'from-neutral-900 via-neutral-950 to-purple-950' 
                });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'cosmic' 
                  ? 'bg-purple-950 text-purple-300 dark:bg-purple-900/40 dark:text-purple-300' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
              id="theme-cosmic-btn"
            >
              Cosmic
            </button>
          </div>

          {/* Settings trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-full bg-white/60 border border-neutral-200/50 dark:bg-elegant-card dark:border-elegant-border hover:bg-neutral-100 dark:hover:bg-elegant-border-hover/60 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer shadow-sm"
            title="Startpage Settings"
            id="settings-trigger-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-4 md:mt-12 space-y-10" id="app-main-content">
        {/* HERO SECTION: Time, Greeting, and Search */}
        <section className="space-y-6 text-center" id="hero-section">
          {settings.enabledWidgets.clock && (
            <ClockWidget 
              userName={settings.userName} 
              onNameChange={(name) => setSettings({ ...settings, userName: name })}
            />
          )}

          {settings.enabledWidgets.search && (
            <SearchBar 
              currentEngine={settings.searchEngine}
              onEngineChange={(engine) => setSettings({ ...settings, searchEngine: engine })}
            />
          )}

          {/* Custom Quote section */}
          <div className="max-w-md mx-auto group cursor-pointer" onClick={handleCycleQuote} id="quote-container">
            <p className="text-xs italic text-neutral-400 dark:text-neutral-500 line-clamp-2 transition-all group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
              "{quote.text}"
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              — {quote.author} • Click to cycle
            </p>
          </div>
        </section>

        {/* DASHBOARD WIDGETS GRID */}
        <section className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:balance]" id="dashboard-widgets-grid">
          {(settings.widgetOrder || ['weather', 'focus', 'bookmarks', 'todo', 'notes']).map((widgetKey) => {
            if (widgetKey === 'weather' && settings.enabledWidgets.weather) {
              return (
                <div key="weather" className="w-full min-h-[220px] break-inside-avoid mb-6 inline-block">
                  <WeatherWidget />
                </div>
              );
            }
            if (widgetKey === 'focus' && settings.enabledWidgets.focus) {
              return (
                <div key="focus" className="w-full min-h-[380px] break-inside-avoid mb-6 inline-block">
                  <FocusWidget />
                </div>
              );
            }
            if (widgetKey === 'bookmarks' && settings.enabledWidgets.bookmarks) {
              return (
                <div key="bookmarks" className="w-full break-inside-avoid mb-6 inline-block">
                  <BookmarksWidget 
                    bookmarks={bookmarks}
                    onAddBookmark={handleAddBookmark}
                    onDeleteBookmark={handleDeleteBookmark}
                    onUpdateBookmark={handleUpdateBookmark}
                    onReorderBookmarks={handleReorderBookmarks}
                  />
                </div>
              );
            }
            if (widgetKey === 'todo' && settings.enabledWidgets.todo) {
              return (
                <div key="todo" className="w-full min-h-[240px] break-inside-avoid mb-6 inline-block">
                  <TodoWidget 
                    todos={todos}
                    onAddTodo={handleAddTodo}
                    onToggleTodo={handleToggleTodo}
                    onDeleteTodo={handleDeleteTodo}
                    onClearCompleted={handleClearCompleted}
                  />
                </div>
              );
            }
            if (widgetKey === 'notes' && settings.enabledWidgets.notes) {
              return (
                <div key="notes" className="w-full min-h-[240px] break-inside-avoid mb-6 inline-block">
                  <NotesWidget 
                    notes={notes}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                  />
                </div>
              );
            }
            return null;
          })}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-16 text-center text-neutral-400 dark:text-neutral-500 text-[11px] font-bold uppercase tracking-wider" id="app-footer">
        <span>© 2026 Startpage Inc. • Local offline-first data</span>
      </footer>

      {/* Settings Panel Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onResetData={handleResetData}
        bookmarks={bookmarks}
        todos={todos}
        notes={notes}
        onImportData={handleImportData}
        syncCode={syncCode}
        autoSync={autoSync}
        onSaveSyncSettings={handleSaveSyncSettings}
      />
    </div>
  );
}
