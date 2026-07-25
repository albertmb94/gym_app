export function todayLocalISO(): string {
  const d = new Date();
  return formatLocalDate(d);
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function localDateToUTCISO(s: string, hours = 12): string {
  const date = parseLocalDate(s);
  if (!date) return new Date().toISOString();
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

export function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS);
}

export function weekStart(d: Date): Date {
  const date = startOfDay(d);
  const dow = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dow);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isFutureDate(s: string): boolean {
  const d = parseLocalDate(s);
  if (!d) return false;
  return d.getTime() > startOfDay(new Date()).getTime() + 1000 * 60 * 60 * 24 - 1;
}

export function shortDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}