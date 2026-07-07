import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Globe, Github, Youtube, Mail, BookOpen, Code, Music, Tv, 
  ShoppingBag, Calendar, MessageCircle, Plus, Trash2, Edit2, X, ExternalLink,
  Bookmark as BookmarkIcon, GripVertical
} from 'lucide-react';
import { Bookmark } from '../types';

interface BookmarksWidgetProps {
  bookmarks: Bookmark[];
  onAddBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onUpdateBookmark: (bookmark: Bookmark) => void;
  onReorderBookmarks?: (bookmarks: Bookmark[]) => void;
}

const ICON_MAP = {
  globe: Globe,
  github: Github,
  youtube: Youtube,
  mail: Mail,
  book: BookOpen,
  code: Code,
  music: Music,
  tv: Tv,
  shop: ShoppingBag,
  calendar: Calendar,
  chat: MessageCircle,
};

const COLOR_MAP = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:bg-blue-950/20 dark:border-blue-900/30 hover:bg-blue-500/20 dark:hover:bg-blue-950/35',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-950/35',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:bg-purple-950/20 dark:border-purple-900/30 hover:bg-purple-500/20 dark:hover:bg-purple-950/35',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/30 hover:bg-rose-500/20 dark:hover:bg-rose-950/35',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-900/30 hover:bg-amber-500/20 dark:hover:bg-amber-950/35',
  neutral: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20 dark:bg-neutral-950/20 dark:border-neutral-900/30 hover:bg-neutral-500/20 dark:hover:bg-neutral-950/35',
};

const getDomain = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    return url.hostname;
  } catch (e) {
    try {
      const url = new URL('https://' + urlStr);
      return url.hostname;
    } catch (err) {
      return '';
    }
  }
};

function BookmarkIconItem({ bookmark, size = 'sm', isLarge = false }: { bookmark: Bookmark; size?: 'sm' | 'md' | 'lg'; isLarge?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const domain = getDomain(bookmark.url);

  // Re-initialize attempts if the URL or customIconUrl changes
  useEffect(() => {
    setAttempt(0);
  }, [bookmark.url, bookmark.iconUrl]);

  // List of fallback services
  const getSources = () => {
    if (bookmark.iconUrl) {
      // If there's a custom icon URL, try that first. Fallback to Google/DuckDuckGo if it fails!
      return [
        bookmark.iconUrl,
        domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '',
        domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : '',
        domain ? `https://icon.horse/icon/${domain}` : '',
      ].filter(Boolean);
    } else {
      return [
        domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '',
        domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : '',
        domain ? `https://icon.horse/icon/${domain}` : '',
      ].filter(Boolean);
    }
  };

  const sources = getSources();

  const handleImgError = () => {
    setAttempt((prev) => prev + 1);
  };

  const resolvedSize = isLarge ? 'md' : size;
  const imgSizeClass = resolvedSize === 'lg' ? 'w-14 h-14' : resolvedSize === 'md' ? 'w-7 h-7' : 'w-5 h-5';
  const letterSizeClass = resolvedSize === 'lg' ? 'w-14 h-14 text-xl rounded-2xl' : resolvedSize === 'md' ? 'w-10 h-10 text-base rounded-xl' : 'w-7 h-7 text-xs rounded-xl';

  if (attempt < sources.length && sources[attempt]) {
    return (
      <img
        src={sources[attempt]}
        alt=""
        referrerPolicy="no-referrer"
        onError={handleImgError}
        className={`${imgSizeClass} rounded-2xl object-contain flex-shrink-0`}
      />
    );
  }

  // Generated alphabetical icon when favicon is unavailable
  const firstLetter = bookmark.title ? bookmark.title.charAt(0).toUpperCase() : '?';
  const bgColors = [
    'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-950/20 dark:border-blue-900/30',
    'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-900/30',
    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/30',
    'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-900/30',
    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-950/20 dark:border-indigo-900/30',
    'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-950/20 dark:border-purple-900/30',
  ];
  // Determine color based on title hash
  const charCode = bookmark.title ? bookmark.title.charCodeAt(0) : 0;
  const colorIndex = charCode % bgColors.length;
  const colorClass = bgColors[colorIndex];

  return (
    <div className={`flex items-center justify-center font-bold font-mono border flex-shrink-0 ${letterSizeClass} ${colorClass}`}>
      {firstLetter}
    </div>
  );
}

export default function BookmarksWidget({ 
  bookmarks, 
  onAddBookmark, 
  onDeleteBookmark,
  onUpdateBookmark,
  onReorderBookmarks
}: BookmarksWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState('');
  
  const [category, setCategory] = useState('Favorites');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('bookmarksCategoryOrder');
    return saved ? JSON.parse(saved) : ['Favorites', 'Social', 'Work'];
  });

  const [color, setColor] = useState<keyof typeof COLOR_MAP>('blue');
  const [icon, setIcon] = useState<keyof typeof ICON_MAP>('globe');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const sourceIndex = bookmarks.findIndex(b => b.id === draggedId);
    const targetIndex = bookmarks.findIndex(b => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const sourceBookmark = bookmarks[sourceIndex];
    const targetBookmark = bookmarks[targetIndex];

    // Only allow swapping within the same category to keep grouping clean
    if (sourceBookmark.category !== targetBookmark.category) return;

    const newBookmarks = [...bookmarks];
    newBookmarks[sourceIndex] = targetBookmark;
    newBookmarks[targetIndex] = sourceBookmark;

    if (onReorderBookmarks) {
      onReorderBookmarks(newBookmarks);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  useEffect(() => {
    localStorage.setItem('bookmarksCategoryOrder', JSON.stringify(categoryOrder));
  }, [categoryOrder]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isWide = containerWidth === 0 || containerWidth >= 420;
  const isMedium = containerWidth > 0 && containerWidth >= 320 && containerWidth < 420;
  const isCompact = containerWidth > 0 && containerWidth < 320;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(bookmarks.map(b => b.category)));
    if (!cats.includes('Favorites')) cats.unshift('Favorites');
    if (!cats.includes('Work')) cats.push('Work');
    if (!cats.includes('Social')) cats.push('Social');
    return cats;
  }, [bookmarks]);

  const orderedCategories = useMemo(() => {
    const ordered = categoryOrder.filter(cat => categories.includes(cat));
    const extra = categories.filter(cat => !categoryOrder.includes(cat));
    return [...ordered, ...extra];
  }, [categoryOrder, categories]);

  const handleCategoryDragStart = (e: React.DragEvent, catName: string) => {
    setDraggedCategory(catName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent, targetCatName: string) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCatName) return;

    const sourceIndex = orderedCategories.indexOf(draggedCategory);
    const targetIndex = orderedCategories.indexOf(targetCatName);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newOrder = [...orderedCategories];
    newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCategory);

    setCategoryOrder(newOrder);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategory(null);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setUrl('');
    setCustomIconUrl('');
    setCategory('Favorites');
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setColor('blue');
    setIcon('globe');
    setIsOpen(true);
  };

  const handleOpenEdit = (b: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(b.id);
    setTitle(b.title);
    setUrl(b.url);
    setCustomIconUrl(b.iconUrl || '');
    setCategory(b.category);
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setColor((b.color as any) || 'blue');
    setIcon((b.icon as any) || 'globe');
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    const finalCategory = isCreatingCategory ? newCategoryName.trim() : category;
    if (!finalCategory) return;

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const bookmarkData: Bookmark = {
      id: editingId || Date.now().toString(),
      title: title.trim(),
      url: formattedUrl,
      category: finalCategory,
      color,
      icon,
      iconUrl: customIconUrl.trim() || undefined,
    };

    if (isCreatingCategory) {
      setCategoryOrder((prev) => {
        if (!prev.includes(finalCategory)) {
          return [...prev, finalCategory];
        }
        return prev;
      });
    }

    if (editingId) {
      onUpdateBookmark(bookmarkData);
    } else {
      onAddBookmark(bookmarkData);
    }
    setIsOpen(false);
  };

  const getIconComponent = (iconName: string) => {
    const Comp = ICON_MAP[iconName as keyof typeof ICON_MAP] || Globe;
    return <Comp className="w-5 h-5" />;
  };

  // Group bookmarks by category
  const groupedBookmarks = bookmarks.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {} as Record<string, Bookmark[]>);

  const getGridLayout = () => {
    if (isCompact) {
      const netWidth = containerWidth > 0 ? containerWidth - 48 : 240;
      const cols = Math.max(2, Math.floor((netWidth + 12) / 68));
      return {
        className: "grid gap-3.5 justify-items-center",
        style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      };
    } else if (isMedium) {
      return {
        className: "grid gap-3",
        style: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }
      };
    } else {
      const netWidth = containerWidth > 0 ? containerWidth - 48 : 450;
      const cols = netWidth >= 550 ? 4 : netWidth >= 380 ? 3 : 2;
      return {
        className: "grid gap-3",
        style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      };
    }
  };
  const gridLayout = getGridLayout();

  return (
    <div ref={containerRef} className="w-full bg-white dark:bg-elegant-card rounded-3xl p-6 border border-neutral-200 dark:border-elegant-border hover:dark:border-elegant-border-hover transition-all duration-300 shadow-sm" id="bookmarks-widget">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-semibold text-lg text-neutral-800 dark:text-neutral-200 flex items-center gap-2 truncate">
          <BookmarkIcon className="w-5 h-5 text-neutral-500 flex-shrink-0" />
          <span className="truncate">Bookmarks</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isManageMode 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' 
                : 'bg-transparent border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
            title={isManageMode ? "Exit Manage Mode" : "Manage Bookmarks"}
            id="manage-bookmarks-btn"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAdd}
            className={`rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-sm font-medium ${
              isCompact ? 'p-2' : 'p-1.5 px-3'
            }`}
            id="add-bookmark-btn"
            title="Add Link"
          >
            <Plus className="w-4 h-4" />
            {!isCompact && <span>Add Link</span>}
          </button>
        </div>
      </div>

      {isManageMode && (
        <div className="mb-6 p-3 px-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>
              <strong>Manage Mode:</strong> Click any card to edit details, or use the red button to delete.
            </span>
          </span>
          <button 
            onClick={() => setIsManageMode(false)}
            className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-100 cursor-pointer text-[11px]"
          >
            Done
          </button>
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="text-center py-8 text-neutral-400 dark:text-neutral-500 text-sm">
          No bookmarks saved. Click Add Link to populate.
        </div>
      ) : (
        <div className="space-y-6">
          {orderedCategories.map((cat) => {
            const list = groupedBookmarks[cat] || [];
            if (list.length === 0) return null;
            return (
              <div key={cat} className="space-y-3" id={`category-${cat.toLowerCase()}`}>
                <div 
                  draggable={true}
                  onDragStart={(e) => handleCategoryDragStart(e, cat)}
                  onDragOver={(e) => handleCategoryDragOver(e, cat)}
                  onDragEnd={handleCategoryDragEnd}
                  className={`flex items-center gap-1.5 py-1 px-2 -mx-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all w-fit select-none ${
                    draggedCategory === cat ? 'opacity-30 border border-indigo-500 border-dashed' : ''
                  }`}
                  title="Drag to reorder category"
                >
                  <GripVertical className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 flex-shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {cat}
                  </h4>
                </div>
                <div className={gridLayout.className} style={gridLayout.style}>
                {list.map((b) => {
                  const colorClass = COLOR_MAP[b.color as keyof typeof COLOR_MAP] || COLOR_MAP.blue;
                  
                  if (isCompact) {
                    if (isManageMode) {
                      return (
                        <div
                          key={b.id}
                          onClick={(e) => handleOpenEdit(b, e)}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, b.id)}
                          onDragOver={(e) => handleDragOver(e, b.id)}
                          onDragEnd={handleDragEnd}
                          className={`group relative flex items-center justify-center p-0 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${colorClass} border-amber-400/70 dark:border-amber-500/40 ring-2 ring-amber-400/10 dark:ring-amber-500/5 w-14 h-14 ${
                            draggedId === b.id ? 'opacity-40 scale-95 border-dashed' : ''
                          }`}
                          title={`Drag to reorder / Click to edit ${b.title}`}
                          id={`bookmark-manage-${b.id}`}
                        >
                          <BookmarkIconItem bookmark={b} size="lg" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onDeleteBookmark(b.id);
                            }}
                            className="absolute -right-1 -top-1 p-0.5 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center scale-90"
                            title="Delete Bookmark"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={b.id}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, b.id)}
                        onDragOver={(e) => handleDragOver(e, b.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative flex items-center justify-center p-0 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing ${colorClass} w-14 h-14 ${
                          draggedId === b.id ? 'opacity-40 scale-95 border-dashed' : ''
                        }`}
                        title={`Drag to reorder: ${b.title}`}
                        id={`bookmark-link-${b.id}`}
                      >
                        <BookmarkIconItem bookmark={b} size="lg" />
                      </a>
                    );
                  }

                  if (isMedium) {
                    if (isManageMode) {
                      return (
                        <div
                          key={b.id}
                          onClick={(e) => handleOpenEdit(b, e)}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, b.id)}
                          onDragOver={(e) => handleDragOver(e, b.id)}
                          onDragEnd={handleDragEnd}
                          className={`group relative flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${colorClass} border-amber-400/70 dark:border-amber-500/40 ring-2 ring-amber-400/10 dark:ring-amber-500/5 min-w-0 ${
                            draggedId === b.id ? 'opacity-40 scale-95 border-dashed' : ''
                          }`}
                          title={`Drag to reorder / Click to edit ${b.title}`}
                          id={`bookmark-manage-${b.id}`}
                        >
                          <span className="flex-shrink-0">
                            <BookmarkIconItem bookmark={b} size="sm" />
                          </span>
                          <div className="min-w-0 flex-1 pr-14">
                            <p className="text-sm font-semibold truncate leading-tight text-neutral-800 dark:text-neutral-100">
                              {b.title}
                            </p>
                            <p className="text-[10px] truncate opacity-60 font-mono mt-0.5 text-amber-600 dark:text-amber-400">
                              Click to Edit
                            </p>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onDeleteBookmark(b.id);
                              }}
                              className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center hover:scale-105"
                              title="Delete Bookmark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={b.id}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, b.id)}
                        onDragOver={(e) => handleDragOver(e, b.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative flex items-center gap-2.5 p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing ${colorClass} min-w-0 ${
                          draggedId === b.id ? 'opacity-40 scale-95 border-dashed' : ''
                        }`}
                        title={`Drag to reorder: ${b.title}`}
                        id={`bookmark-link-${b.id}`}
                      >
                        <span className="flex-shrink-0">
                          <BookmarkIconItem bookmark={b} size="sm" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate leading-tight text-neutral-800 dark:text-neutral-100">
                            {b.title}
                          </p>
                        </div>
                      </a>
                    );
                  }

                  // Default / Wide Mode
                  if (isManageMode) {
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => handleOpenEdit(b, e)}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, b.id)}
                        onDragOver={(e) => handleDragOver(e, b.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${colorClass} border-amber-400/70 dark:border-amber-500/40 ring-2 ring-amber-400/10 dark:ring-amber-500/5 min-w-0 ${
                          draggedId === b.id ? 'opacity-40 scale-95 border-dashed' : ''
                        }`}
                        title={`Drag to reorder / Click to edit ${b.title}`}
                        id={`bookmark-manage-${b.id}`}
                      >
                        <span className="flex-shrink-0">
                          <BookmarkIconItem bookmark={b} size="sm" />
                        </span>
                        <div className="min-w-0 flex-1 pr-14">
                          <p className="text-sm font-semibold truncate leading-tight text-neutral-800 dark:text-neutral-100">
                            {b.title}
                          </p>
                          <p className="text-[10px] truncate opacity-60 font-mono mt-0.5 text-amber-600 dark:text-amber-400">
                            Click to Edit
                          </p>
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onDeleteBookmark(b.id);
                            }}
                            className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm transition-all cursor-pointer flex items-center justify-center hover:scale-105"
                            title="Delete Bookmark"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={b.id}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, b.id)}
                      onDragOver={(e) => handleDragOver(e, b.id)}
                      onDragEnd={handleDragEnd}
                      className={`group relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing ${colorClass} min-w-0 ${
                        draggedId === b.id ? 'opacity-40 scale-95 border-dashed' : ''
                      }`}
                      title={`Drag to reorder: ${b.title}`}
                      id={`bookmark-link-${b.id}`}
                    >
                      <span className="flex-shrink-0">
                        <BookmarkIconItem bookmark={b} size="sm" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate leading-tight text-neutral-800 dark:text-neutral-100">
                          {b.title}
                        </p>
                        <p className="text-[10px] truncate opacity-60 font-mono mt-0.5">
                          {b.url.replace(/https?:\/\/(www\.)?/, '')}
                        </p>
                      </div>
                    </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bookmark Modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div 
            className="relative bg-white dark:bg-elegant-card border border-neutral-200 dark:border-elegant-border rounded-3xl max-w-md w-full p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150"
            id="bookmark-modal"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-xl text-neutral-900 dark:text-white mb-5" id="bookmark-modal-title">
              {editingId ? 'Edit Bookmark' : 'Add New Bookmark'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                  Bookmark Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GitHub"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all"
                  id="bookmark-title-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                  URL / Website Address
                </label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. github.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all"
                  id="bookmark-url-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Custom Icon URL (Optional)</span>
                  <span className="text-[10px] font-normal normal-case text-neutral-400 dark:text-neutral-500">Overrides automatic favicon</span>
                </label>
                <input
                  type="text"
                  value={customIconUrl}
                  onChange={(e) => setCustomIconUrl(e.target.value)}
                  placeholder="e.g. https://example.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all"
                  id="bookmark-custom-icon-url-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={isCreatingCategory ? 'New' : category}
                    onChange={(e) => {
                      if (e.target.value === 'New') {
                        setIsCreatingCategory(true);
                        setNewCategoryName('');
                      } else {
                        setIsCreatingCategory(false);
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all"
                    id="bookmark-category-select"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="New">+ Create Category</option>
                  </select>
                </div>

                {isCreatingCategory && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                      New Category
                    </label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      placeholder="e.g. Entertainment"
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-neutral-50 dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all"
                      id="bookmark-new-category-input"
                    />
                  </div>
                )}
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                  Select Icon
                </label>
                <div className="grid grid-cols-6 gap-2" id="bookmark-icon-grid">
                  {Object.keys(ICON_MAP).map((iconName) => {
                    const IconComp = ICON_MAP[iconName as keyof typeof ICON_MAP];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setIcon(iconName as any)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          icon === iconName
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-950 dark:border-neutral-50'
                            : 'bg-neutral-50 dark:bg-elegant-card-darker border-neutral-200 dark:border-elegant-border text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                  Highlight Color
                </label>
                <div className="flex gap-2.5" id="bookmark-color-chips">
                  {Object.keys(COLOR_MAP).map((colorKey) => {
                    const isSelected = color === colorKey;
                    const bgColors: Record<string, string> = {
                      blue: 'bg-blue-500',
                      emerald: 'bg-emerald-500',
                      purple: 'bg-purple-500',
                      rose: 'bg-rose-500',
                      amber: 'bg-amber-500',
                      neutral: 'bg-neutral-500',
                    };
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setColor(colorKey as any)}
                        className={`w-7 h-7 rounded-full cursor-pointer relative flex items-center justify-center transition-all hover:scale-110 ${bgColors[colorKey]}`}
                        title={colorKey}
                      >
                        {isSelected && (
                           <span className="absolute w-2 h-2 rounded-full bg-white shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteBookmark(editingId);
                      setIsOpen(false);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold transition-colors text-sm cursor-pointer flex items-center justify-center gap-1.5"
                    title="Delete Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors text-sm cursor-pointer"
                  id="bookmark-save-submit-btn"
                >
                  {editingId ? 'Save Changes' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
