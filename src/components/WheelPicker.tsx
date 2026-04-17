import { useState, useRef, useEffect, useCallback } from 'react';

interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  label?: string;
  formatValue?: (value: number) => string;
}

export default function WheelPicker({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
  label,
  formatValue,
}: WheelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  const visibleItems = 5;

  const values: number[] = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }

  const scrollToValue = useCallback((val: number) => {
    const container = containerRef.current;
    if (!container) return;
    const index = values.indexOf(val);
    if (index >= 0) {
      const scrollTop = index * itemHeight;
      container.scrollTop = scrollTop;
    }
  }, [values, itemHeight]);

  useEffect(() => {
    if (isOpen) {
      setTempValue(value);
      setTimeout(() => scrollToValue(value), 50);
    }
  }, [isOpen, value, scrollToValue]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    setTempValue(values[clampedIndex]);
  };

  const handleConfirm = () => {
    onChange(tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gray-700 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-gray-600 transition-colors"
      >
        <span className="text-white text-lg font-semibold">
          {displayValue}{suffix}
        </span>
        <span className="text-gray-400 text-sm">Toca para editar</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-md bg-gray-800 rounded-t-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white px-3 py-1"
              >
                Cancelar
              </button>
              {label && <span className="text-white font-medium">{label}</span>}
              <button
                onClick={handleConfirm}
                className="text-orange-500 hover:text-orange-400 font-semibold px-3 py-1"
              >
                Aceptar
              </button>
            </div>

            {/* Wheel */}
            <div className="relative h-[220px] overflow-hidden">
              {/* Selection indicator */}
              <div 
                className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-11 bg-gray-700/50 rounded-lg border border-gray-600 pointer-events-none z-10"
              />
              
              {/* Gradient overlays */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gray-800 to-transparent pointer-events-none z-20" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none z-20" />

              {/* Scrollable list */}
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto scroll-smooth snap-y snap-mandatory hide-scrollbar"
                style={{
                  paddingTop: `${(visibleItems - 1) / 2 * itemHeight}px`,
                  paddingBottom: `${(visibleItems - 1) / 2 * itemHeight}px`,
                }}
              >
                {values.map((v) => {
                  const isSelected = v === tempValue;
                  const displayVal = formatValue ? formatValue(v) : v.toString();
                  return (
                    <div
                      key={v}
                      className={`h-11 flex items-center justify-center snap-center transition-all ${
                        isSelected
                          ? 'text-white text-2xl font-bold'
                          : 'text-gray-500 text-lg'
                      }`}
                      onClick={() => {
                        setTempValue(v);
                        scrollToValue(v);
                      }}
                    >
                      {displayVal}{suffix}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Multi-column wheel picker for more complex values
interface MultiWheelPickerProps {
  columns: {
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    formatValue?: (value: number) => string;
  }[];
  onChange: (values: number[]) => void;
  label?: string;
  displayFormat?: (values: number[]) => string;
}

export function MultiWheelPicker({
  columns,
  onChange,
  label,
  displayFormat,
}: MultiWheelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValues, setTempValues] = useState(columns.map(c => c.value));
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemHeight = 44;
  const visibleItems = 5;

  useEffect(() => {
    if (isOpen) {
      setTempValues(columns.map(c => c.value));
      setTimeout(() => {
        containerRefs.current.forEach((container, colIdx) => {
          if (container) {
            const col = columns[colIdx];
            const values = [];
            for (let i = col.min; i <= col.max; i += (col.step || 1)) {
              values.push(i);
            }
            const index = values.indexOf(col.value);
            if (index >= 0) {
              container.scrollTop = index * itemHeight;
            }
          }
        });
      }, 50);
    }
  }, [isOpen, columns]);

  const handleScroll = (colIdx: number) => {
    const container = containerRefs.current[colIdx];
    const col = columns[colIdx];
    if (!container) return;
    
    const values: number[] = [];
    for (let i = col.min; i <= col.max; i += (col.step || 1)) {
      values.push(i);
    }
    
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    
    setTempValues(prev => {
      const next = [...prev];
      next[colIdx] = values[clampedIndex];
      return next;
    });
  };

  const handleConfirm = () => {
    onChange(tempValues);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const displayValue = displayFormat
    ? displayFormat(columns.map(c => c.value))
    : columns.map((c) => `${c.value}${c.suffix || ''}`).join(' ');

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gray-700 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-gray-600 transition-colors"
      >
        <span className="text-white text-lg font-semibold">{displayValue}</span>
        <span className="text-gray-400 text-sm">Toca para editar</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-md bg-gray-800 rounded-t-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white px-3 py-1"
              >
                Cancelar
              </button>
              {label && <span className="text-white font-medium">{label}</span>}
              <button
                onClick={handleConfirm}
                className="text-orange-500 hover:text-orange-400 font-semibold px-3 py-1"
              >
                Aceptar
              </button>
            </div>

            {/* Wheels */}
            <div className="relative h-[220px] overflow-hidden flex">
              {columns.map((col, colIdx) => {
                const values = [];
                for (let i = col.min; i <= col.max; i += (col.step || 1)) {
                  values.push(i);
                }

                return (
                  <div key={colIdx} className="flex-1 relative">
                    {/* Selection indicator */}
                    <div 
                      className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-11 bg-gray-700/50 rounded-lg border border-gray-600 pointer-events-none z-10"
                    />
                    
                    {/* Gradient overlays */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gray-800 to-transparent pointer-events-none z-20" />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none z-20" />

                    {/* Scrollable list */}
                    <div
                      ref={(el) => { containerRefs.current[colIdx] = el; }}
                      onScroll={() => handleScroll(colIdx)}
                      className="absolute inset-0 overflow-y-auto scroll-smooth snap-y snap-mandatory hide-scrollbar"
                      style={{
                        paddingTop: `${(visibleItems - 1) / 2 * itemHeight}px`,
                        paddingBottom: `${(visibleItems - 1) / 2 * itemHeight}px`,
                      }}
                    >
                      {values.map((v) => {
                        const isSelected = v === tempValues[colIdx];
                        const displayVal = col.formatValue ? col.formatValue(v) : v.toString();
                        return (
                          <div
                            key={v}
                            className={`h-11 flex items-center justify-center snap-center transition-all ${
                              isSelected
                                ? 'text-white text-xl font-bold'
                                : 'text-gray-500 text-base'
                            }`}
                          >
                            {displayVal}{col.suffix || ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
