import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}