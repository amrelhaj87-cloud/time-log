import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCloudPreferences, type CloudPrefSetters } from './cloudPreferences';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v)
  });
});
afterEach(() => vi.unstubAllGlobals());

/** Setters that record every call as [name, value]. */
function recordingSetters() {
  const calls: [string, unknown][] = [];
  const setters = new Proxy({} as CloudPrefSetters, {
    get: (_t, name: string) => (v: unknown) => calls.push([name, v])
  });
  return { calls, setters };
}

describe('applyCloudPreferences', () => {
  it('applies only the fields present and returns the week start day', () => {
    const { calls, setters } = recordingSetters();
    const day = applyCloudPreferences({ themeMode: 'dark', showTodoInbox: false, weekStartDay: 'monday' }, setters);
    expect(day).toBe('monday');
    expect(calls).toEqual([
      ['setThemeMode', 'dark'],
      ['setShowTodoInbox', false],
      ['setWeekStartDay', 'monday']
    ]);
    expect(store.get('themeMode')).toBe('dark');
    expect(store.get('showTodoInbox')).toBe('false');
    expect(store.get('weekStartDay')).toBe('monday');
  });

  it('falls back to the legacy showPrioritiesSection flag for both sections', () => {
    const { calls, setters } = recordingSetters();
    expect(applyCloudPreferences({ showPrioritiesSection: false }, setters)).toBeNull();
    expect(calls).toEqual([
      ['setShowGoldenGoal', false],
      ['setShowPriorityMatrix', false]
    ]);
    expect(store.get('showGoldenGoal')).toBe('false');
  });

  it('prefers the specific flags over the legacy one', () => {
    const { calls, setters } = recordingSetters();
    applyCloudPreferences({ showGoldenGoal: true, showPriorityMatrix: false, showPrioritiesSection: false }, setters);
    expect(calls).toEqual([
      ['setShowGoldenGoal', true],
      ['setShowPriorityMatrix', false]
    ]);
  });

  it('applies an empty document as a no-op', () => {
    const { calls, setters } = recordingSetters();
    expect(applyCloudPreferences({}, setters)).toBeNull();
    expect(calls).toEqual([]);
  });
});
