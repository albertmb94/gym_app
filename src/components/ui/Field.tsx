import { forwardRef, cloneElement, isValidElement, type InputHTMLAttributes, type ReactNode, useId, type ReactElement } from 'react';
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

  // Inject id + aria-describedby + aria-invalid into a single React element child.
  // This is what makes the <label htmlFor> actually associate with the input.
  let input: ReactNode;
  if (typeof children === 'function') {
    input = children(id, describedBy);
  } else if (isValidElement(children)) {
    const el = children as ReactElement<{
      id?: string;
      'aria-describedby'?: string;
      'aria-invalid'?: boolean;
      invalid?: boolean;
    }>;
    input = cloneElement(el, {
      id,
      'aria-describedby': describedBy,
      'aria-invalid': Boolean(error) || el.props['aria-invalid'] || el.props.invalid || undefined,
    });
  } else {
    input = children;
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-secondary tracking-tight">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[color:var(--danger)]">
            *
          </span>
        )}
      </label>
      {input}
      {description && (
        <p id={descId} className="text-[12px] text-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[12px] text-[color:var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, leadingIcon, trailingIcon, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leadingIcon && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        >
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'block w-full rounded-[12px] border bg-surface-2 px-3.5 py-3 text-[15px] text-primary',
          'placeholder:text-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:bg-surface-1',
          'transition-colors duration-150 ease-apple',
          invalid
            ? 'border-[color:var(--danger)]'
            : 'border-app focus-visible:border-accent',
          leadingIcon && 'pl-10',
          trailingIcon && 'pr-10',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {trailingIcon && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted">
          {trailingIcon}
        </span>
      )}
    </div>
  );
});
