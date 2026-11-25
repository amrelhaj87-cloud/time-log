import { useCallback, useEffect, useState } from 'react';
import { db, doc, setDoc } from '../services/firebase';
import type { ThemeMode, ThemePalette } from '../types';
import { DEFAULT_THEME_PALETTE, THEME_PALETTES, isThemePalette } from '../constants/themes';

/**
 * App theme mode (light / dark / system), the effective dark state, the system
 * preference listener and the <html class="dark"> effect.
 * Extracted from App.tsx (step 4 of the decomposition).
 * Persists to localStorage and, when logged in, to Firestore.
 */
export function useTheme(currentUser: { uid: string } | null) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved as ThemeMode;
    // Legacy darkMode boolean
    const legacy = localStorage.getItem('darkMode');
    if (legacy === 'true') return 'dark';
    if (legacy === 'false') return 'light';
    return 'light';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Track system theme changes dynamically in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDarkEffective = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

  const handleCycleThemeMode = useCallback(() => {
    setThemeMode((prev) => {
      let next: ThemeMode;
      if (prev === 'light') next = 'dark';
      else if (prev === 'dark') next = 'system';
      else next = 'light';
      localStorage.setItem('themeMode', next);
      localStorage.setItem('darkMode', String(next === 'dark' || (next === 'system' && systemIsDark)));
      if (db && currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        setDoc(docRef, { themeMode: next, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
      return next;
    });
  }, [systemIsDark, currentUser]);

  const handleChangeThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeMode(mode);
      localStorage.setItem('themeMode', mode);
      localStorage.setItem('darkMode', String(mode === 'dark' || (mode === 'system' && systemIsDark)));
      if (db && currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        setDoc(docRef, { themeMode: mode, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    },
    [systemIsDark, currentUser]
  );

  // Apply the effective theme to the <html> element
  useEffect(() => {
    if (isDarkEffective) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkEffective]);

  // Color theme (palette) — independent of light/dark mode.
  const [themePalette, setThemePaletteState] = useState<ThemePalette>(() => {
    const saved = localStorage.getItem('themePalette');
    return isThemePalette(saved) ? saved : DEFAULT_THEME_PALETTE;
  });

  /** Sets the palette from any source (Firestore, backup); ignores unknown values. */
  const setThemePalette = useCallback((palette: unknown) => {
    if (!isThemePalette(palette)) return;
    setThemePaletteState(palette);
    localStorage.setItem('themePalette', palette);
  }, []);

  const handleChangeThemePalette = useCallback(
    (palette: ThemePalette) => {
      setThemePalette(palette);
      if (db && currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        setDoc(docRef, { themePalette: palette, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    },
    [setThemePalette, currentUser]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (themePalette === DEFAULT_THEME_PALETTE) delete root.dataset.palette;
    else root.dataset.palette = themePalette;
    const meta = document.querySelector('meta[name="theme-color"]');
    const def = THEME_PALETTES.find((p) => p.id === themePalette);
    if (meta && def) meta.setAttribute('content', def.metaColor);
  }, [themePalette]);

  return {
    themeMode,
    setThemeMode,
    systemIsDark,
    isDarkEffective,
    handleCycleThemeMode,
    handleChangeThemeMode,
    themePalette,
    setThemePalette,
    handleChangeThemePalette
  };
}
