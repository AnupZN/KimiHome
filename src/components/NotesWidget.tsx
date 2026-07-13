import { useState, useEffect, ChangeEvent, memo } from 'react';
import { StickyNote, Plus, Trash2, Copy, Check, FileText, ChevronDown } from 'lucide-react';
import { QuickNote } from '../types';

interface NotesWidgetProps {
  notes: QuickNote[];
  onAddNote: () => void;
  onUpdateNote: (note: QuickNote) => void;
  onDeleteNote: (id: string) => void;
}

const NotesWidget = memo(function NotesWidget({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: NotesWidgetProps) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Default to the first note, or create one if none exist
  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return;
    onUpdateNote({
      ...activeNote,
      content: e.target.value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!activeNote) return;
    onUpdateNote({
      ...activeNote,
      title: e.target.value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopy = async () => {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(activeNote.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <div className="bg-white dark:bg-elegant-card rounded-3xl p-6 border border-neutral-200 dark:border-elegant-border hover:dark:border-elegant-border-hover transition-all duration-300 shadow-sm flex flex-col justify-between h-full" id="notes-widget">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <StickyNote className="w-4 h-4 text-amber-500" />
            Scratchpad Notes
          </h3>
          <button
            onClick={onAddNote}
            className="p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            title="Create New Note"
            id="add-note-btn"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Note Switcher Dropdown */}
        {notes.length > 1 && (
          <div className="relative mb-3.5" id="notes-dropdown-container">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-neutral-100 dark:bg-elegant-card-darker text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer border border-neutral-200/50 dark:border-elegant-border"
            >
              <span className="truncate flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                {activeNote?.title || 'Select Note'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 mt-1 w-full rounded-2xl bg-white dark:bg-elegant-card border border-neutral-200 dark:border-elegant-border shadow-xl py-1.5 z-20 max-h-40 overflow-y-auto scrollbar-thin">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-elegant-border ${
                        activeNote?.id === note.id
                          ? 'text-neutral-900 dark:text-white font-semibold bg-neutral-50 dark:bg-elegant-card-darker'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <span className="truncate">{note.title}</span>
                      {notes.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeNoteId === note.id) {
                              const remaining = notes.filter((n) => n.id !== note.id);
                              setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
                            }
                            onDeleteNote(note.id);
                          }}
                          className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Note Editor Area */}
        {activeNote ? (
          <div className="space-y-3" id={`note-editor-${activeNote.id}`}>
            <input
              type="text"
              value={activeNote.title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              className="w-full bg-transparent border-none outline-none font-bold text-neutral-800 dark:text-neutral-100 text-sm focus:ring-0 p-0 tracking-tight"
              id="note-title-input"
            />
            <textarea
              value={activeNote.content}
              onChange={handleTextChange}
              placeholder="Write anything here... Auto-saves instantly."
              className="w-full bg-transparent border-none outline-none text-xs text-neutral-600 dark:text-neutral-300 focus:ring-0 p-0 h-32 md:h-36 resize-none leading-relaxed"
              id="note-textarea"
            />
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-neutral-400 dark:text-neutral-500">
            No notes found. Create one.
          </div>
        )}
      </div>

      {/* Footer Copy/Delete Actions */}
      {activeNote && (
        <div className="flex justify-between items-center border-t border-neutral-100 dark:border-elegant-border pt-4" id="note-actions">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
            Saved {new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
              id="copy-note-btn"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            {notes.length > 1 && (
              <button
                onClick={() => {
                  const remaining = notes.filter((n) => n.id !== activeNote.id);
                  setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
                  onDeleteNote(activeNote.id);
                }}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Delete Note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default NotesWidget;
