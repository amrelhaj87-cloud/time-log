import { useEffect, useRef } from 'react';

export type ShortcutAction = 'close' | 'focus' | 'todo' | 'search';

/**
 * Which app shortcut a key press is (Arabic keyboard layout included):
 *  - Esc                      → close the top-most window
 *  - Alt+P  (Alt+ح)           → focus / Pomodoro view
 *  - Alt+T  (Alt+ف)           → Brain Dump inbox
 *  - Alt+F  (Alt+ب), Ctrl/⌘+K → global search
 */
export function shortcutFor(e: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>): ShortcutAction | null {
  if (e.key === 'Escape') return 'close';
  if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) return 'focus';
  if (e.altKey && (e.key === 't' || e.key === 'T' || e.key === 'ف')) return 'todo';
  if ((e.altKey && (e.key === 'f' || e.key === 'F' || e.key === 'ب')) || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')))
    return 'search';
  return null;
}

interface Handlers {
  /** Closes the top-most open window; returns false when nothing was open. */
  closeTopModal: () => boolean;
  toggleFocusMode: () => void;
  /** null while the inbox is hidden in Settings (Alt+T then does nothing). */
  toggleTodoDrawer: (() => void) | null;
  toggleSearch: () => void;
}

/**
 * Global keyboard shortcuts (extracted from App.tsx). The listener is bound
 * once; it always calls the latest handlers through a ref, so it never acts
 * on stale state (the old dependency list missed the Morning Nudge).
 */
export function useKeyboardShortcuts(handlers: Handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = shortcutFor(e);
      if (!action) return;
      const h = latest.current;
      if (action === 'close') {
        if (h.closeTopModal()) e.preventDefault();
        return;
      }
      if (action === 'todo' && !h.toggleTodoDrawer) return;
      e.preventDefault();
      if (action === 'focus') h.toggleFocusMode();
      else if (action === 'todo') h.toggleTodoDrawer?.();
      else h.toggleSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
