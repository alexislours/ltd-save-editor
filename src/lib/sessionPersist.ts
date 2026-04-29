import { persistCurrent, type SaveKind } from './saveFile.svelte';

const timers = new Map<SaveKind, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 400;

function flush(kind: SaveKind): void {
  timers.delete(kind);
  persistCurrent(kind);
}

export function schedulePersist(kind: SaveKind): void {
  const existing = timers.get(kind);
  if (existing) clearTimeout(existing);
  timers.set(
    kind,
    setTimeout(() => flush(kind), DEBOUNCE_MS),
  );
}

export function flushAllPending(): void {
  for (const kind of Array.from(timers.keys())) {
    const t = timers.get(kind);
    if (t) clearTimeout(t);
    flush(kind);
  }
}
