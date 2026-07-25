import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  glass?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { title, description, actions, glass = true, padding = 'md', className, children, ...rest },
  ref,
) {
  const pad = padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-6' : 'p-4';
  return (
    <section
      ref={ref}
      className={cn(
        glass ? 'glass' : 'surface',
        'rounded-2xl',
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <header className={cn('flex items-start justify-between gap-2 border-b border-app', pad)}>
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-primary">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-secondary">{description}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(pad, title && 'pt-4')}>{children}</div>
    </section>
  );
});