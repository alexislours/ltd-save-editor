import { persistEditedBytes, type SaveKind } from './saveFile.svelte';

type Computer = () => Uint8Array | null;

const computers = new Map<SaveKind, Computer>();
const timers = new Map<SaveKind, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 400;

export function setBytesComputer(kind: SaveKind, computer: Computer): void {
  computers.set(kind, computer);
}

function flush(kind: SaveKind): void {
  timers.delete(kind);
  const fn = computers.get(kind);
  if (!fn) return;
  let bytes: Uint8Array | null;
  try {
    bytes = fn();
  } catch {
    return;
  }
  if (bytes) persistEditedBytes(kind, bytes);
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
