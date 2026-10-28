import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TodoItem, TagCode } from '../../types';
import { TAGS_CONFIG, QUADS_CONFIG } from '../../constants/config';
import {
  X,
  Plus,
  Trash2,
  Star,
  Target,
  Sparkles,
  Inbox,
  CheckCircle2,
  Circle,
  ChevronDown,
  Layers,
  RotateCcw
} from 'lucide-react';

interface TodoInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  onAddTodo: (text: string, tag: TagCode) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onPromoteToGolden: (todo: TodoItem) => void;
  onPromoteToQuad: (todo: TodoItem, quadKey: 'q1' | 'q2' | 'q3' | 'q4') => void;
  lang: 'ar' | 'en';
}

// 5 core life dimensions (Sleep and Waste removed per user request)
const AVAILABLE_TAGS: TagCode[] = ['E', 'V', 'R', 'S', 'SC'];

export const TodoInboxDrawer: React.FC<TodoInboxDrawerProps> = ({
  isOpen,
  onClose,
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onPromoteToGolden,
  onPromoteToQuad,
  lang
}) => {
  const [inputText, setInputText] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all'); // 'all', 'active', 'done', or specific TagCode
  const [activeQuadMenuId, setActiveQuadMenuId] = useState<string | null>(null);
  const [quadMenuDirection, setQuadMenuDirection] = useState<Record<string, 'up' | 'down'>>({});

  // Tag selection modal upon pressing Enter
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [pendingTodoText, setPendingTodoText] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Focus input on drawer open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setActiveQuadMenuId(null);
      setIsTagPickerOpen(false);
    }
  }, [isOpen]);

  // Close quad menu when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveQuadMenuId(null);
      }
    };
    if (activeQuadMenuId) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeQuadMenuId]);

  // Keyboard navigation & Shortcuts (Esc to close, 1-5 for tags in picker)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        if (isTagPickerOpen) {
          setIsTagPickerOpen(false);
          setPendingTodoText('');
        } else if (activeQuadMenuId) {
          setActiveQuadMenuId(null);
        } else {
          onClose();
        }
        return;
      }

      // If Tag Picker Modal is open, allow quick numeric keys 1-5 and 0
      if (isTagPickerOpen) {
        if (e.key === '1') {
          e.preventDefault();
          handleConfirmCreate('E');
        } else if (e.key === '2') {
          e.preventDefault();
          handleConfirmCreate('V');
        } else if (e.key === '3') {
          e.preventDefault();
          handleConfirmCreate('R');
        } else if (e.key === '4') {
          e.preventDefault();
          handleConfirmCreate('S');
        } else if (e.key === '5') {
          e.preventDefault();
          handleConfirmCreate('SC');
        } else if (e.key === '0' || (e.key === 'Enter' && !e.repeat)) {
          e.preventDefault();
          handleConfirmCreate('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTagPickerOpen, activeQuadMenuId, onClose, pendingTodoText]);

  // Distribution & Balance Calculation across the 5 tags
  const tagStats = useMemo(() => {
    const counts: Record<TagCode, number> = { '': 0, E: 0, V: 0, SC: 0, S: 0, R: 0, SL: 0 };
    let totalActive = 0;
    let withoutTagCount = 0;

    todos.forEach((t) => {
      if (!t.done) {
        if (t.tag && counts[t.tag] !== undefined) {
          counts[t.tag] = (counts[t.tag] || 0) + 1;
        } else {
          withoutTagCount++;
        }
        totalActive++;
      }
    });

    const activeAspectsCount = AVAILABLE_TAGS.filter((tag) => counts[tag] > 0).length;
    return { counts, totalActive, activeAspectsCount, withoutTagCount };
  }, [todos]);

  // Filtered todos
  const filteredTodos = useMemo(() => {
    return todos.filter((item) => {
      if (filterTag === 'active') return !item.done;
      if (filterTag === 'done') return item.done;
      if (filterTag === 'no_tag') return !item.tag;
      if (filterTag !== 'all') return item.tag === filterTag;
      return true;
    });
  }, [todos, filterTag]);

  if (!isOpen) return null;

  // Open Tag Picker when user submits / presses Enter
  const handleTriggerAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setPendingTodoText(trimmed);
    setIsTagPickerOpen(true);
  };

  const handleConfirmCreate = (tag: TagCode) => {
    if (!pendingTodoText.trim()) return;
    onAddTodo(pendingTodoText.trim(), tag);
    setPendingTodoText('');
    setInputText('');
    setIsTagPickerOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleToggleQuadMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (activeQuadMenuId === id) {
      setActiveQuadMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // If space below is less than 240px AND space above is greater, open upward; otherwise open downward
    const openDown = rect.top < 240 || (window.innerHeight - rect.bottom > 220);
    setQuadMenuDirection((prev) => ({ ...prev, [id]: openDown ? 'down' : 'up' }));
    setActiveQuadMenuId(id);
  };

  const getTagTitle = (code: TagCode) => {
    const cfg = TAGS_CONFIG[code];
    if (!cfg) return code || (lang === 'ar' ? 'بدون تاق' : 'No Tag');
    return cfg.fullTitle[lang].split('(')[0].trim();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div
        className="relative z-10 w-full sm:w-[480px] md:w-[520px] bg-[var(--card)] text-[var(--ink)] h-full shadow-2xl border-s border-[var(--line)] flex flex-col transition-transform duration-300 animate-in slide-in-from-right"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--ink)] flex items-center gap-2">
                <span>{lang === 'ar' ? 'صندوق الأفكار والمهام' : 'Brain Dump & Inbox'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                  {tagStats.totalActive}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--ink-soft)] font-medium">
                {lang === 'ar'
                  ? 'اكتب أفكارك بسرعة ووزّعها على جوانب الحياة والأولويات'
                  : 'Capture ideas quickly & route to priorities and life dimensions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Dimensions Balance Bar */}
        <div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--bg)] shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{lang === 'ar' ? 'توازن جوانب الحياة الخمسة:' : '5 Life Dimensions Balance:'}</span>
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                tagStats.activeAspectsCount >= 3
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              {lang === 'ar'
                ? `${tagStats.activeAspectsCount} من 5 مجالات نشطة`
                : `${tagStats.activeAspectsCount}/5 active areas`}
            </span>
          </div>

          {/* Mini Visual Distribution Track */}
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {AVAILABLE_TAGS.map((tag) => {
              const count = tagStats.counts[tag] || 0;
              const pct = tagStats.totalActive > 0 ? (count / tagStats.totalActive) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={tag}
                  style={{ width: `${pct}%`, backgroundColor: TAGS_CONFIG[tag]?.color }}
                  className="h-full transition-all duration-300"
                  title={`${getTagTitle(tag)}: ${count}`}
                />
              );
            })}
          </div>

          {/* Quick Filter Badges across the 5 tags + No Tag */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
            {AVAILABLE_TAGS.map((tag) => {
              const count = tagStats.counts[tag] || 0;
              const isSelected = filterTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(isSelected ? 'all' : tag)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                      : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: TAGS_CONFIG[tag]?.color }}
                  />
                  <span>{tag}</span>
                  {count > 0 && <span className="font-mono text-[10px] opacity-80">({count})</span>}
                </button>
              );
            })}

            {tagStats.withoutTagCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTag(filterTag === 'no_tag' ? 'all' : 'no_tag')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer border ${
                  filterTag === 'no_tag'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                    : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <span>{lang === 'ar' ? 'بدون تاق' : 'No Tag'}</span>
                <span className="font-mono text-[10px] opacity-80">({tagStats.withoutTagCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Form with Enter-to-choose-tag */}
        <form
          onSubmit={handleTriggerAdd}
          className="p-3.5 border-b border-[var(--line)] bg-[var(--card)] shrink-0 flex flex-col gap-2 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'اكتب مهمة أو فكرة جديدة (Enter لاختيار التصنيف)...'
                  : 'Add new task or brain dump (Enter to choose tag)...'
              }
              className="flex-1 text-sm bg-[var(--bg)] border border-[var(--line)] focus:border-indigo-500 rounded-xl px-3 py-2 outline-hidden transition-all text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
              title={lang === 'ar' ? 'إضافة واختيار التصنيف' : 'Add and select tag'}
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--ink-soft)] px-1">
            <span>
              {lang === 'ar'
                ? '💡 اضغط Enter لفتح قائمة التصنيفات الخمسة أو الاختيار بدون تاق'
                : '💡 Press Enter to choose among 5 tags or add without tag'}
            </span>
          </div>
        </form>

        {/* Filter Pills (All / Active / Completed) */}
        <div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--bg)]/50 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterTag('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterTag === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'} ({todos.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTag('active')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterTag === 'active'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
              }`}
            >
              {lang === 'ar' ? 'قيد التنفيذ' : 'Pending'} ({tagStats.totalActive})
            </button>
            <button
              type="button"
              onClick={() => setFilterTag('done')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterTag === 'done'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
              }`}
            >
              {lang === 'ar' ? 'المنجز' : 'Done'} ({todos.length - tagStats.totalActive})
            </button>
          </div>

          {filterTag !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterTag('all')}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </button>
          )}
        </div>

        {/* Task Items List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 relative">
          {filteredTodos.length === 0 ? (
            <div className="py-12 text-center text-[var(--ink-soft)] flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 opacity-80" />
              </div>
              <p className="font-semibold text-sm text-[var(--ink)]">
                {lang === 'ar' ? 'لا توجد مهام في هذا التصنيف' : 'No tasks in this view'}
              </p>
              <p className="text-xs max-w-xs text-[var(--ink-soft)]">
                {lang === 'ar'
                  ? 'اكتب أي فكرة أو مهمة في الحقل أعلاه لتنظيمها وتوجيهها'
                  : 'Write any idea or task above to organize and promote'}
              </p>
            </div>
          ) : (
            filteredTodos.map((item, index) => {
              const tagCfg = item.tag ? TAGS_CONFIG[item.tag] : null;
              const isQuadMenuOpen = activeQuadMenuId === item.id;
              const menuDir = quadMenuDirection[item.id] || (index < 2 ? 'down' : 'up');

              // Status styles based on whether it was promoted to matrix, golden goal, or completed directly
              const isPromotedToQuad = item.done && item.promotedTo === 'quad';
              const isPromotedToGolden = item.done && item.promotedTo === 'golden';
              const isDirectlyCompleted = item.done && !item.promotedTo;

              return (
                <div
                  key={item.id}
                  className={`group p-3 rounded-xl border transition-all flex flex-col gap-2.5 ${
                    isPromotedToQuad
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs'
                      : isPromotedToGolden
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60 shadow-2xs'
                      : isDirectlyCompleted
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-800/40 opacity-80'
                      : 'bg-[var(--card)] border-[var(--line)] hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {/* Checkbox / Status Icon */}
                      <button
                        type="button"
                        onClick={() => onToggleTodo(item.id)}
                        className="mt-0.5 transition-colors cursor-pointer shrink-0"
                        title={
                          item.done
                            ? lang === 'ar' ? 'إعادة المهمة لقيد التنفيذ' : 'Mark as pending'
                            : lang === 'ar' ? 'إنجاز من الصندوق مباشرة' : 'Complete from inbox'
                        }
                      >
                        {isPromotedToQuad ? (
                          <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] ring-1 ring-indigo-400">
                            🎯
                          </div>
                        ) : isPromotedToGolden ? (
                          <div className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] ring-1 ring-amber-400">
                            ⭐
                          </div>
                        ) : isDirectlyCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-medium leading-relaxed break-words ${
                            item.done
                              ? 'line-through text-[var(--ink-soft)]'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          {item.text}
                        </span>

                        {/* Badges Bar: Tag + Status Distinction */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Tag Badge (if exists) */}
                          {item.tag && tagCfg ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                              style={{
                                borderColor: tagCfg.color,
                                color: tagCfg.color,
                                backgroundColor: tagCfg.bgTint
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: tagCfg.color }}
                              />
                              <span>{tagCfg.fullTitle[lang].split('(')[0].trim()}</span>
                              <span className="font-mono opacity-70">[{item.tag}]</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-[var(--ink-soft)] bg-slate-100 dark:bg-slate-800 border border-[var(--line)]">
                              {lang === 'ar' ? 'بدون تاق' : 'No Tag'}
                            </span>
                          )}

                          {/* Distinct Status Badges for completed / transferred tasks */}
                          {isPromotedToQuad && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                              <span>🎯 {lang === 'ar' ? 'نُقل إلى مصفوفة الأولويات' : 'Sent to Priorities'}:</span>
                              <span className="font-mono uppercase font-black">{item.promotedQuad}</span>
                              {item.promotedQuad && (
                                <span className="opacity-80 font-normal">
                                  ({item.promotedQuad === 'q1'
                                    ? (lang === 'ar' ? 'عاجل ومهم' : 'Urgent')
                                    : item.promotedQuad === 'q2'
                                    ? (lang === 'ar' ? 'مهم وغير عاجل' : 'Important')
                                    : item.promotedQuad === 'q3'
                                    ? (lang === 'ar' ? 'عاجل وغير مهم' : 'Delegate')
                                    : (lang === 'ar' ? 'غير عاجل وغير مهم' : 'Eliminate')})
                                </span>
                              )}
                            </span>
                          )}

                          {isPromotedToGolden && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-2xs">
                              <span>⭐ {lang === 'ar' ? 'منقول إلى الهدف الذهبي لليوم' : 'Promoted to Golden Goal'}</span>
                            </span>
                          )}

                          {isDirectlyCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                              <span>✓ {lang === 'ar' ? 'منجز من الصندوق مباشرة' : 'Completed from Inbox'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Restore button if completed/promoted */}
                      {item.done && (
                        <button
                          type="button"
                          onClick={() => onToggleTodo(item.id)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md opacity-70 hover:opacity-100 transition-all cursor-pointer"
                          title={lang === 'ar' ? 'إعادة تفعيل المهمة' : 'Reactivate task'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onDeleteTodo(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-md opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                        title={lang === 'ar' ? 'حذف من الصندوق' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Promotion Actions Bar for Active Tasks */}
                  {!item.done && (
                    <div className="pt-2 border-t border-[var(--line)]/70 flex items-center justify-between gap-1 text-xs">
                      {/* Promote to Golden Goal Button */}
                      <button
                        type="button"
                        onClick={() => onPromoteToGolden(item)}
                        className="flex-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300/80 dark:border-amber-700/60 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 shadow-2xs"
                        title={lang === 'ar' ? 'تعيين كهدف ذهبي لليوم (The One Thing)' : 'Set as Golden Goal for today'}
                      >
                        <Star className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-500" />
                        <span>{lang === 'ar' ? 'هدف ذهبي ⭐' : 'Golden Goal ⭐'}</span>
                      </button>

                      {/* Promote to Eisenhower Quad Button with Dropdown (Fixed smart direction so Q1 is never clipped!) */}
                      <div className="relative flex-1" ref={isQuadMenuOpen ? menuRef : null}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleQuadMenu(item.id, e)}
                          className="w-full py-1 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 shadow-2xs"
                          title={lang === 'ar' ? 'توجيه لمصفوفة الأولويات' : 'Send to Priority Matrix'}
                        >
                          <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>{lang === 'ar' ? 'مصفوفة الأولويات 🎯' : 'Priorities 🎯'}</span>
                          <ChevronDown className={`w-2.5 h-2.5 opacity-70 transition-transform ${isQuadMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Quad Selection Menu with Guaranteed Visibility for Q1 */}
                        {isQuadMenuOpen && (
                          <div
                            className={`absolute z-50 bg-[var(--card)] border border-[var(--line)] rounded-xl p-1.5 shadow-2xl w-56 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150 ${
                              menuDir === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                            } ${lang === 'ar' ? 'left-0' : 'right-0'}`}
                          >
                            <div className="px-2 py-1 text-[10px] font-bold text-[var(--ink-soft)] border-b border-[var(--line)] flex items-center justify-between">
                              <span>{lang === 'ar' ? 'اختر مربع الأولويات:' : 'Choose Eisenhower Quad:'}</span>
                              <span className="text-[9px] opacity-60 font-mono">Eisenhower</span>
                            </div>

                            {/* Guaranteed listing of all 4 quads starting with Q1 */}
                            {QUADS_CONFIG.map((q) => (
                              <button
                                key={q.key}
                                type="button"
                                onClick={() => {
                                  onPromoteToQuad(item, q.key as 'q1' | 'q2' | 'q3' | 'q4');
                                  setActiveQuadMenuId(null);
                                }}
                                className="w-full p-1.5 rounded-lg text-start flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer group/q"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                                  style={{ backgroundColor: q.color }}
                                />
                                <span className="font-mono font-black text-[11px] text-[var(--ink)] group-hover/q:text-indigo-600">
                                  {q.key.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-[var(--ink-soft)] truncate flex-1">
                                  {q.title[lang].split('(')[0].replace(/^[^\w\s\u0600-\u06FF]+/, '').trim()}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--bg)]/80 text-[11px] text-[var(--ink-soft)] flex items-center justify-between shrink-0">
          <span>
            {lang === 'ar'
              ? '✨ يتم حفظ الأفكار وتزامنها سحابياً تلقائياً'
              : '✨ Ideas saved & synced to cloud in real-time'}
          </span>
          <span className="font-mono text-[10px]">{todos.length} items</span>
        </div>
      </div>

      {/* Modal: Interactive Tag Selector on Enter (5 Dimensions + Without Tag) */}
      {isTagPickerOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setIsTagPickerOpen(false);
            setPendingTodoText('');
          }}
        >
          <div
            ref={pickerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-2xl max-w-sm w-full flex flex-col gap-3.5 animate-in zoom-in-95 duration-150"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <h3 className="font-bold text-sm text-[var(--ink)]">
                  {lang === 'ar' ? 'اختر تصنيف المهمة' : 'Select Task Tag'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTagPickerOpen(false);
                  setPendingTodoText('');
                }}
                className="text-[var(--ink-soft)] hover:text-[var(--ink)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Preview */}
            <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)] font-medium max-h-18 overflow-y-auto">
              <span className="opacity-60 text-[10px] block mb-0.5">{lang === 'ar' ? 'نص المهمة:' : 'Task:'}</span>
              <p className="line-clamp-2 italic font-semibold">"{pendingTodoText}"</p>
            </div>

            {/* 5 Core Life Tags Buttons */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-[var(--ink-soft)] px-1">
                {lang === 'ar' ? 'جوانب الحياة (أرقام 1-5 للاختيار السريع):' : 'Life Dimensions (Keys 1-5):'}
              </span>

              {AVAILABLE_TAGS.map((tag, idx) => {
                const cfg = TAGS_CONFIG[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleConfirmCreate(tag)}
                    className="w-full p-2 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] hover:border-indigo-400 flex items-center justify-between transition-all cursor-pointer group shadow-2xs hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-black/5"
                        style={{ backgroundColor: cfg?.color }}
                      />
                      <span className="font-bold text-xs text-[var(--ink)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {cfg?.fullTitle[lang].split('(')[0].trim()}
                      </span>
                      <span className="text-[10px] text-[var(--ink-soft)] truncate font-mono">
                        [{tag}]
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--bg)] text-[var(--ink-soft)] border border-[var(--line)]">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}

              {/* Without Tag Option (Button 0 / Enter) */}
              <button
                type="button"
                onClick={() => handleConfirmCreate('')}
                className="w-full p-2 mt-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg)] hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:border-slate-400 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full border border-dashed border-slate-400 shrink-0" />
                  <span className="font-semibold text-xs text-[var(--ink)]">
                    {lang === 'ar' ? 'بدون تاق / تصنيف عام' : 'No Tag (General Task)'}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[var(--card)] text-[var(--ink-soft)] border border-[var(--line)]">
                  0 / Enter
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
