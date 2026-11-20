/**
 * preferences.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure snapshot/merge helpers for user preferences.
 *
 * WHY: React state setters are asynchronous, so a handler that does
 * `setSleepSettings(next); syncPreferences(user)` used to persist the value from
 * the *previous* render (a stale closure) and silently revert the change after a
 * reload. Every sync now receives an explicit patch describing what changed, and
 * the merge happens here — testable and impossible to get stale.
 */

import type { AgeDisplayOpt, SleepSettings, TagTargets, ThemeMode, WeekStartDay } from '../types';

export interface PreferencesSnapshot {
  sleepWindow: SleepSettings;
  birthDate: string;
  ageDisplayOpt: AgeDisplayOpt;
  weekStartDay: WeekStartDay;
  devToolsEnabled: boolean;
  showAgeBadge: boolean;
  showStreakBadge: boolean;
  showFocusModeButton: boolean;
  showGoldenGoal: boolean;
  showPriorityMatrix: boolean;
  showTodoInbox: boolean;
  /** Derived: showGoldenGoal || showPriorityMatrix (never patched directly). */
  showPrioritiesSection: boolean;
  morningNudgeEnabled: boolean;
  eveningWrapUpEnabled: boolean;
  tagTargets: TagTargets;
  calSyncEnabled: boolean;
  themeMode: ThemeMode;
  isDetailedView: boolean;
  autoCloudSync: boolean;
}

/** What a caller may change; the derived field is excluded on purpose. */
export type PreferencesPatch = Partial<Omit<PreferencesSnapshot, 'showPrioritiesSection'>>;

/** Applies a patch on top of the current snapshot and re-derives showPrioritiesSection. */
export function mergePreferences(current: PreferencesSnapshot, patch: PreferencesPatch = {}): PreferencesSnapshot {
  const merged: PreferencesSnapshot = { ...current, ...patch };
  merged.showPrioritiesSection = merged.showGoldenGoal || merged.showPriorityMatrix;
  return merged;
}

/** Every localStorage key/value the preferences own. Single source of truth. */
export function preferencesStorageEntries(snapshot: PreferencesSnapshot): Array<[string, string]> {
  return [
    ['sleepSettings', JSON.stringify(snapshot.sleepWindow)],
    ['userBirthDate', snapshot.birthDate],
    ['ageDisplayOpt', snapshot.ageDisplayOpt],
    ['weekStartDay', snapshot.weekStartDay],
    ['devToolsEnabled', String(snapshot.devToolsEnabled)],
    ['showAgeBadge', String(snapshot.showAgeBadge)],
    ['showStreakBadge', String(snapshot.showStreakBadge)],
    ['showFocusModeButton', String(snapshot.showFocusModeButton)],
    ['showGoldenGoal', String(snapshot.showGoldenGoal)],
    ['showPriorityMatrix', String(snapshot.showPriorityMatrix)],
    ['showTodoInbox', String(snapshot.showTodoInbox)],
    ['showPrioritiesSection', String(snapshot.showPrioritiesSection)],
    ['morningNudgeEnabled', String(snapshot.morningNudgeEnabled)],
    ['eveningWrapUpEnabled', String(snapshot.eveningWrapUpEnabled)],
    ['tagTargets', JSON.stringify(snapshot.tagTargets)],
    ['calSyncEnabled', String(snapshot.calSyncEnabled)],
    ['themeMode', snapshot.themeMode],
    ['isDetailedView', String(snapshot.isDetailedView)],
    ['autoCloudSync', String(snapshot.autoCloudSync)]
  ];
}

/** Body of the Firestore `settings/preferences` document (updatedAt added by the caller). */
export function preferencesFirestorePayload(snapshot: PreferencesSnapshot): Record<string, unknown> {
  return {
    sleepWindow: snapshot.sleepWindow,
    birthDate: snapshot.birthDate,
    ageDisplayOpt: snapshot.ageDisplayOpt,
    weekStartDay: snapshot.weekStartDay,
    devToolsEnabled: snapshot.devToolsEnabled,
    showAgeBadge: snapshot.showAgeBadge,
    showStreakBadge: snapshot.showStreakBadge,
    showFocusModeButton: snapshot.showFocusModeButton,
    showGoldenGoal: snapshot.showGoldenGoal,
    showPriorityMatrix: snapshot.showPriorityMatrix,
    showTodoInbox: snapshot.showTodoInbox,
    showPrioritiesSection: snapshot.showPrioritiesSection,
    morningNudgeEnabled: snapshot.morningNudgeEnabled,
    eveningWrapUpEnabled: snapshot.eveningWrapUpEnabled,
    tagTargets: snapshot.tagTargets,
    calSyncEnabled: snapshot.calSyncEnabled,
    themeMode: snapshot.themeMode,
    isDetailedView: snapshot.isDetailedView,
    autoCloudSync: snapshot.autoCloudSync
  };
}
