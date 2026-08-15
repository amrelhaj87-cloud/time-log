import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPwaEvents, registerServiceWorker } from './services/pwaService';

// Initialize PWA install prompt listeners and register Service Worker for offline capability
initPwaEvents();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

