// PWA & Service Worker Manager for Time Log
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

type InstallPromptListener = (canInstall: boolean) => void;
type OnlineStatusListener = (isOnline: boolean) => void;
type UpdateListener = (available: boolean) => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let pendingWorker: ServiceWorker | null = null;
const installListeners: Set<InstallPromptListener> = new Set();
const onlineListeners: Set<OnlineStatusListener> = new Set();
const updateListeners: Set<UpdateListener> = new Set();

// Check if running as installed standalone PWA
export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Check if browser is currently online
export const isAppOnline = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.navigator.onLine;
};

// Register Service Worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.info('[PWA] Service Workers not supported in this environment');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.info('[PWA] Service Worker registered successfully with scope:', registration.scope);

    // A new worker may already be waiting (e.g. after a reload while an update was pending)
    if (registration.waiting) {
      pendingWorker = registration.waiting;
      updateListeners.forEach((listener) => listener(true));
    }

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            pendingWorker = newWorker;
            updateListeners.forEach((listener) => listener(true));
            console.info('[PWA] New version available, ready for offline usage');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
    return null;
  }
};

// Initialize global event listeners
export const initPwaEvents = () => {
  if (typeof window === 'undefined') return;

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installListeners.forEach((listener) => listener(true));
    console.info('[PWA] captured beforeinstallprompt event - Install is ready');
  });

  // Listen for app installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
    console.info('[PWA] App was successfully installed!');
  });

  // Online / Offline handlers
  window.addEventListener('online', () => {
    onlineListeners.forEach((listener) => listener(true));
  });

  window.addEventListener('offline', () => {
    onlineListeners.forEach((listener) => listener(false));
  });
};

// Prompt user to install the application
export const triggerAppInstall = async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
  if (!deferredPrompt) {
    return 'unsupported';
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return choice.outcome;
  } catch (error) {
    console.error('[PWA] Error during install prompt:', error);
    return 'unsupported';
  }
};

// Subscribe to install availability changes
export const subscribeInstallPrompt = (listener: InstallPromptListener): (() => void) => {
  installListeners.add(listener);
  // Immediately notify of current state
  listener(deferredPrompt !== null);
  return () => {
    installListeners.delete(listener);
  };
};

// Subscribe to online/offline changes
export const subscribeOnlineStatus = (listener: OnlineStatusListener): (() => void) => {
  onlineListeners.add(listener);
  listener(isAppOnline());
  return () => {
    onlineListeners.delete(listener);
  };
};

// Subscribe to Service Worker update availability (fired when a new build is waiting)
export const subscribeUpdateAvailable = (listener: UpdateListener): (() => void) => {
  updateListeners.add(listener);
  // Immediately notify of current state
  listener(pendingWorker !== null);
  return () => {
    updateListeners.delete(listener);
  };
};

// Apply a waiting Service Worker update and reload to serve the new version
export const applyServiceWorkerUpdate = (): void => {
  try {
    pendingWorker?.postMessage({ type: 'SKIP_WAITING' });
  } catch {
    /* ignore */
  }
  // Give the waiting worker a moment to activate before reloading
  window.setTimeout(() => window.location.reload(), 150);
};
