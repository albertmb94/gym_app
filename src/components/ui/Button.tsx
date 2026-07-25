import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-900/20 hover:from-orange-400 hover:to-rose-400 active:scale-[0.98]',
  secondary: 'bg-white/5 text-primary border border-app hover:bg-white/10',
  ghost: 'text-secondary hover:bg-white/5 hover:text-primary',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canvas)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {iconLeft && <span aria-hidden="true" className="inline-flex">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span aria-hidden="true" className="inline-flex">{iconRight}</span>}
    </button>
  );
});