import type { SaveKind } from '$lib/saveFile/types';

const timers = new Map<SaveKind, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 400;

let persistCurrent: ((kind: SaveKind) => void) | null = null;
let loadPromise: Promise<void> | null = null;

function loadPersist(): Promise<void> {
  if (!loadPromise) {
    loadPromise = import('$lib/saveFile/saveFile.svelte')
      .then((m) => {
        persistCurrent = m.persistCurrent;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

function flush(kind: SaveKind): void {
  timers.delete(kind);
  if (persistCurrent) {
    persistCurrent(kind);
    return;
  }
  void loadPersist().then(() => persistCurrent?.(kind));
}

export function schedulePersist(kind: SaveKind): void {
  void loadPersist();
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
