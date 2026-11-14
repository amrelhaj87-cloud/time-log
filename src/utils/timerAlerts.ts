// Timer completion alerts: system notification + vibration (used when the user is on another tab/app)

const STORAGE_KEY = 'pomoNotifyEnabled';

export const isNotifyEnabled = (): boolean => localStorage.getItem(STORAGE_KEY) !== 'false';

export const setNotifyEnabled = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
};

export const isNotificationSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

/** Must be called from a user gesture (e.g. clicking Start) for browsers to show the prompt. */
export const ensureNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
};

/** Shows a system notification. Prefers the service worker (required on Android), falls back to Notification API. */
export const showTimerNotification = async (title: string, body: string) => {
  try {
    navigator.vibrate?.([250, 120, 250, 120, 400]);
  } catch {}

  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    body,
    icon: '/icon.svg',
    tag: 'pomodoro-finished',
    requireInteraction: true
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch {}

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {}
};
