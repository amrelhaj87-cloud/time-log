import React from 'react';
import { isChunkLoadError, recoverFromStaleChunk } from '../utils/chunkRecovery';

/**
 * Modals — lazy-loaded on demand so their code stays out of the initial bundle.
 * The gate renders a modal only when its `isOpen` prop is true, which means the
 * dynamic import (and its chunk download) only happens the first time it is opened.
 * FocusPomodoroView is NOT here: it stays eagerly imported in App because it must
 * remain mounted so the background timer keeps running while minimized.
 */
// Each modal has its own props; the gate forwards them untouched.
type AnyProps = Record<string, any>;

const makeLazyModal = (loader: () => Promise<Record<string, unknown>>, exportName: string) => {
  const LazyModal = React.lazy(async () => {
    try {
      const m = await loader();
      return { default: m[exportName] as React.ComponentType<AnyProps> };
    } catch (err) {
      // A chunk from an older deployment 404s after a release: reload onto the
      // fresh build instead of letting the error reach the error boundary.
      if (isChunkLoadError(err) && (await recoverFromStaleChunk())) {
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
  return function LazyModalGate(props: { isOpen?: boolean } & AnyProps) {
    if (!props.isOpen) return null;
    return (
      <React.Suspense fallback={null}>
        <LazyModal {...props} />
      </React.Suspense>
    );
  };
};

export const AuthModal = makeLazyModal(() => import('./Modals/AuthModal'), 'AuthModal');
export const DayDistModal = makeLazyModal(() => import('./Modals/DayDistModal'), 'DayDistModal');
export const ChartsModal = makeLazyModal(() => import('./Modals/ChartsModal'), 'ChartsModal');
export const AiSummaryModal = makeLazyModal(() => import('./Modals/AiSummaryModal'), 'AiSummaryModal');
export const ExportModal = makeLazyModal(() => import('./Modals/ExportModal'), 'ExportModal');
export const SleepOnboardModal = makeLazyModal(() => import('./Modals/SleepOnboardModal'), 'SleepOnboardModal');
export const AgeSettingsModal = makeLazyModal(() => import('./Modals/AgeSettingsModal'), 'AgeSettingsModal');
export const PwaModal = makeLazyModal(() => import('./Modals/PwaModal'), 'PwaModal');
export const SettingsModal = makeLazyModal(() => import('./Modals/SettingsModal'), 'SettingsModal');
export const GuideModal = makeLazyModal(() => import('./Modals/GuideModal'), 'GuideModal');
export const TodoInboxDrawer = makeLazyModal(() => import('./Modals/TodoInboxDrawer'), 'TodoInboxDrawer');
export const MorningNudgeModal = makeLazyModal(() => import('./Modals/MorningNudgeModal'), 'MorningNudgeModal');
export const EveningWrapUpModal = makeLazyModal(() => import('./Modals/EveningWrapUpModal'), 'EveningWrapUpModal');
export const GlobalSearchModal = makeLazyModal(() => import('./Modals/GlobalSearchModal'), 'GlobalSearchModal');
