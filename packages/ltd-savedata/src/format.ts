export function hexU32(n: number): string {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0');
}

export function parseMaybeHex(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = t.toLowerCase().startsWith('0x')
    ? Number.parseInt(t.slice(2), 16)
    : Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

export function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
