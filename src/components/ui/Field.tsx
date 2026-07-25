import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { cn } from '../../utils/cn';

export interface FieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode | ((id: string, describedBy?: string) => ReactNode);
  className?: string;
}

export function Field({ label, description, error, required, children, className }: FieldProps) {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-secondary">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-400">
            *
          </span>
        )}
      </label>
      {typeof children === 'function' ? children(id, describedBy) : children}
      {description && (
        <p id={descId} className="text-xs text-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'block w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-sm text-primary placeholder:text-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
        invalid ? 'border-red-500' : 'border-app',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});