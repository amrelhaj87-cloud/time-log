import { ErrorBoundary } from './components/ErrorBoundary';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPwaEvents, registerServiceWorker } from './services/pwaService';
import { initErrorMonitoring } from './services/errorMonitoring';
import { loadFirebase } from './services/firebase';
import { initAutoUpdate } from './services/updateChecker';

// Attach global error listeners first so early failures are captured
initErrorMonitoring();

// Initialize PWA install prompt listeners and register Service Worker for offline capability
initPwaEvents();
registerServiceWorker();

// Detect new deployments and reload stale clients (purges a stale PWA cache first).
initAutoUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);

// Kick off the lazy Firebase load after the first render so the heavy SDK never
// blocks the initial paint, while cloud features become ready shortly after.
loadFirebase().catch(() => {});

