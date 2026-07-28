import { useState, useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberPickerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  label?: string;
  color?: string;
}

export default function NumberPicker({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
  label,
  color = 'purple',
}: NumberPickerProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const updateValue = (newValue: number) => {
    const clamped = clamp(newValue);
    // Round to step precision
    const rounded = Math.round(clamped / step) * step;
    const final = parseFloat(rounded.toFixed(2));
    onChange(final);
  };

  const handleIncrement = () => updateValue(value + step);
  const handleDecrement = () => updateValue(value - step);

  const startHold = (direction: 'inc' | 'dec') => {
    const action = direction === 'inc' ? handleIncrement : handleDecrement;
    action();
    holdTimerRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(action, 80);
    }, 400);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    updateValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      updateValue(parsed);
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Select all text for easy replacement
    setTimeout(() => {
      e.target.select();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const percentage = ((value - min) / (max - min)) * 100;

  const colorMap: Record<string, { bg: string; track: string; thumb: string }> = {
    purple: { bg: 'bg-purple-600', track: 'bg-purple-500', thumb: 'accent-purple-500' },
    blue: { bg: 'bg-blue-600', track: 'bg-blue-500', thumb: 'accent-blue-500' },
    red: { bg: 'bg-red-600', track: 'bg-red-500', thumb: 'accent-red-500' },
    green: { bg: 'bg-green-600', track: 'bg-green-500', thumb: 'accent-green-500' },
    orange: { bg: 'bg-orange-600', track: 'bg-orange-500', thumb: 'accent-orange-500' },
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <div className="bg-surface-2 rounded-[14px] p-3 select-none border border-app">
      {label && (
        <div className="text-[11px] text-muted mb-2 text-center">{label}</div>
      )}

      {/* Top row: -, value input, + */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onMouseDown={() => startHold('dec')}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={(e) => { e.preventDefault(); startHold('dec'); }}
          onTouchEnd={stopHold}
          disabled={value <= min}
          className={`h-11 w-11 rounded-full ${colors.bg} hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)] transition-transform`}
          aria-label="Disminuir"
        >
          <Minus size={20} />
        </button>

        <div className="flex-1 flex items-baseline justify-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-primary text-[28px] font-semibold text-center w-24 focus-visible:outline-none focus-visible:bg-surface-3 rounded-[10px] py-1 tabular-nums tracking-tight"
            autoComplete="off"
          />
          {suffix && (
            <span className="text-[15px] text-secondary font-medium">{suffix.trim()}</span>
          )}
        </div>

        <button
          onMouseDown={() => startHold('inc')}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={(e) => { e.preventDefault(); startHold('inc'); }}
          onTouchEnd={stopHold}
          disabled={value >= max}
          className={`h-11 w-11 rounded-full ${colors.bg} hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)] transition-transform`}
          aria-label="Aumentar"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Slider */}
      <div className="relative px-1">
        <div className="relative h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full ${colors.track} rounded-full transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className={`absolute inset-0 w-full h-2 opacity-0 cursor-pointer ${colors.thumb}`}
          style={{ touchAction: 'none' }}
        />
        {/* Custom thumb visualization */}
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 rounded-full bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.2)] border-2 border-canvas transition-all"
          style={{
            left: `calc(${percentage}% )`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}
