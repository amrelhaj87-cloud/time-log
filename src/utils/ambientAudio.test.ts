import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BREAK_SOUND_OPTIONS,
  FOCUS_SOUND_OPTIONS,
  loadSoundChoice,
  saveSoundChoice
} from './ambientAudio';

// Minimal window/localStorage stand-ins (vitest runs in node here).
beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k)
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('pomodoro sound lists', () => {
  it('keeps both lists short enough to show without scrolling', () => {
    expect(FOCUS_SOUND_OPTIONS.length).toBeLessThanOrEqual(5);
    expect(BREAK_SOUND_OPTIONS.length).toBeLessThanOrEqual(5);
  });

  it('never shares a sound between focus and break', () => {
    const focus = new Set(FOCUS_SOUND_OPTIONS.map((o) => o.id).filter((id) => id !== 'none'));
    for (const o of BREAK_SOUND_OPTIONS) expect(focus.has(o.id)).toBe(false);
  });
});

describe('loadSoundChoice / saveSoundChoice', () => {
  it('remembers focus and break choices separately', () => {
    saveSoundChoice('focus', 'rain');
    saveSoundChoice('break', 'waves');
    expect(loadSoundChoice('focus')).toBe('rain');
    expect(loadSoundChoice('break')).toBe('waves');
  });

  it('falls back to none for a removed sound or one from the other list', () => {
    localStorage.setItem('focus_ambient_type', 'cafe');
    localStorage.setItem('break_ambient_type', 'brownnoise');
    expect(loadSoundChoice('focus')).toBe('none');
    expect(loadSoundChoice('break')).toBe('none');
  });
});
