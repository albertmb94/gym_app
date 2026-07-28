import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'tint';
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
  primary:
    'bg-accent text-on-accent hover:bg-[color:var(--accent-hover)] active:bg-[color:var(--accent-pressed)] active:scale-[0.98]',
  tint:
    'glass-tint font-semibold active:scale-[0.98]',
  secondary:
    'bg-surface-2 text-primary border border-app hover:bg-surface-3 active:bg-surface-3',
  ghost:
    'text-secondary hover:bg-surface-2 hover:text-primary',
  danger:
    'bg-[color:var(--danger)] text-white hover:opacity-90 active:scale-[0.98]',
  success:
    'bg-[color:var(--success)] text-white hover:opacity-90 active:scale-[0.98]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
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
        'inline-flex items-center justify-center rounded-[14px] font-semibold transition-all duration-200 ease-apple',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft && <span aria-hidden="true" className="inline-flex">{iconLeft}</span>
      )}
      <span>{children}</span>
      {iconRight && <span aria-hidden="true" className="inline-flex">{iconRight}</span>}
    </button>
  );
});
