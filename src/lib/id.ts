/**
 * Generate a unique identifier.
 * Uses `crypto.randomUUID()` when available (secure context) and falls back to
 * a timestamp + random suffix so tests and older environments still work.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
