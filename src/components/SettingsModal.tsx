import React, { useState, useRef } from 'react';
import { 
  X, Settings, Check, RefreshCcw, Eye, EyeOff,
  ArrowUp, ArrowDown, Grid, Cloud, Clock, Bookmark, 
  CheckSquare, FileText, Search, Upload, Download, Copy,
  AlertCircle, CheckCircle2, CloudUpload, CloudDownload
} from 'lucide-react';
import { UserSettings, Bookmark as BookmarkType, TodoItem, QuickNote } from '../types';
import { uploadToCloud, downloadFromCloud, generateSyncCode } from '../lib/syncService';

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

      const savedCatOrder = localStorage.getItem('bookmarksCategoryOrder');
      const categoryOrder = savedCatOrder ? JSON.parse(savedCatOrder) : undefined;

      await uploadToCloud(syncCode, {
        settings,
        bookmarks,
        todos,
        notes,
        categoryOrder,
      });

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

      const result = await downloadFromCloud(targetCode);
      onImportData({
        settings: result.userSettings,
        bookmarks: result.bookmarksList,
        todos: result.todosList,
        notes: result.notesList,
        categoryOrder: result.bookmarksCategoryOrder,
      });

      const cleanCode = targetCode.trim().toUpperCase();
      onSaveSyncSettings(cleanCode, true);
      setSyncCodeInput(cleanCode);

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
