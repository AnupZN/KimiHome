import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Plus, Filter, Sparkles } from 'lucide-react';
import { TodoItem } from '../types';

interface TodoWidgetProps {
  todos: TodoItem[];
  onAddTodo: (text: string, category: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onClearCompleted: () => void;
}

export default function TodoWidget({
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onClearCompleted,
}: TodoWidgetProps) {
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddTodo(newText.trim(), newCategory);
    setNewText('');
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categories = ['Personal', 'Work', 'Study', 'Shopping'];

  return (
    <div className="bg-white dark:bg-elegant-card rounded-3xl p-6 border border-neutral-200 dark:border-elegant-border hover:dark:border-elegant-border-hover transition-all duration-300 shadow-sm flex flex-col justify-between h-full" id="todo-widget">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            Task Tracker
          </h3>
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-red-500 dark:text-neutral-500 transition-colors cursor-pointer"
              id="clear-completed-btn"
            >
              Clear Done
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4" id="todo-progress-container">
          <div className="flex justify-between items-center text-xs text-neutral-400 dark:text-neutral-500 font-bold mb-1">
            <span>{completedCount} of {totalCount} completed</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-100 dark:bg-elegant-card-darker rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-3.5" id="todo-filter-chips">
          {(['all', 'active', 'completed'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === type
                  ? 'bg-neutral-900 text-white dark:bg-elegant-border dark:text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-elegant-card-darker text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-elegant-border'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-4 scrollbar-thin" id="todo-list-container">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-6 text-xs text-neutral-400 dark:text-neutral-500">
              No {filter === 'all' ? '' : filter} tasks found.
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                  todo.completed
                    ? 'bg-neutral-50/50 dark:bg-neutral-950/20 border-neutral-150 dark:border-neutral-900/60 opacity-60'
                    : 'bg-white/90 dark:bg-elegant-card-darker border-neutral-200 dark:border-elegant-border shadow-sm'
                }`}
                id={`todo-item-${todo.id}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => onToggleTodo(todo.id)}
                    className="text-neutral-400 hover:text-emerald-500 dark:text-neutral-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {todo.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span className={`text-xs font-medium truncate ${todo.completed ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                    {todo.text}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    todo.category === 'Work' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : todo.category === 'Study'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : todo.category === 'Shopping'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}>
                    {todo.category}
                  </span>
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-100 dark:border-elegant-border pt-4" id="todo-form">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="New task..."
          className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          id="todo-input-text"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          id="todo-input-category"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="submit"
          className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
          id="add-todo-btn"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
