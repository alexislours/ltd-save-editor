import type { Entry } from './types';

export type DirtyTracker = {
  register(entry: Entry): void;
  registerAll(entries: Iterable<Entry>): void;
  markDirty(entry: Entry): boolean;
  isDirty(): boolean;
  reset(): void;
};

type Snapshot = {
  inlineRaw: number | undefined;
  payload: Uint8Array | null | undefined;
};

function snapshotOf(e: Entry): Snapshot {
  return {
    inlineRaw: e.inlineRaw,
    payload: e.payload == null ? e.payload : new Uint8Array(e.payload),
  };
}

function bytesEqual(a: Uint8Array | null | undefined, b: Uint8Array | null | undefined): boolean {
  if (a == null && b == null) return a === b;
  if (a == null || b == null) return false;
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

function matchesSnapshot(e: Entry, s: Snapshot): boolean {
  if (e.inlineRaw !== s.inlineRaw) return false;
  return bytesEqual(e.payload, s.payload);
}

export type DirtyTrackerOptions = {
  lazy?: boolean;
};

export function createDirtyTracker(options: DirtyTrackerOptions = {}): DirtyTracker {
  const { lazy = false } = options;
  const originals = new WeakMap<Entry, Snapshot>();
  const divergent = new Set<Entry>();

  return {
    register(entry: Entry): void {
      originals.set(entry, snapshotOf(entry));
    },
    registerAll(entries: Iterable<Entry>): void {
      for (const e of entries) originals.set(e, snapshotOf(e));
    },
    markDirty(entry: Entry): boolean {
      let snap = originals.get(entry);
      if (!snap) {
        if (lazy) {
          snap = snapshotOf(entry);
          originals.set(entry, snap);
        } else {
          divergent.add(entry);
          return true;
        }
      }
      if (matchesSnapshot(entry, snap)) divergent.delete(entry);
      else divergent.add(entry);
      return divergent.size > 0;
    },
    isDirty(): boolean {
      return divergent.size > 0;
    },
    reset(): void {
      divergent.clear();
    },
  };
}
