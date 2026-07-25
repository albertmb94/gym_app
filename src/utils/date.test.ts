import { describe, it, expect } from 'vitest';
import { formatLocalDate, parseLocalDate, localDateToUTCISO, daysBetween, weekStart } from './date';

describe('date utils', () => {
  it('formatLocalDate produces yyyy-mm-dd', () => {
    const d = new Date(2025, 0, 5);
    expect(formatLocalDate(d)).toBe('2025-01-05');
  });

  it('parseLocalDate round-trips', () => {
    const date = parseLocalDate('2025-01-05');
    expect(date?.getFullYear()).toBe(2025);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(5);
  });

  it('parseLocalDate rejects invalid values', () => {
    expect(parseLocalDate('not-a-date')).toBeNull();
    expect(parseLocalDate('2025-13-40')).toBeNull();
    expect(parseLocalDate('2025-02-30')).toBeNull();
  });

  it('localDateToUTCISO returns midday by default', () => {
    const iso = localDateToUTCISO('2025-06-15');
    expect(iso).toContain('2025-06-15');
  });

  it('daysBetween counts whole days', () => {
    const a = new Date(2025, 0, 10);
    const b = new Date(2025, 0, 5);
    expect(daysBetween(a, b)).toBe(5);
  });

  it('weekStart returns Monday', () => {
    const date = new Date(2025, 0, 8);
    const monday = weekStart(date);
    expect(monday.getDay()).toBe(1);
  });
});