import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'center' | 'sheet' | 'fullscreen';
  dismissible?: boolean;
}

const VARIANT = {
  center: 'items-center justify-center p-4',
  sheet: 'items-end sm:items-center justify-center sm:p-4',
  fullscreen: 'items-stretch sm:items-center sm:justify-center sm:p-4',
} as const;

const SURFACE = {
  center: 'rounded-3xl max-w-md w-full',
  sheet: 'rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh]',
  fullscreen: 'rounded-none sm:rounded-3xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh]',
} as const;

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  dismissible = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;
  const role = variant === 'sheet' ? 'dialog' : 'dialog';

  return (
    <div className={cn('fixed inset-0 z-[150] flex', VARIANT[variant])} role="presentation">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-desc' : undefined}
        className={cn(
          'relative glass-strong shadow-2xl animate-slide-up overflow-hidden flex flex-col',
          SURFACE[variant],
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-app p-4">
          <h2 id="dialog-title" className="text-base font-semibold text-primary">
            {title}
          </h2>
          {dismissible && (
            <IconButton
              aria-label="Cerrar"
              label="Cerrar"
              icon={<X className="h-4 w-4" aria-hidden="true" />}
              onClick={onClose}
              variant="ghost"
              size="sm"
            />
          )}
        </header>
        {description && (
          <p id="dialog-desc" className="px-4 pt-3 text-sm text-secondary">
            {description}
          </p>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="border-t border-app p-4">{footer}</footer>}
      </div>
    </div>
  );
}