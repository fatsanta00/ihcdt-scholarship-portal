'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, WifiOff } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number; // ms; 0 = persistent until manually dismissed
}

interface ToastProps extends ToastMessage {
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode; titleColor: string }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    titleColor: 'text-green-900',
    icon: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    titleColor: 'text-red-900',
    icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    titleColor: 'text-amber-900',
    icon: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    titleColor: 'text-blue-900',
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
  },
};

function Toast({ id, variant, title, description, duration = 7000, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const styles = VARIANT_STYLES[variant];

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 300);
  }, [id, onDismiss]);

  useEffect(() => {
    if (duration === 0) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, duration]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-start gap-3 w-full max-w-sm p-4 rounded-2xl border shadow-xl
        ${styles.bg} ${styles.border}
        transition-all duration-300
        ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {styles.icon}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm leading-snug ${styles.titleColor}`}>{title}</p>
        {description && (
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────

let _toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++_toastIdCounter}`;
    setToasts(prev => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  return { toasts, toast, dismiss, dismissAll };
}

// ─── Offline Banner ───────────────────────────────────────────────────────────

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline  = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    // Check immediately
    if (!navigator.onLine) setOffline(true);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-red-700 text-white text-sm font-bold py-2.5 px-4 shadow-lg animate-fade-in-up"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>No internet connection — please reconnect before submitting your application.</span>
    </div>
  );
}

// ─── Inline Field Error ───────────────────────────────────────────────────────

interface FieldErrorProps {
  message?: string;
  id?: string;
}

export function FieldError({ message, id }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-red-600 text-sm mt-1.5 font-medium animate-pop">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </p>
  );
}

// ─── Submission Error Banner ──────────────────────────────────────────────────

interface SubmissionErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function SubmissionErrorBanner({ message, onRetry, onDismiss }: SubmissionErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-6 p-4 sm:p-5 bg-red-50 border-2 border-red-200 rounded-2xl animate-pop"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-red-900 text-sm sm:text-base leading-snug">{message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-red-400 hover:text-red-700 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {onRetry && (
        <div className="mt-3 pl-9">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-red-700 underline hover:text-red-900 transition-colors cursor-pointer"
          >
            Try submitting again
          </button>
        </div>
      )}
    </div>
  );
}
