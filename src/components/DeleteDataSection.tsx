import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import {
  clearLocalAppData,
  currentReauthMethod,
  currentUserEmail,
  deleteAccountAndData,
  DeleteAccountError,
  type DeleteAccountErrorCode
} from '../services/accountDeletion';

interface DeleteDataSectionProps {
  lang: 'ar' | 'en';
  isUserLoggedIn: boolean;
  /** Called right before deleting, to drop any pending (debounced) cloud save. */
  onBeforeDelete?: () => void;
}

type Step = 'idle' | 'confirm' | 'working' | 'done';

/** Either word confirms, whatever the UI language. */
const CONFIRM_WORDS = ['حذف', 'delete'];

const ERRORS: Record<DeleteAccountErrorCode, { ar: string; en: string }> = {
  'not-signed-in': { ar: 'انتهت جلسة الدخول. سجّل الدخول من جديد ثم حاول مرة أخرى.', en: 'Your session ended. Sign in again, then retry.' },
  'wrong-password': { ar: 'كلمة المرور غير صحيحة.', en: 'Wrong password.' },
  'reauth-cancelled': { ar: 'لم يكتمل تأكيد الهوية، فلم يُحذف أي شيء.', en: 'Identity check was not completed, so nothing was deleted.' },
  'popup-blocked': { ar: 'المتصفح حجب نافذة جوجل. اسمح بالنوافذ المنبثقة ثم حاول مجدداً.', en: 'The browser blocked the Google popup. Allow popups and retry.' },
  network: { ar: 'تعذّر الاتصال بالإنترنت. لم يكتمل الحذف، حاول مجدداً.', en: 'Network error. Deletion did not finish; please retry.' },
  unknown: { ar: 'حدث خطأ غير متوقع. حاول مجدداً أو راسلنا من نموذج التواصل.', en: 'Something went wrong. Retry, or contact us via the form.' }
};

export const DeleteDataSection: React.FC<DeleteDataSectionProps> = ({ lang, isUserLoggedIn, onBeforeDelete }) => {
  const ar = lang === 'ar';
  const [step, setStep] = useState<Step>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const method = isUserLoggedIn ? currentReauthMethod() : 'none';
  const needsPassword = method === 'password';
  const confirmed = CONFIRM_WORDS.includes(confirmText.trim().toLowerCase());
  const canSubmit = confirmed && (!needsPassword || password.length > 0) && step === 'confirm';

  const reset = () => {
    setStep('idle');
    setConfirmText('');
    setPassword('');
    setError('');
  };

  const handleDelete = async () => {
    if (!canSubmit) return;
    setError('');
    setStep('working');
    onBeforeDelete?.();
    try {
      if (isUserLoggedIn) await deleteAccountAndData(needsPassword ? password : undefined);
      clearLocalAppData();
      setStep('done');
      // Reload into a clean guest session once the user has read the message.
      window.setTimeout(() => window.location.reload(), 2500);
    } catch (err) {
      const code = err instanceof DeleteAccountError ? err.code : 'unknown';
      console.warn('Account deletion failed:', err);
      setError(ERRORS[code][lang]);
      setStep('confirm');
    }
  };

  const title = isUserLoggedIn
    ? ar ? 'حذف حسابي وكل بياناتي' : 'Delete my account and all data'
    : ar ? 'حذف كل بياناتي من هذا الجهاز' : 'Delete all my data on this device';

  if (step === 'done') {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-3.5 flex items-center gap-2.5" role="status">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-xs font-bold text-[var(--ink)]">
          {isUserLoggedIn
            ? ar ? 'تم حذف حسابك وكل بياناتك. شكراً لأنك جرّبت سجل الوقت.' : 'Your account and all data were deleted. Thanks for trying Time Log.'
            : ar ? 'تم مسح كل بياناتك من هذا الجهاز.' : 'All your data was cleared from this device.'}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-300/70 dark:border-rose-500/30 bg-[var(--bg)] p-3.5 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-[var(--ink)]">{title}</h4>
            <span className="text-[11px] text-[var(--ink-soft)]">
              {isUserLoggedIn
                ? ar ? 'من السحابة ومن هذا الجهاز، نهائياً' : 'From the cloud and this device, permanently'
                : ar ? 'سجلّك ومهامك وإعداداتك على هذا المتصفح' : 'Your log, tasks and settings in this browser'}
            </span>
          </div>
        </div>
        {step === 'idle' && (
          <button
            type="button"
            onClick={() => setStep('confirm')}
            className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold text-xs cursor-pointer transition-all whitespace-nowrap"
          >
            {ar ? 'حذف…' : 'Delete…'}
          </button>
        )}
      </div>

      {step !== 'idle' && (
        <div className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-3">
          <div className="flex gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 p-2.5 text-[11px] leading-relaxed text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">{ar ? 'لا يمكن التراجع عن هذا.' : 'This cannot be undone.'}</strong>
              {isUserLoggedIn
                ? ar
                  ? `سيُحذف حسابك (${currentUserEmail()}) وكل أسابيعك ومهامك وإعداداتك من السحابة ومن هذا الجهاز. إن أردت الاحتفاظ بنسخة، نزّل نسخة احتياطية من «تصدير» أولاً.`
                  : `Your account (${currentUserEmail()}) and all your weeks, tasks and settings will be deleted from the cloud and this device. To keep a copy, download a backup from “Export” first.`
                : ar
                  ? 'سيُمسح سجلّك ومهامك وإعداداتك من هذا المتصفح. إن أردت الاحتفاظ بنسخة، نزّل نسخة احتياطية من «تصدير» أولاً.'
                  : 'Your log, tasks and settings will be erased from this browser. To keep a copy, download a backup from “Export” first.'}
            </div>
          </div>

          {needsPassword && (
            <label className="flex flex-col gap-1 text-[11px] text-[var(--ink-soft)]">
              {ar ? 'كلمة المرور (لتأكيد أنك صاحب الحساب)' : 'Password (to confirm it’s you)'}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={step === 'working'}
                className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] text-xs outline-none focus:border-rose-400"
              />
            </label>
          )}
          {method === 'google' && (
            <p className="text-[11px] text-[var(--ink-soft)]">
              {ar ? 'ستظهر نافذة جوجل لتأكيد أنك صاحب الحساب.' : 'A Google window will open to confirm it’s you.'}
            </p>
          )}

          <label className="flex flex-col gap-1 text-[11px] text-[var(--ink-soft)]">
            {ar ? 'للتأكيد اكتب كلمة: حذف' : 'To confirm, type: DELETE'}
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={step === 'working'}
              autoComplete="off"
              className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] text-xs outline-none focus:border-rose-400"
            />
          </label>

          {error && (
            <p role="alert" className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={step === 'working'}
              className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--card)] font-semibold text-xs cursor-pointer transition-all disabled:opacity-50"
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canSubmit}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {step === 'working' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {step === 'working'
                ? ar ? 'جارٍ الحذف…' : 'Deleting…'
                : ar ? 'احذف نهائياً' : 'Delete permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
