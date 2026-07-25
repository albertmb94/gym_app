import { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  id?: string;
  kind?: ToastKind;
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
}

export interface Toast extends Required<Omit<ToastInput, 'action'>> {
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: Toast[];
  pushToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback((input: ToastInput): string => {
    const id = input.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = {
      id,
      kind: input.kind || 'info',
      title: input.title,
      description: input.description || '',
      duration: input.duration ?? 4500,
      action: input.action,
    };
    setToasts((prev) => [...prev.filter((t) => t.id !== id), toast]);
    if (toast.duration > 0) {
      const timer = setTimeout(() => dismissToast(id), toast.duration);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismissToast]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, pushToast, dismissToast }), [toasts, pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
  error: 'border-red-500/40 bg-red-500/15 text-red-100',
  warning: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
  info: 'border-sky-500/40 bg-sky-500/15 text-sky-100',
};

function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[200] flex flex-col items-center gap-2 px-4 pb-2 sm:right-4 sm:left-auto sm:items-end sm:bottom-24"
    >
      {ctx.toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl',
              'animate-[slide-up_0.25s_ease-out]',
              KIND_STYLES[t.kind],
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      ctx.dismissToast(t.id);
                    }}
                    className="mt-2 text-xs font-bold uppercase tracking-wide underline-offset-2 hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => ctx.dismissToast(t.id)}
                aria-label="Cerrar notificación"
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}