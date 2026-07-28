import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from './IconButton';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  /** Altura máxima como porcentaje del viewport (default 90vh). */
  maxHeight?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  maxHeight = '90vh',
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Enfocar el sheet
    setTimeout(() => {
      sheetRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center" role="presentation">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        aria-describedby={description ? 'sheet-desc' : undefined}
        className={cn(
          'relative w-full glass-2 rounded-t-[28px] flex flex-col safe-bottom',
          'shadow-[var(--shadow-dialog)]',
          'animate-sheet',
        )}
        style={{ maxHeight }}
      >
        {/* Drag handle decorativo */}
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-app-strong opacity-60" />
        </div>
        {(title || dismissible) && (
          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
            <h2 id="sheet-title" className="text-[17px] font-semibold text-primary tracking-tight truncate">
              {title}
            </h2>
            {dismissible && (
              <IconButton
                label="Cerrar"
                icon={<X className="h-4 w-4" aria-hidden="true" />}
                onClick={onClose}
                variant="ghost"
                size="sm"
              />
            )}
          </header>
        )}
        {description && (
          <p id="sheet-desc" className="px-5 pb-2 text-[13px] text-secondary">
            {description}
          </p>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <footer className="border-t border-app px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
