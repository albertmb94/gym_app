import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: 'default' | 'ghost' | 'danger' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-surface-2 border border-app text-secondary hover:bg-surface-3 hover:text-primary',
  ghost: 'text-muted hover:bg-surface-2 hover:text-primary',
  danger: 'text-[color:var(--danger)] hover:bg-[color:var(--danger)]/15',
  filled: 'bg-accent text-on-accent hover:opacity-90',
};

const SIZE: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
  lg: 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'default', size = 'md', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-150 ease-apple',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'active:scale-95',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">{icon}</span>
    </button>
  );
});
