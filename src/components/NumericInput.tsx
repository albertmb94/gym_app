import { useState, useEffect, useRef } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: boolean;
  placeholder?: string;
  className?: string;
  fallbackOnEmpty?: number; // value to commit if user leaves field empty (default 0)
  selectOnFocus?: boolean;
  disabled?: boolean;
}

/**
 * Numeric input that fixes the "0 placeholder won't clear" bug.
 * - On focus the field is cleared (text-empty) so the user can type freely.
 * - While editing, the parent is NOT spammed with 0 on every keystroke.
 * - On blur, the value is parsed, clamped and committed.
 */
export default function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = false,
  placeholder = '0',
  className = '',
  fallbackOnEmpty = 0,
  selectOnFocus = true,
  disabled = false,
}: NumericInputProps) {
  // Local string state so the user can fully control the input (including empty)
  const [text, setText] = useState<string>(formatValue(value));
  const editingRef = useRef(false);

  useEffect(() => {
    // External value changed and user is not editing -> sync
    if (!editingRef.current) {
      setText(formatValue(value));
    }
  }, [value]);

  function formatValue(v: number): string {
    if (v === undefined || v === null || isNaN(v)) return '';
    return v.toString();
  }

  function clamp(n: number): number {
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }

  function commit(raw: string) {
    if (raw === '' || raw === '-' || raw === '.') {
      onChange(clamp(fallbackOnEmpty));
      setText(formatValue(clamp(fallbackOnEmpty)));
      return;
    }
    const parsed = decimals ? parseFloat(raw) : parseInt(raw, 10);
    if (isNaN(parsed)) {
      setText(formatValue(value));
      return;
    }
    const final = clamp(parsed);
    onChange(final);
    setText(formatValue(final));
  }

  return (
    <input
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      pattern={decimals ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => {
        editingRef.current = true;
        // Clear field entirely so user can type freely (this is the key fix)
        setText('');
        if (selectOnFocus) {
          // Slight delay to ensure focus is set first
          requestAnimationFrame(() => e.target.select?.());
        }
      }}
      onChange={(e) => {
        let v = e.target.value.replace(',', '.');
        // Strip invalid chars
        if (decimals) {
          v = v.replace(/[^0-9.\-]/g, '');
        } else {
          v = v.replace(/[^0-9\-]/g, '');
        }
        setText(v);
      }}
      onBlur={(e) => {
        editingRef.current = false;
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
      step={step}
      className={className}
    />
  );
}
