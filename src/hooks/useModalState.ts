import { useState } from 'react';

export interface PomoBgState {
  isRunning: boolean;
  timeFormatted: string;
  mode: 'focus' | 'break';
}

/**
 * Open/close state for every modal and the background pomodoro indicator.
 * Extracted from App.tsx (step 1 of the App.tsx decomposition).
 */
export function useModalState() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dayDistModalOpen, setDayDistModalOpen] = useState(false);
  const [chartsModalOpen, setChartsModalOpen] = useState(false);
  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sleepOnboardModalOpen, setSleepOnboardModalOpen] = useState(false);
  const [ageModalOpen, setAgeModalOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [pomoBgState, setPomoBgState] = useState<PomoBgState>({
    isRunning: false,
    timeFormatted: '25:00',
    mode: 'focus'
  });

  return {
    authModalOpen,
    setAuthModalOpen,
    settingsModalOpen,
    setSettingsModalOpen,
    dayDistModalOpen,
    setDayDistModalOpen,
    chartsModalOpen,
    setChartsModalOpen,
    aiSummaryModalOpen,
    setAiSummaryModalOpen,
    exportModalOpen,
    setExportModalOpen,
    sleepOnboardModalOpen,
    setSleepOnboardModalOpen,
    ageModalOpen,
    setAgeModalOpen,
    pwaModalOpen,
    setPwaModalOpen,
    guideModalOpen,
    setGuideModalOpen,
    globalSearchOpen,
    setGlobalSearchOpen,
    pomoBgState,
    setPomoBgState
  };
}
