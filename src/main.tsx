import { ErrorBoundary } from './components/ErrorBoundary';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPwaEvents, registerServiceWorker } from './services/pwaService';
import { initErrorMonitoring } from './services/errorMonitoring';

// Attach global error listeners first so early failures are captured
initErrorMonitoring();

// Initialize PWA install prompt listeners and register Service Worker for offline capability
initPwaEvents();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);

