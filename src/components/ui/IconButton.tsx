import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-white/5 border border-app text-secondary hover:bg-white/10 hover:text-primary',
  ghost: 'text-muted hover:bg-white/5 hover:text-primary',
  danger: 'text-red-300 hover:bg-red-500/15',
};

const SIZE: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
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
        'inline-flex items-center justify-center rounded-full transition-colors',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
});