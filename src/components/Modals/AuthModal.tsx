import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from '../../services/firebase';
import { STRINGS } from '../../constants/config';
import { X, LogIn, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: 'ar' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'email'>('google');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

  const t = STRINGS[lang];

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) {
      setErrorMsg(
        lang === 'ar'
          ? 'خدمة تسجيل الدخول غير مهيأة حالياً'
          : 'Auth service not initialized'
      );
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setUnverifiedUser(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;

      if (!user.email) {
        await signOut(auth);
        setErrorMsg(lang === 'ar' ? 'تعذر التحقق من بريدك الإلكتروني.' : 'Could not verify your email address.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const code = String(err?.code || err?.message || '');
      if (code.includes('unauthorized-domain')) {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        setErrorMsg(
          lang === 'ar'
            ? `نطاق التطبيق (${currentDomain}) غير مصرّح به في Firebase Console. يمكنك الدخول بـ (البريد وكلمة المرور) في التبويب المجاور، أو إضافة هذا النطاق في إعدادات Firebase Authentication -> Settings -> Authorized domains.`
            : `Current domain (${currentDomain}) is not authorized in Firebase Console. Please add it under Firebase Authentication -> Settings -> Authorized domains, or use Email/Password tab.`
        );
      } else if (code.includes('popup-closed-by-user')) {
        setErrorMsg(lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول قبل الاكتمال.' : 'Sign in popup closed before finishing.');
      } else {
        setErrorMsg(
          err?.message || (lang === 'ar' ? 'فشل تسجيل الدخول بـ Google' : 'Google sign in failed')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!email.trim() || !password.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please fill all fields');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setUnverifiedUser(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = cred.user;

        if (displayName.trim()) {
          try {
            await updateProfile(user, { displayName: displayName.trim() });
          } catch {}
        }

        try {
          await sendEmailVerification(user);
        } catch (verErr: any) {
          console.warn('sendEmailVerification error:', verErr);
        }

        await signOut(auth);

        setSuccessMsg(
          lang === 'ar'
            ? 'تم إرسال إيميل تأكيد إلى بريدك، رجاءً افتحه وأكد بريدك قبل ما تقدر تستخدم التطبيق ✉️'
            : 'A verification link has been sent to your email. Please verify it before signing in ✉️'
        );
        setMode('signin');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = cred.user;

        if (!user.emailVerified) {
          setUnverifiedUser(user);
          await signOut(auth);
          setErrorMsg(
            lang === 'ar'
              ? 'لازم تأكد بريدك الإلكتروني أولاً قبل استخدام التطبيق.'
              : 'You must verify your email address first before accessing the app.'
          );
          return;
        }

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      const code = String(err?.code || err?.message || '');
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setErrorMsg(lang === 'ar' ? 'البريد أو كلمة المرور غير صحيحة.' : 'Invalid email or password.');
      } else if (code.includes('email-already-in-use')) {
        setErrorMsg(lang === 'ar' ? 'هذا البريد مسجل بالفعل! يرجى تسجيل الدخول.' : 'Email is already registered. Please sign in.');
      } else if (code.includes('weak-password')) {
        setErrorMsg(lang === 'ar' ? 'كلمة المرور ضعيفة (يجب ألا تقل عن 6 أحرف).' : 'Password is too weak (at least 6 characters).');
      } else {
        setErrorMsg(lang === 'ar' ? 'تعذر إتمام العملية، يرجى المحاولة لاحقاً.' : 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth || !email.trim() || !password.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال البريد وكلمة المرور أولاً لإعادة إرسال التأكيد' : 'Enter email and password first');
      return;
    }
    setResendingVerification(true);
    try {
      let user = unverifiedUser;
      if (!user) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        user = cred.user;
      }
      if (user) {
        await sendEmailVerification(user);
        await signOut(auth);
        setSuccessMsg(
          lang === 'ar'
            ? 'تمت إعادة إرسال رابط التأكيد لبريدك الإلكتروني بنجاح ✉️'
            : 'Verification link resent to your email successfully ✉️'
        );
        setErrorMsg('');
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || (lang === 'ar' ? 'تعذر إعادة إرسال رابط التأكيد' : 'Failed to resend verification email')
      );
    } finally {
      setResendingVerification(false);
    }
  };

  const handleResetPassword = async () => {
    if (!auth || !email.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى كتابة بريدك الإلكتروني أولاً لإرسال رابط الاستعادة' : 'Enter your email first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(lang === 'ar' ? 'تم إرسال رابط استعادة كلمة المرور لبريدك الإلكتروني ✉️' : 'Password reset link sent to your email ✉️');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error sending reset email');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-md shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
          <div className="flex items-center gap-2 font-brand font-bold text-xl text-[var(--teal-dark)]">
            <LogIn className="w-5 h-5 text-[var(--teal)]" />
            <span>{t.authModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-[var(--rose-tint)] border border-[var(--rose)] text-[var(--rose)] text-xs font-bold p-2.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {unverifiedUser && (
              <button
                type="button"
                disabled={resendingVerification}
                onClick={handleResendVerification}
                className="self-start flex items-center gap-1.5 px-3 py-1 bg-[var(--rose)] text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${resendingVerification ? 'animate-spin' : ''}`} />
                <span>
                  {resendingVerification
                    ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Resending...')
                    : (lang === 'ar' ? 'إعادة إرسال إيميل التأكيد (Resend)' : 'Resend verification email')}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Tabs */}
        <div className="grid grid-cols-2 gap-1 border-b border-[var(--line)] pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setErrorMsg('');
              setSuccessMsg('');
              setUnverifiedUser(null);
            }}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'google'
                ? 'bg-[var(--teal-tint)] text-[var(--teal-dark)] border border-[var(--teal)]'
                : 'text-[var(--ink-soft)] hover:bg-[var(--bg)]'
            }`}
          >
            {t.tabGoogle}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('email');
              setErrorMsg('');
              setSuccessMsg('');
              setUnverifiedUser(null);
            }}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-[var(--teal-tint)] text-[var(--teal-dark)] border border-[var(--teal)]'
                : 'text-[var(--ink-soft)] hover:bg-[var(--bg)]'
            }`}
          >
            {t.tabEmail}
          </button>
        </div>

        {/* Tab 1: Google */}
        {activeTab === 'google' && (
          <div className="flex flex-col gap-3 py-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{loading ? '...' : t.btnGoogleSignIn}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Email & Password */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-2.5 py-1">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-[var(--teal-dark)] mb-0.5">
                  {t.nameLabel}
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 absolute start-2.5 text-[var(--ink-faint)]" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={lang === 'ar' ? 'أحمد علي' : 'John Doe'}
                    className="w-full ps-8 pe-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] outline-hidden focus:border-[var(--teal)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[var(--teal-dark)] mb-0.5">
                {t.emailLabel}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute start-2.5 text-[var(--ink-faint)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full ps-8 pe-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] outline-hidden focus:border-[var(--teal)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--teal-dark)] mb-0.5">
                {t.passwordLabel}
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute start-2.5 text-[var(--ink-faint)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-8 pe-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] outline-hidden focus:border-[var(--teal)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-xs mt-1 cursor-pointer"
            >
              {loading ? '...' : mode === 'signin' ? t.btnSignIn : t.btnSignUp}
            </button>

            <div className="flex items-center justify-between text-[11px] font-bold pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setUnverifiedUser(null);
                }}
                className="text-[var(--teal-dark)] hover:underline cursor-pointer"
              >
                {mode === 'signin' ? t.switchToSignUp : t.switchToSignIn}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[var(--ink-faint)] hover:text-[var(--ink)] hover:underline cursor-pointer"
                >
                  {t.forgotPassword}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};