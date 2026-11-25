import type { AgeDisplayOpt, SleepSettings, TagTargets, ThemeMode, WeekStartDay } from '../types';

/** The state setters that cloud preferences are applied to. */
export interface CloudPrefSetters {
  setSleepSettings: (v: SleepSettings) => void;
  setUserBirthDate: (v: string) => void;
  setAgeDisplayOpt: (v: AgeDisplayOpt) => void;
  setThemeMode: (v: ThemeMode) => void;
  setThemePalette: (v: unknown) => void;
  setIsDetailedView: (v: boolean) => void;
  setDevToolsEnabled: (v: boolean) => void;
  setShowAgeBadge: (v: boolean) => void;
  setShowStreakBadge: (v: boolean) => void;
  setShowFocusModeButton: (v: boolean) => void;
  setShowGoldenGoal: (v: boolean) => void;
  setShowPriorityMatrix: (v: boolean) => void;
  setShowTodoInbox: (v: boolean) => void;
  setMorningNudgeEnabled: (v: boolean) => void;
  setEveningWrapUpEnabled: (v: boolean) => void;
  setTagTargets: (v: TagTargets) => void;
  setCalSyncEnabled: (v: boolean) => void;
  setAutoCloudSync: (v: boolean) => void;
  setWeekStartDay: (v: WeekStartDay) => void;
}

/**
 * Applies the signed-in user's Firestore `settings/preferences` document to app
 * state (and mirrors the locally-cached ones to localStorage), on sign-in.
 * Only fields present in the document are applied. Returns the stored week
 * start day, if any, so the caller can re-align the visible week.
 */
export function applyCloudPreferences(data: Record<string, unknown>, set: CloudPrefSetters): WeekStartDay | null {
  const has = (k: string) => data[k] !== undefined;
  const bool = (k: string) => data[k] as boolean;
  /** Sets state and mirrors a boolean to localStorage under the same key. */
  const mirrorBool = (k: string, setter: (v: boolean) => void, value = bool(k)) => {
    setter(value);
    localStorage.setItem(k, String(value));
  };

  if (data.sleepWindow) set.setSleepSettings(data.sleepWindow as SleepSettings);
  if (data.birthDate) set.setUserBirthDate(data.birthDate as string);
  if (data.ageDisplayOpt) set.setAgeDisplayOpt(data.ageDisplayOpt as AgeDisplayOpt);
  if (data.themeMode) {
    set.setThemeMode(data.themeMode as ThemeMode);
    localStorage.setItem('themeMode', data.themeMode as string);
  }
  if (data.themePalette) set.setThemePalette(data.themePalette);
  if (has('isDetailedView')) mirrorBool('isDetailedView', set.setIsDetailedView);
  if (has('devToolsEnabled')) set.setDevToolsEnabled(bool('devToolsEnabled'));
  if (has('showAgeBadge')) set.setShowAgeBadge(bool('showAgeBadge'));
  if (has('showStreakBadge')) set.setShowStreakBadge(bool('showStreakBadge'));
  if (has('showFocusModeButton')) set.setShowFocusModeButton(bool('showFocusModeButton'));

  // Older documents only have the combined `showPrioritiesSection` flag.
  if (has('showGoldenGoal')) mirrorBool('showGoldenGoal', set.setShowGoldenGoal);
  else if (has('showPrioritiesSection'))
    mirrorBool('showGoldenGoal', set.setShowGoldenGoal, bool('showPrioritiesSection'));
  if (has('showPriorityMatrix')) mirrorBool('showPriorityMatrix', set.setShowPriorityMatrix);
  else if (has('showPrioritiesSection'))
    mirrorBool('showPriorityMatrix', set.setShowPriorityMatrix, bool('showPrioritiesSection'));

  if (has('showTodoInbox')) mirrorBool('showTodoInbox', set.setShowTodoInbox);
  if (has('morningNudgeEnabled')) mirrorBool('morningNudgeEnabled', set.setMorningNudgeEnabled);
  if (has('eveningWrapUpEnabled')) mirrorBool('eveningWrapUpEnabled', set.setEveningWrapUpEnabled);
  if (data.tagTargets) {
    set.setTagTargets(data.tagTargets as TagTargets);
    localStorage.setItem('tagTargets', JSON.stringify(data.tagTargets));
  }
  if (has('calSyncEnabled')) set.setCalSyncEnabled(bool('calSyncEnabled'));
  if (has('autoCloudSync')) mirrorBool('autoCloudSync', set.setAutoCloudSync);

  if (data.weekStartDay) {
    const day = data.weekStartDay as WeekStartDay;
    set.setWeekStartDay(day);
    localStorage.setItem('weekStartDay', day);
    return day;
  }
  return null;
}
