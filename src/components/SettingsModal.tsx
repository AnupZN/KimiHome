import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Settings, Check, RefreshCcw, Eye, EyeOff,
  ArrowUp, ArrowDown, Grid, Cloud, Clock, Bookmark, 
  CheckSquare, FileText, Search, Upload, Download, Copy,
  AlertCircle, CheckCircle2, CloudUpload, CloudDownload
} from 'lucide-react';
import { UserSettings, Bookmark as BookmarkType, TodoItem, QuickNote, CustomSearchEngine } from '../types';
import { uploadToCloud, downloadFromCloud, generateSyncCode } from '../lib/syncService';
import { auth, googleProvider, getCustomFirebaseConfig, saveCustomFirebaseConfig } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onResetData: () => void;
  bookmarks: BookmarkType[];
  todos: TodoItem[];
  notes: QuickNote[];
  onImportData: (data: {
    settings?: UserSettings;
    bookmarks?: BookmarkType[];
    todos?: TodoItem[];
    notes?: QuickNote[];
    categoryOrder?: string[];
  }) => void;
  syncCode: string;
  autoSync: boolean;
  onSaveSyncSettings: (code: string, auto: boolean) => void;
}

const GRADIENTS = [
  { name: 'Cosmic Dusk', value: 'from-neutral-900 via-neutral-950 to-purple-950' },
  { name: 'Aurora Borealis', value: 'from-slate-900 via-teal-950 to-indigo-950' },
  { name: 'Warm Amber', value: 'from-zinc-900 via-stone-950 to-amber-950' },
  { name: 'Slate Calm', value: 'from-slate-50 via-neutral-100 to-zinc-200' },
  { name: 'Sunset Peach', value: 'from-rose-50 via-orange-50 to-amber-100' },
  { name: 'Mint Meadow', value: 'from-teal-50 via-emerald-50 to-green-100' },
];

const SOLIDS = [
  { name: 'Elegant Dark', value: 'bg-elegant-bg' },
  { name: 'Charcoal Dark', value: 'bg-neutral-950' },
  { name: 'Slate Deep', value: 'bg-slate-900' },
  { name: 'Zinc Cozy', value: 'bg-zinc-800' },
  { name: 'Paper White', value: 'bg-white' },
  { name: 'Sand Warm', value: 'bg-stone-50' },
  { name: 'Snow Soft', value: 'bg-neutral-50' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetData,
  bookmarks,
  todos,
  notes,
  onImportData,
  syncCode,
  autoSync,
  onSaveSyncSettings,
}: SettingsModalProps) {
  if (!isOpen) return null;

  // --- Backup & Restore State ---
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Cloud Sync State ---
  const [syncCodeInput, setSyncCodeInput] = useState(syncCode);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [isSyncCopied, setIsSyncCopied] = useState(false);

  // --- Optional Secure Authentication State ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- Conflict Detection State ---
  const [conflictData, setConflictData] = useState<{ local: any, cloud: any } | null>(null);

  // --- Custom Firebase Config State ---
  const [isUsingCustomFirebase, setIsUsingCustomFirebase] = useState(!!getCustomFirebaseConfig());
  const [showCustomFirebase, setShowCustomFirebase] = useState(false);
  const [customFirebaseJson, setCustomFirebaseJson] = useState(() => {
    const config = getCustomFirebaseConfig();
    return config ? JSON.stringify(config, null, 2) : '';
  });
  const [customFirebaseInputError, setCustomFirebaseInputError] = useState<string | null>(null);

  const handleSaveCustomFirebase = () => {
    setCustomFirebaseInputError(null);
    if (!customFirebaseJson.trim()) {
      saveCustomFirebaseConfig(null);
      setIsUsingCustomFirebase(false);
      return;
    }

    try {
      let cleanJson = customFirebaseJson.trim();
      
      // If they paste the entire javascript block, extract the config object
      if (cleanJson.includes('firebaseConfig =')) {
        const matches = cleanJson.match(/firebaseConfig\s*=\s*({[\s\S]*?});?/);
        if (matches && matches[1]) {
          cleanJson = matches[1];
        }
      } else if (cleanJson.includes('const firebaseConfig') || cleanJson.includes('let firebaseConfig')) {
        const matches = cleanJson.match(/(?:const|let|var)\s+firebaseConfig\s*=\s*({[\s\S]*?});?/);
        if (matches && matches[1]) {
          cleanJson = matches[1];
        }
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (jsonErr) {
        // Fallback to evaluating as a JS object literal safely
        try {
          parsed = new Function(`return (${cleanJson})`)();
        } catch (evalErr) {
          throw new Error('Invalid JSON or Javascript object formatting. Please make sure the config is a valid object containing apiKey, authDomain, and projectId.');
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Configuration must be a valid object.');
      }

      const requiredFields = ['apiKey', 'authDomain', 'projectId'];
      const missingFields = requiredFields.filter(f => !parsed[f]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      saveCustomFirebaseConfig(parsed);
    } catch (err: any) {
      setCustomFirebaseInputError(err.message || 'Failed to parse configuration');
    }
  };

  const handleResetCustomFirebase = () => {
    saveCustomFirebaseConfig(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError(null);
    setSyncSuccess(null);
    if (!email || !password) return;
    try {
      setIsSyncing(true);
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSyncSuccess('Account registered successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSyncSuccess('Signed in successfully!');
      }
      setEmail('');
      setPassword('');
      setShowEmailForm(false);
    } catch (err: any) {
      setSyncError(err?.message || 'Authentication failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSyncError(null);
    setSyncSuccess(null);
    try {
      setIsSyncing(true);
      await signInWithPopup(auth, googleProvider);
      setSyncSuccess('Signed in with Google successfully!');
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain') || err?.message?.includes('unauthorized domain')) {
        setSyncError("Google Sign-In is blocked on custom domains on this Firebase tier. Please use the 'Email Login' option instead—it works perfectly everywhere without any domain authorization!");
      } else {
        setSyncError(err?.message || 'Google Sign-In failed');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSyncSuccess('Signed out successfully.');
    } catch (err: any) {
      setSyncError(err?.message || 'Sign-out failed');
    }
  };

  const handleLinkProfileToUser = async () => {
    if (!syncCode || !currentUser) return;
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
      const categoryOrder = savedCatOrder ? JSON.parse(savedCatOrder) : undefined;

      await uploadToCloud(syncCode, {
        settings,
        bookmarks,
        todos,
        notes,
        categoryOrder,
        ownerId: currentUser.uid,
      });

      setSyncSuccess('🔐 Sync profile successfully secured to your account!');
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to secure sync profile.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Simple smart merge function for non-conflicting records and list concatenation
  const mergeData = (local: any, cloud: any) => {
    const localBookMap = new Map((local.bookmarks || []).map((b: any) => [b.url, b]));
    const cloudBookList = cloud.bookmarksList || [];
    cloudBookList.forEach((b: any) => {
      if (!localBookMap.has(b.url)) {
        localBookMap.set(b.url, b);
      }
    });
    const mergedBookmarks = Array.from(localBookMap.values());

    const localTodoMap = new Map((local.todos || []).map((t: any) => [t.text, t]));
    const cloudTodoList = cloud.todosList || [];
    cloudTodoList.forEach((t: any) => {
      if (!localTodoMap.has(t.text)) {
        localTodoMap.set(t.text, t);
      }
    });
    const mergedTodos = Array.from(localTodoMap.values());

    const localNotesMap = new Map((local.notes || []).map((n: any) => [n.title, n]));
    const cloudNotesList = cloud.notesList || [];
    cloudNotesList.forEach((n: any) => {
      if (!localNotesMap.has(n.title)) {
        localNotesMap.set(n.title, n);
      }
    });
    const mergedNotes = Array.from(localNotesMap.values());

    return {
      settings: local.settings,
      bookmarks: mergedBookmarks,
      todos: mergedTodos,
      notes: mergedNotes
    };
  };

  const handleResolveConflict = async (resolution: 'local' | 'cloud' | 'merge') => {
    if (!conflictData) return;
    setSyncError(null);
    setSyncSuccess(null);
    setIsSyncing(true);
    try {
      const code = syncCodeInput || syncCode;
      const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
      const categoryOrder = savedCatOrder ? JSON.parse(savedCatOrder) : undefined;

      if (resolution === 'local') {
        await uploadToCloud(code, {
          settings,
          bookmarks,
          todos,
          notes,
          categoryOrder,
          ownerId: currentUser ? currentUser.uid : undefined
        });
        localStorage.setItem('lastSyncedAt', new Date().toISOString());
        setSyncSuccess('Cloud overwritten with your local data!');
      } else if (resolution === 'cloud') {
        onImportData({
          settings: conflictData.cloud.userSettings,
          bookmarks: conflictData.cloud.bookmarksList,
          todos: conflictData.cloud.todosList,
          notes: conflictData.cloud.notesList,
          categoryOrder: conflictData.cloud.bookmarksCategoryOrder,
        });
        localStorage.setItem('lastSyncedAt', conflictData.cloud.updatedAt);
        setSyncSuccess('Local dashboard updated with Cloud changes!');
      } else if (resolution === 'merge') {
        const merged = mergeData(
          { settings, bookmarks, todos, notes },
          conflictData.cloud
        );
        onImportData({
          settings: merged.settings,
          bookmarks: merged.bookmarks as BookmarkType[],
          todos: merged.todos as TodoItem[],
          notes: merged.notes as QuickNote[],
          categoryOrder: conflictData.cloud.bookmarksCategoryOrder,
        });

        await uploadToCloud(code, {
          settings: merged.settings,
          bookmarks: merged.bookmarks as BookmarkType[],
          todos: merged.todos as TodoItem[],
          notes: merged.notes as QuickNote[],
          categoryOrder,
          ownerId: currentUser ? currentUser.uid : undefined
        });

        localStorage.setItem('lastSyncedAt', new Date().toISOString());
        setSyncSuccess('Successfully merged local and cloud data!');
      }
      setConflictData(null);
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to resolve conflict.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateNewCode = async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncSuccess(null);
      const newCode = generateSyncCode();
      
      const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
      const categoryOrder = savedCatOrder ? JSON.parse(savedCatOrder) : undefined;

      // Upload current data immediately to provision the profile
      await uploadToCloud(newCode, {
        settings,
        bookmarks,
        todos,
        notes,
        categoryOrder,
      });

      onSaveSyncSettings(newCode, true);
      setSyncCodeInput(newCode);
      setSyncSuccess('Generated and initialized Cloud Sync profile!');
      setTimeout(() => setSyncSuccess(null), 3500);
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to initialize Cloud Sync profile.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualUpload = async () => {
    if (!syncCode) return;
    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncSuccess(null);

      // Conflict detection first!
      const cloudData = await downloadFromCloud(syncCode);
      const cloudUpdatedAt = new Date(cloudData.updatedAt || '1970-01-01');
      const lastSyncedAt = new Date(localStorage.getItem('lastSyncedAt') || '1970-01-01');
      const lastLocalChange = new Date(localStorage.getItem('lastLocalChange') || '1970-01-01');

      if (lastLocalChange > lastSyncedAt && cloudUpdatedAt > lastSyncedAt) {
        setConflictData({
          local: { settings, bookmarks, todos, notes },
          cloud: cloudData
        });
        setIsSyncing(false);
        return;
      }

      const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
      const categoryOrder = savedCatOrder ? JSON.parse(savedCatOrder) : undefined;

      await uploadToCloud(syncCode, {
        settings,
        bookmarks,
        todos,
        notes,
        categoryOrder,
        ownerId: currentUser ? currentUser.uid : undefined
      });

      localStorage.setItem('lastSyncedAt', new Date().toISOString());
      setSyncSuccess('Backup successfully uploaded to cloud!');
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to backup to cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualDownload = async (codeToDownload?: string) => {
    const targetCode = codeToDownload || syncCodeInput;
    if (!targetCode || !targetCode.trim()) {
      setSyncError('Please enter a valid Sync Code');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncSuccess(null);

      const cloudData = await downloadFromCloud(targetCode);
      const cloudUpdatedAt = new Date(cloudData.updatedAt || '1970-01-01');
      const lastSyncedAt = new Date(localStorage.getItem('lastSyncedAt') || '1970-01-01');
      const lastLocalChange = new Date(localStorage.getItem('lastLocalChange') || '1970-01-01');

      if (lastLocalChange > lastSyncedAt && cloudUpdatedAt > lastSyncedAt) {
        setConflictData({
          local: { settings, bookmarks, todos, notes },
          cloud: cloudData
        });
        setIsSyncing(false);
        return;
      }

      onImportData({
        settings: cloudData.userSettings,
        bookmarks: cloudData.bookmarksList,
        todos: cloudData.todosList,
        notes: cloudData.notesList,
        categoryOrder: cloudData.bookmarksCategoryOrder,
      });

      const cleanCode = targetCode.trim().toUpperCase();
      onSaveSyncSettings(cleanCode, true);
      setSyncCodeInput(cleanCode);

      localStorage.setItem('lastSyncedAt', cloudData.updatedAt || new Date().toISOString());
      setSyncSuccess('Dashboard synchronized from Cloud successfully!');
      setTimeout(() => setSyncSuccess(null), 4000);
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to restore from Cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectSync = () => {
    onSaveSyncSettings('', false);
    setSyncCodeInput('');
    setSyncError(null);
    setSyncSuccess('Cloud Sync disconnected.');
    setTimeout(() => setSyncSuccess(null), 3000);
  };

  const handleCopySyncCode = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setIsSyncCopied(true);
    setTimeout(() => setIsSyncCopied(false), 2000);
  };

  const getBackupPayload = () => {
    const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
    return JSON.stringify({
      version: "1.0",
      timestamp: new Date().toISOString(),
      userSettings: settings,
      bookmarksList: bookmarks,
      todosList: todos,
      notesList: notes,
      bookmarksCategoryOrder: savedCatOrder ? JSON.parse(savedCatOrder) : null
    }, null, 2);
  };

  const handleDownloadBackup = () => {
    try {
      const payload = getBackupPayload();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `startpage-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleCopyToClipboard = () => {
    try {
      const payload = getBackupPayload();
      navigator.clipboard.writeText(payload);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleRestoreFromJSON = (jsonString: string) => {
    try {
      setImportError(null);
      setImportSuccess(false);
      const parsed = JSON.parse(jsonString);
      
      if (!parsed || (typeof parsed !== 'object')) {
        throw new Error('Invalid backup format: Must be a JSON object');
      }

      const hasSettings = parsed.userSettings && typeof parsed.userSettings === 'object';
      const hasBookmarks = Array.isArray(parsed.bookmarksList);
      const hasTodos = Array.isArray(parsed.todosList);
      const hasNotes = Array.isArray(parsed.notesList);

      if (!hasSettings && !hasBookmarks && !hasTodos && !hasNotes) {
        throw new Error('No valid startpage data found in this backup.');
      }

      onImportData({
        settings: parsed.userSettings,
        bookmarks: parsed.bookmarksList,
        todos: parsed.todosList,
        notes: parsed.notesList,
        categoryOrder: parsed.bookmarksCategoryOrder || undefined
      });

      setImportSuccess(true);
      setImportText('');
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse JSON. Please check your data structure.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        handleRestoreFromJSON(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleWidget = (widgetKey: keyof UserSettings['enabledWidgets']) => {
    onUpdateSettings({
      ...settings,
      enabledWidgets: {
        ...settings.enabledWidgets,
        [widgetKey]: !settings.enabledWidgets[widgetKey],
      },
    });
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const currentOrder = settings.widgetOrder ? [...settings.widgetOrder] : ['weather', 'focus', 'bookmarks', 'todo', 'notes'];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    
    // Swap
    const temp = currentOrder[index];
    currentOrder[index] = currentOrder[targetIndex];
    currentOrder[targetIndex] = temp;
    
    onUpdateSettings({
      ...settings,
      widgetOrder: currentOrder,
    });
  };

  const WIDGET_DETAILS = {
    weather: { label: 'Weather Report', icon: Cloud },
    focus: { label: 'Pomodoro Focus', icon: Clock },
    bookmarks: { label: 'Bookmarks', icon: Bookmark },
    todo: { label: 'Task Tracker', icon: CheckSquare },
    notes: { label: 'Scratchpad Notes', icon: FileText },
  };

  const handleBgChange = (type: 'gradient' | 'solid', value: string) => {
    onUpdateSettings({
      ...settings,
      bgType: type,
      bgValue: value,
    });
  };

  const handleSearchEngineChange = (engine: 'google' | 'duckduckgo' | 'bing') => {
    onUpdateSettings({
      ...settings,
      searchEngine: engine,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div 
        className="relative bg-white dark:bg-elegant-card border border-neutral-200 dark:border-elegant-border rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin"
        id="settings-modal"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-neutral-500" />
          <h3 className="font-display font-bold text-xl text-neutral-900 dark:text-white">
            Homepage Customization
          </h3>
        </div>

        <div className="space-y-6">
          {/* UserName Edit */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
              Startpage Owner Name
            </label>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => onUpdateSettings({ ...settings, userName: e.target.value })}
              placeholder="Your Name"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all"
              id="settings-username-input"
            />
          </div>

          {/* Link Opening Target Preference */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
              Link Opening Behavior
            </label>
            <div className="grid grid-cols-2 gap-3" id="settings-link-target">
              {['self', 'blank'].map((val) => {
                const isSelected = (settings.linkTarget || 'blank') === val;
                const label = val === 'self' ? 'Open in Current Tab' : 'Open in New Tab';
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, linkTarget: val as any })}
                    className={`flex items-center justify-center p-3 py-2.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-elegant-border dark:text-white dark:border-elegant-border shadow-sm'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:bg-elegant-card-darker dark:border-elegant-border dark:text-neutral-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Header Elements */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
              Header Elements
            </label>
            <div className="grid grid-cols-2 gap-3" id="settings-header-elements">
              {['clock', 'search'].map((key) => {
                const isEnabled = settings.enabledWidgets[key as keyof UserSettings['enabledWidgets']];
                const label = key === 'clock' ? 'Greeting Clock' : 'Search Bar';
                const Icon = key === 'clock' ? Clock : Search;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleWidget(key as any)}
                    className={`flex items-center justify-between p-3 py-2.5 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                      isEnabled
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-elegant-border dark:text-white dark:border-elegant-border shadow-sm'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:bg-elegant-card-darker dark:border-elegant-border dark:text-neutral-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 opacity-75" />
                      {label}
                    </span>
                    {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-55" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Widget Ordering and Toggles */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
              Dashboard Layout & Arrangement
            </label>
            <div className="space-y-2" id="settings-dashboard-widgets">
              {(settings.widgetOrder || ['weather', 'focus', 'bookmarks', 'todo', 'notes']).map((key, index, arr) => {
                const isEnabled = settings.enabledWidgets[key as keyof UserSettings['enabledWidgets']];
                const detail = WIDGET_DETAILS[key as keyof typeof WIDGET_DETAILS] || { label: key, icon: Grid };
                const Icon = detail.icon;
                
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-2 px-3 rounded-2xl border text-sm transition-all ${
                      isEnabled
                        ? 'bg-neutral-50/50 dark:bg-elegant-card-darker/40 border-neutral-200 dark:border-elegant-border shadow-sm'
                        : 'bg-neutral-50/20 border-neutral-200/40 dark:bg-elegant-card-darker/10 dark:border-elegant-border/30 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="text-neutral-400 dark:text-neutral-500 flex items-center justify-center">
                        <Grid className="w-3.5 h-3.5" />
                      </div>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isEnabled ? 'text-indigo-500 dark:text-indigo-400' : 'text-neutral-400'}`} />
                      <span className={`font-semibold truncate ${isEnabled ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400/80 dark:text-neutral-500/80'}`}>
                        {detail.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      {/* Toggle status */}
                      <button
                        type="button"
                        onClick={() => handleToggleWidget(key as any)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isEnabled
                            ? 'bg-white dark:bg-elegant-border border-neutral-200 dark:border-elegant-border-hover hover:bg-neutral-100 dark:hover:bg-elegant-border-hover/80 text-neutral-700 dark:text-neutral-200 shadow-sm'
                            : 'bg-transparent border-transparent text-neutral-400 hover:bg-neutral-50 dark:hover:bg-elegant-border/30'
                        }`}
                        title={isEnabled ? "Deactivate" : "Activate"}
                      >
                        {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-55" />}
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(index, 'up')}
                        disabled={index === 0}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          index === 0
                            ? 'opacity-20 border-transparent cursor-not-allowed text-neutral-300 dark:text-neutral-700'
                            : 'bg-white dark:bg-elegant-border border-neutral-200 dark:border-elegant-border-hover hover:bg-neutral-100 dark:hover:bg-elegant-border-hover/80 text-neutral-700 dark:text-neutral-200 shadow-sm'
                        }`}
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(index, 'down')}
                        disabled={index === arr.length - 1}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          index === arr.length - 1
                            ? 'opacity-20 border-transparent cursor-not-allowed text-neutral-300 dark:text-neutral-700'
                            : 'bg-white dark:bg-elegant-border border-neutral-200 dark:border-elegant-border-hover hover:bg-neutral-100 dark:hover:bg-elegant-border-hover/80 text-neutral-700 dark:text-neutral-200 shadow-sm'
                        }`}
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Background Selection */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
              Choose Canvas Theme Backdrops
            </label>
            
            {/* Gradients */}
            <div className="space-y-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                Gradients
              </span>
              <div className="grid grid-cols-3 gap-2" id="settings-gradient-grid">
                {GRADIENTS.map((g) => {
                  const isSelected = settings.bgValue === g.value;
                  return (
                    <button
                      key={g.name}
                      onClick={() => handleBgChange('gradient', g.value)}
                      className={`h-11 rounded-xl bg-gradient-to-r relative flex items-center justify-center cursor-pointer overflow-hidden transition-all hover:scale-102 hover:shadow-sm border border-neutral-200/40 dark:border-neutral-800/40 ${g.value}`}
                      title={g.name}
                    >
                      {isSelected && (
                        <span className="p-1 rounded-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Solids */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                Solid Colors
              </span>
              <div className="grid grid-cols-3 gap-2" id="settings-solid-grid">
                {SOLIDS.map((s) => {
                  const isSelected = settings.bgValue === s.value;
                  return (
                    <button
                      key={s.name}
                      onClick={() => handleBgChange('solid', s.value)}
                      className={`h-11 rounded-xl relative flex items-center justify-center cursor-pointer transition-all hover:scale-102 hover:shadow-sm border border-neutral-200 dark:border-neutral-800 ${s.value}`}
                      title={s.name}
                    >
                      {isSelected && (
                        <span className="p-1 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Custom Search Engines & Shortcuts */}
          <div className="border-t border-neutral-100 dark:border-elegant-border pt-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-500" />
                Custom Search Engines & Shortcuts
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                Add custom search engines and shortcuts (e.g. prefixing search with <code className="font-mono text-indigo-500">/yt</code> or <code className="font-mono text-indigo-500">!g</code>). Use <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">{`{query}`}</code> in templates.
              </p>
            </div>

            {/* List of custom search engines */}
            <div className="space-y-2">
              {(settings.customSearchEngines || []).map((engine) => (
                <div key={engine.id} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-elegant-card-darker/40 border border-neutral-200 dark:border-elegant-border text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800 dark:text-white">{engine.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px]">
                        {engine.shortcut}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-1 font-mono">
                      {engine.url}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (settings.customSearchEngines || []).filter(e => e.id !== engine.id);
                      onUpdateSettings({ ...settings, customSearchEngines: updated });
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer ml-2 flex-shrink-0"
                    title="Remove Engine"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {/* Add form */}
              <div className="p-4 rounded-2xl border border-dashed border-neutral-200 dark:border-elegant-border-hover bg-neutral-50/10 dark:bg-elegant-card-darker/5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                  Add Custom Search Engine
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name: e.g., YouTube"
                    id="custom-engine-name"
                    className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-neutral-800 dark:text-neutral-100"
                  />
                  <input
                    type="text"
                    placeholder="Shortcut: e.g., /yt"
                    id="custom-engine-shortcut"
                    className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-neutral-800 dark:text-neutral-100 font-mono"
                  />
                </div>
                <input
                  type="text"
                  placeholder="URL template: e.g., https://youtube.com/results?search_query={query}"
                  id="custom-engine-url"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-neutral-800 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById('custom-engine-name') as HTMLInputElement;
                    const shortcutInput = document.getElementById('custom-engine-shortcut') as HTMLInputElement;
                    const urlInput = document.getElementById('custom-engine-url') as HTMLInputElement;
                    
                    if (nameInput && shortcutInput && urlInput) {
                      const name = nameInput.value.trim();
                      const shortcut = shortcutInput.value.trim();
                      const url = urlInput.value.trim();
                      
                      if (!name || !shortcut || !url) {
                        alert('All fields are required to add a custom search engine.');
                        return;
                      }
                      
                      const formattedShortcut = shortcut.startsWith('/') || shortcut.startsWith('!') ? shortcut : '/' + shortcut;
                      
                      const newEngine: CustomSearchEngine = {
                        id: 'custom-' + Date.now(),
                        name,
                        shortcut: formattedShortcut,
                        url,
                        placeholder: `Search ${name}...`
                      };
                      
                      const updated = [...(settings.customSearchEngines || []), newEngine];
                      onUpdateSettings({ ...settings, customSearchEngines: updated });
                      
                      nameInput.value = '';
                      shortcutInput.value = '';
                      urlInput.value = '';
                    }
                  }}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Save New Search Engine
                </button>
              </div>
            </div>
          </div>

          {/* Cloud Sync & Backup */}
          <div className="border-t border-neutral-100 dark:border-elegant-border pt-5 space-y-4" id="cloud-sync-section">
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2" id="cloud-sync-title">
                <Cloud className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Cloud Sync & Backup
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                Save your dashboard to a secure cloud profile to sync your bookmarks, todos, and settings across all your browsers and devices.
              </p>
            </div>

            {/* Conflict Detection UI */}
            {conflictData && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 space-y-3 animate-in zoom-in-95 duration-150" id="sync-conflict-resolution">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-xs">Sync Conflict Detected</h5>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Both your local browser and cloud profile have new changes since your last sync. How would you like to proceed?
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleResolveConflict('local')}
                    className="py-2 px-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] text-center transition-all cursor-pointer shadow-sm"
                  >
                    Keep Local
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveConflict('cloud')}
                    className="py-2 px-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] text-center transition-all cursor-pointer shadow-sm"
                  >
                    Keep Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveConflict('merge')}
                    className="py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] text-center transition-all cursor-pointer shadow-sm"
                  >
                    Merge Both
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictData(null)}
                  className="w-full text-center text-[10px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Optional Secure Authentication UI */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-elegant-card-darker/20 border border-neutral-200 dark:border-elegant-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                  Optional Sync Authentication
                </span>
                {currentUser && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                    Logged In
                  </span>
                )}
              </div>
              
              {currentUser ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Logged in as <strong className="text-neutral-700 dark:text-neutral-200">{currentUser.email}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 dark:border-elegant-border dark:hover:bg-elegant-card-darker text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    Logout Account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    Authenticate to lock sync profiles to your account and restrict other users from reading or overwriting your synced data.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      className="py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer text-center"
                    >
                      Google Sign-In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailForm(!showEmailForm);
                        setIsSignUp(false);
                      }}
                      className="py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-elegant-card-darker dark:hover:bg-elegant-border border border-transparent dark:border-elegant-border rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer text-center"
                    >
                      Email Login
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed text-center">
                    💡 <strong>Tip:</strong> If hosting on custom domains (e.g., Cloudflare Pages) and Google Sign-In fails with an unauthorized domain error, please use <strong>Email Login</strong>—it works seamlessly everywhere without domain restrictions!
                  </p>
                  
                  {showEmailForm && (
                    <form onSubmit={handleEmailAuth} className="space-y-2 pt-1 animate-in slide-in-from-top-1 duration-150">
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-xs focus:outline-none text-neutral-800 dark:text-neutral-100"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-xs focus:outline-none text-neutral-800 dark:text-neutral-100"
                        required
                      />
                      <div className="flex justify-between items-center pt-1">
                        <button
                          type="button"
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-[10px] text-indigo-500 font-semibold cursor-pointer hover:underline"
                        >
                          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          {isSignUp ? 'Register' : 'Sign In'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Custom Firebase Project Configuration */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-elegant-card-darker/20 border border-neutral-200 dark:border-elegant-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                  Custom Firebase Project (Custom Domains)
                </span>
                {isUsingCustomFirebase ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Custom Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                    Default Sandbox
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  The automated AI Studio starter project is sandboxed and does not allow adding custom authorized domains. If you are hosting this startpage on <strong>Cloudflare Pages</strong> or another custom domain, you can connect it to your own 100% free Firebase project!
                </p>

                {!showCustomFirebase && (
                  <button
                    type="button"
                    onClick={() => setShowCustomFirebase(true)}
                    className="w-full py-1.5 rounded-xl border border-dashed border-neutral-300 dark:border-elegant-border hover:bg-neutral-100 dark:hover:bg-elegant-card-darker text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-all cursor-pointer text-center block"
                  >
                    {isUsingCustomFirebase ? '⚙️ Manage Custom Firebase Config' : '🔌 Connect Your Own Firebase Project'}
                  </button>
                )}

                {showCustomFirebase && (
                  <div className="space-y-3 pt-1 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                    <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400 space-y-1.5 bg-white dark:bg-elegant-card-darker/50 p-3 rounded-xl border border-neutral-200/60 dark:border-elegant-border">
                      <div className="font-bold text-neutral-700 dark:text-neutral-300">How to set up:</div>
                      <ol className="list-decimal list-inside space-y-1 pl-1">
                        <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">console.firebase.google.com</a> & create a free project.</li>
                        <li>In your project settings, add a <strong>Web App</strong>.</li>
                        <li>Copy the <code>firebaseConfig</code> code block or JSON.</li>
                        <li>Paste it below and click Save!</li>
                      </ol>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide block">
                        Firebase Web App Config JSON or Javascript Block
                      </label>
                      <textarea
                        rows={6}
                        placeholder={`{
  "apiKey": "AIzaSy...",
  "authDomain": "your-app.firebaseapp.com",
  "projectId": "your-app",
  "storageBucket": "your-app.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:1234:web:abcd"
}`}
                        value={customFirebaseJson}
                        onChange={(e) => setCustomFirebaseJson(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-[11px] font-mono focus:outline-none text-neutral-800 dark:text-neutral-100 resize-none leading-relaxed"
                      />
                    </div>

                    {customFirebaseInputError && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400 text-[10.5px] leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{customFirebaseInputError}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveCustomFirebase}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer text-center"
                      >
                        Save & Apply Config
                      </button>
                      
                      {isUsingCustomFirebase && (
                        <button
                          type="button"
                          onClick={handleResetCustomFirebase}
                          className="py-1.5 px-3 border border-red-200 hover:bg-red-500/10 dark:border-red-900/30 text-red-500 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                          title="Reset to Default Starter Sandbox"
                        >
                          Reset to Sandbox
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomFirebase(false);
                          setCustomFirebaseInputError(null);
                        }}
                        className="py-1.5 px-3 border border-neutral-200 hover:bg-neutral-100 dark:border-elegant-border dark:hover:bg-elegant-card-darker text-neutral-500 dark:text-neutral-400 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {syncCode ? (
              /* Connected State */
              <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/20" id="sync-connected-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Connected to Cloud
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectSync}
                    className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    id="disconnect-sync-btn"
                  >
                    Disconnect
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-elegant-card-darker/60 rounded-xl p-2.5 border border-neutral-100 dark:border-elegant-border">
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider pl-1.5">
                    Sync Code:
                  </span>
                  <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 flex-1 pl-1 select-all" id="sync-code-display">
                    {syncCode}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-elegant-border/30 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all cursor-pointer"
                    id="copy-sync-code-btn"
                    title="Copy Sync Code"
                  >
                    {isSyncCopied ? (
                      <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in-50 duration-150" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Profile Ownership Guard Display */}
                {currentUser ? (
                  <div className="pt-1.5 pb-0.5 px-1">
                    <button
                      type="button"
                      onClick={handleLinkProfileToUser}
                      className="w-full py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-bold transition-all cursor-pointer border border-indigo-100/40 dark:border-indigo-900/30 flex items-center justify-center gap-1.5"
                    >
                      🔐 Secure Profile to My Account
                    </button>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-500 text-center mt-1">
                      Links this Sync Code exclusively to your logged-in email.
                    </p>
                  </div>
                ) : (
                  <div className="pt-1 text-center">
                    <span className="inline-block px-2 py-1 text-[9px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-lg">
                      👤 Anonymous Profile (Sign in to secure access)
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleManualUpload}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white text-xs font-semibold transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    id="cloud-push-btn"
                  >
                    <CloudUpload className="w-4 h-4" />
                    {isSyncing ? 'Syncing...' : 'Push to Cloud'}
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => handleManualDownload(syncCode)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 hover:border-indigo-200 bg-white hover:bg-indigo-50/20 dark:border-elegant-border dark:hover:border-indigo-900/30 dark:bg-elegant-card-darker/40 dark:hover:bg-indigo-950/20 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    id="cloud-pull-btn"
                  >
                    <CloudDownload className="w-4 h-4 text-indigo-500" />
                    {isSyncing ? 'Syncing...' : 'Pull Changes'}
                  </button>
                </div>

                {autoSync && (
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center pt-1 flex items-center justify-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Background Auto-Sync is active. Your dashboard is automatically synchronized.
                  </p>
                )}
              </div>
            ) : (
              /* Disconnected State */
              <div className="space-y-4 p-4 rounded-2xl bg-neutral-50/50 dark:bg-elegant-card-darker/20 border border-neutral-200/50 dark:border-elegant-border/40" id="sync-disconnected-card">
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleGenerateNewCode}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                    id="generate-sync-profile-btn"
                  >
                    <CloudUpload className="w-4 h-4" />
                    {isSyncing ? 'Generating...' : 'Create New Sync Profile'}
                  </button>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
                    Creates a fresh cloud-profile using your current dashboard data.
                  </p>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-neutral-200 dark:border-elegant-border"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">
                    Or Link Existing
                  </span>
                  <div className="flex-grow border-t border-neutral-200 dark:border-elegant-border"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter Sync Code (e.g. SP-ABCD-EFGH)"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker/40 text-neutral-800 dark:text-neutral-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all uppercase"
                    id="sync-code-input"
                  />
                  <button
                    type="button"
                    disabled={isSyncing || !syncCodeInput.trim()}
                    onClick={() => handleManualDownload()}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-white dark:text-indigo-400 border border-neutral-800 dark:border-indigo-900/30 rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] whitespace-nowrap cursor-pointer disabled:opacity-50"
                    id="link-sync-btn"
                  >
                    Link & Pull
                  </button>
                </div>
              </div>
            )}

            {/* Status Feedbacks */}
            {syncError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs animate-in fade-in slide-in-from-top-1 duration-150" id="sync-error-msg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{syncError}</span>
              </div>
            )}

            {syncSuccess && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in slide-in-from-top-1 duration-150" id="sync-success-msg">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                <span>{syncSuccess}</span>
              </div>
            )}
          </div>

          {/* Backup & Restore */}
          <div className="border-t border-neutral-100 dark:border-elegant-border pt-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2" id="backup-restore-title">
                <RefreshCcw className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Backup & Restore
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                Save your startpage dashboard data or restore it from an existing backup file or code.
              </p>
            </div>

            {/* Export options */}
            <div className="grid grid-cols-2 gap-3" id="settings-backup-export-options">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100/80 dark:border-elegant-border dark:hover:border-elegant-border-hover dark:bg-elegant-card-darker/50 dark:hover:bg-elegant-card-darker text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                id="export-backup-file-btn"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                Export File
              </button>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100/80 dark:border-elegant-border dark:hover:border-elegant-border-hover dark:bg-elegant-card-darker/50 dark:hover:bg-elegant-card-darker text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                id="copy-backup-text-btn"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in-50 duration-150" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-400" />
                    Copy Text
                  </>
                )}
              </button>
            </div>

            {/* Import options */}
            <div className="space-y-3" id="settings-backup-import-container">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="backup-file-uploader"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-all cursor-pointer hover:scale-[1.01]"
                  id="upload-backup-file-btn"
                >
                  <Upload className="w-4 h-4" />
                  Upload Backup File (.json)
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Or paste backup JSON code here..."
                  className="w-full h-16 px-3 py-2 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50/50 dark:bg-elegant-card-darker/30 text-neutral-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all resize-none font-mono"
                  id="backup-paste-textarea"
                />
                {importText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRestoreFromJSON(importText)}
                    className="absolute right-2 bottom-3 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                    id="restore-backup-btn"
                  >
                    Restore
                  </button>
                )}
              </div>

              {/* Status Feedbacks */}
              {importError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs animate-in fade-in slide-in-from-top-1 duration-150" id="backup-import-error">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in slide-in-from-top-1 duration-150" id="backup-import-success">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                  <span>Backup restored successfully! Your dashboard has been updated.</span>
                </div>
              )}
            </div>
          </div>

          {/* Reset All Data Option */}
          <div className="border-t border-neutral-100 dark:border-elegant-border pt-5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                Danger Zone
              </h4>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Delete all personalized widgets, bookmarks, and settings.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you absolutely sure you want to reset all startpage data? This cannot be undone.')) {
                  onResetData();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 transition-colors cursor-pointer border border-rose-100 dark:border-rose-900/30"
              id="reset-all-data-btn"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Reset Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
