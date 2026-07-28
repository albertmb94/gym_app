import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  iconLeft?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = true,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex p-1 rounded-[12px] bg-surface-2 border border-app',
        fullWidth && 'w-full',
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={opt.disabled || undefined}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            className={cn(
              'relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] font-medium',
              'transition-colors duration-200 ease-apple',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSm ? 'h-7 px-2.5 text-[12px]' : 'h-9 px-3 text-[13px]',
              selected
                ? 'text-primary bg-surface-3 shadow-[0_1px_0_var(--glass-1-highlight),0_1px_3px_rgba(0,0,0,0.10)]'
                : 'text-secondary hover:text-primary',
            )}
          >
            {opt.iconLeft && <span aria-hidden="true" className="inline-flex">{opt.iconLeft}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
