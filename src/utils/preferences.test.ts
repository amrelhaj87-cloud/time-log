import { describe, expect, it } from 'vitest';
import {
  mergePreferences,
  preferencesFirestorePayload,
  preferencesStorageEntries,
  type PreferencesSnapshot
} from './preferences';

const base: PreferencesSnapshot = {
  sleepWindow: { enabled: true, start: 23, end: 7, onboarded: true },
  birthDate: '1990-01-01',
  ageDisplayOpt: 'years',
  weekStartDay: 'saturday',
  devToolsEnabled: true,
  showAgeBadge: false,
  showStreakBadge: true,
  showFocusModeButton: false,
  showGoldenGoal: true,
  showPriorityMatrix: true,
  showTodoInbox: true,
  showPrioritiesSection: true,
  morningNudgeEnabled: false,
  eveningWrapUpEnabled: false,
  tagTargets: { E: 6, V: 2, R: 3, S: 2, SC: 2 },
  calSyncEnabled: true,
  themeMode: 'light',
  isDetailedView: false,
  autoCloudSync: false
};

describe('mergePreferences', () => {
  it('keeps untouched fields and applies the patch', () => {
    const next = mergePreferences(base, { showStreakBadge: false, themeMode: 'dark' });
    expect(next.showStreakBadge).toBe(false);
    expect(next.themeMode).toBe('dark');
    expect(next.sleepWindow).toEqual(base.sleepWindow);
    expect(next.tagTargets).toEqual(base.tagTargets);
  });

  it('applies a sleep window change immediately (the reported bug)', () => {
    const disabled = mergePreferences(base, {
      sleepWindow: { enabled: false, start: 0, end: 7, onboarded: true }
    });
    expect(disabled.sleepWindow).toEqual({ enabled: false, start: 0, end: 7, onboarded: true });
    expect(disabled.sleepWindow).not.toBe(base.sleepWindow);
  });

  it('re-derives showPrioritiesSection from the merged flags', () => {
    expect(mergePreferences(base, { showGoldenGoal: false, showPriorityMatrix: false }).showPrioritiesSection).toBe(false);
    expect(mergePreferences(base, { showGoldenGoal: false, showPriorityMatrix: true }).showPrioritiesSection).toBe(true);
    expect(mergePreferences(base, { showTodoInbox: false }).showPrioritiesSection).toBe(true);
  });

  it('does not mutate the input snapshot', () => {
    const copy = JSON.parse(JSON.stringify(base));
    mergePreferences(base, { showAgeBadge: true });
    expect(base).toEqual(copy);
  });
});

describe('preferencesStorageEntries', () => {
  it('persists every preference with its storage key', () => {
    const map = new Map(preferencesStorageEntries(base));
    expect(map.get('sleepSettings')).toBe(JSON.stringify(base.sleepWindow));
    expect(map.get('showStreakBadge')).toBe('true');
    expect(map.get('showAgeBadge')).toBe('false');
    expect(map.get('weekStartDay')).toBe('saturday');
    expect(map.get('userBirthDate')).toBe('1990-01-01');
    expect(map.get('tagTargets')).toBe(JSON.stringify(base.tagTargets));
    expect(map.size).toBe(19);
  });

  it('reflects a patched sleep window in the stored string', () => {
    const next = mergePreferences(base, {
      sleepWindow: { enabled: false, start: 0, end: 7, onboarded: true }
    });
    const map = new Map(preferencesStorageEntries(next));
    expect(JSON.parse(map.get('sleepSettings') as string)).toEqual({
      enabled: false,
      start: 0,
      end: 7,
      onboarded: true
    });
  });
});

describe('preferencesFirestorePayload', () => {
  it('carries the same values as the storage entries (no stale closure)', () => {
    const next = mergePreferences(base, {
      sleepWindow: { enabled: true, start: 1, end: 8, onboarded: true },
      morningNudgeEnabled: true
    });
    const payload = preferencesFirestorePayload(next);
    expect(payload.sleepWindow).toEqual({ enabled: true, start: 1, end: 8, onboarded: true });
    expect(payload.morningNudgeEnabled).toBe(true);
    expect(payload.showPrioritiesSection).toBe(true);
    expect(payload).not.toHaveProperty('updatedAt'); // added by the caller
  });
});
