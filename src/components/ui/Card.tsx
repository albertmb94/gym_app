import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type CardLevel = 'flat' | 'glass1' | 'glass2' | 'tinted';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  level?: CardLevel;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tintedAccent?: boolean;
}

const LEVEL: Record<CardLevel, string> = {
  flat: 'surface',
  glass1: 'glass-1',
  glass2: 'glass-2',
  tinted: 'glass-1',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { title, description, actions, level = 'glass1', padding = 'md', tintedAccent = false, className, children, ...rest },
  ref,
) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-3.5' : padding === 'lg' ? 'p-6' : 'p-4';
  return (
    <section
      ref={ref}
      className={cn(
        'relative overflow-hidden',
        LEVEL[level],
        tintedAccent && 'border-[color:var(--accent-soft-strong)]',
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <header className={cn('flex items-start justify-between gap-3 border-b border-app', pad)}>
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-primary tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-secondary">{description}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(pad, title && 'pt-3.5')}>{children}</div>
    </section>
  );
});
