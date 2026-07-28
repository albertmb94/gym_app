import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  selected?: boolean;
  /** Color del acento cuando está seleccionado. Por defecto usa el accent global. */
  tint?: string;
  iconLeft?: ReactNode;
  size?: 'sm' | 'md';
}

const SIZE: Record<NonNullable<ChipProps['size']>, string> = {
  sm: 'h-7 px-2.5 text-[12px] gap-1',
  md: 'h-8 px-3 text-[13px] gap-1.5',
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { label, selected = false, tint, iconLeft, size = 'md', className, children, ...rest },
  ref,
) {
  const style = selected && tint
    ? { backgroundColor: `${tint}22`, color: tint, borderColor: `${tint}55` }
    : undefined;
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-medium',
        'transition-all duration-200 ease-apple',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'active:scale-95',
        selected
          ? 'bg-accent-soft text-accent border-[color:var(--accent-soft-strong)]'
          : 'bg-surface-2 text-secondary border-app hover:bg-surface-3 hover:text-primary',
        SIZE[size],
        className,
      )}
      style={style}
      {...rest}
    >
      {iconLeft && <span aria-hidden="true" className="inline-flex">{iconLeft}</span>}
      <span>{label ?? children}</span>
    </button>
  );
});
