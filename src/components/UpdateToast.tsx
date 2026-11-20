import React, { useEffect, useState } from 'react';
import { applyServiceWorkerUpdate, subscribeUpdateAvailable } from '../services/pwaService';

/**
 * Small bottom toast shown when a new Service Worker build is waiting.
 * Clicking "تحديث الآن" activates the waiting worker and reloads the app.
 */
export const UpdateToast: React.FC = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => subscribeUpdateAvailable(setAvailable), []);

  if (!available) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-[60] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2">
        <span className="text-base">🚀</span>
        <span className="font-bold">تحديث جديد متاح</span>
        <button
          type="button"
          onClick={applyServiceWorkerUpdate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
        >
          تحديث الآن
        </button>
        <button
          type="button"
          onClick={() => setAvailable(false)}
          className="text-slate-400 hover:text-white px-1 cursor-pointer"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
