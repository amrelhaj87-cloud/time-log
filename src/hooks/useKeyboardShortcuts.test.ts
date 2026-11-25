import { describe, expect, it } from 'vitest';
import { shortcutFor } from './useKeyboardShortcuts';

const k = (key: string, mods: Partial<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean }> = {}) =>
  shortcutFor({ key, altKey: false, ctrlKey: false, metaKey: false, ...mods });

describe('shortcutFor', () => {
  it('maps Esc, Alt+P/T/F and Ctrl/⌘+K', () => {
    expect(k('Escape')).toBe('close');
    expect(k('p', { altKey: true })).toBe('focus');
    expect(k('T', { altKey: true })).toBe('todo');
    expect(k('f', { altKey: true })).toBe('search');
    expect(k('k', { ctrlKey: true })).toBe('search');
    expect(k('K', { metaKey: true })).toBe('search');
  });

  it('works with the Arabic keyboard layout', () => {
    expect(k('ح', { altKey: true })).toBe('focus');
    expect(k('ف', { altKey: true })).toBe('todo');
    expect(k('ب', { altKey: true })).toBe('search');
  });

  it('ignores plain typing', () => {
    expect(k('p')).toBeNull();
    expect(k('k')).toBeNull();
    expect(k('ح')).toBeNull();
  });
});
