import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { reportError } from '../services/errorMonitoring';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    reportError(error, { componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg,#0f172a)] text-[var(--ink,#f8fafc)] font-sans" dir="rtl">
          <div className="max-w-[440px] w-full p-6 bg-[var(--card,#1e293b)] rounded-2xl border border-rose-500/30 shadow-2xl text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h2 className="text-lg font-bold text-rose-400">عذراً، حدث خطأ غير متوقع</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              تم حماية الصفحة من الانهيار. بياناتك آمنة في التخزين، ويمكنك إعادة تحميل الصفحة لاستئناف العمل فوراً.
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-slate-700/50 text-[11px] font-mono text-slate-300 text-start overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>إعادة تحميل الصفحة</span>
                <span>🔄</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
