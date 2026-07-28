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
    <div
      className={cn(
        'glass-1 flex flex-col items-center justify-center rounded-[20px] px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"
        >
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-primary tracking-tight">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
