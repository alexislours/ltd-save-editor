/** Format a number as a zero-padded 8-digit `0x` hex string (unsigned 32-bit). */
export function hexU32(n: number): string {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0');
}

/** Parse a decimal or `0x`-prefixed hex string, returning `null` for blank or invalid input. */
export function parseMaybeHex(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = t.toLowerCase().startsWith('0x')
    ? Number.parseInt(t.slice(2), 16)
    : Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

/** Run `fn` and return its result, falling back to `fallback` if it throws. */
export function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
