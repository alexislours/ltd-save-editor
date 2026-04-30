import { SvelteMap } from 'svelte/reactivity';
import {
  clearAllSidecars,
  deleteSidecar,
  getAllSidecars,
  putSidecars,
  type StoredSidecar,
} from '../sessionStore';
import { isJunkArchiveEntry, isSidecarFileName, type SidecarSource } from './sidecar';

type Origin = 'none' | 'folder' | 'zip' | 'bulk';
type PersistedOrigin = Exclude<Origin, 'none'>;

const state = $state<{
  origin: Origin;
  files: SvelteMap<string, Uint8Array>;
  pending: SvelteMap<string, Uint8Array>;
  originals: SvelteMap<string, Uint8Array>;
}>({
  origin: 'none',
  files: new SvelteMap(),
  pending: new SvelteMap(),
  originals: new SvelteMap(),
});

let restored = false;

export type SidecarRestoreSummary = { count: number; totalBytes: number };

export async function restorePersistedSidecars(): Promise<SidecarRestoreSummary | null> {
  if (restored) {
    if (state.files.size === 0) return null;
    let totalBytes = 0;
    for (const v of state.files.values()) totalBytes += v.byteLength;
    return { count: state.files.size, totalBytes };
  }
  restored = true;
  const records = await getAllSidecars();
  if (records.length === 0) return null;
  let totalBytes = 0;
  let firstOrigin: PersistedOrigin | null = null;
  for (const r of records) {
    if (isJunkArchiveEntry(r.name) || !isSidecarFileName(r.name)) {
      void deleteSidecar(r.name);
      continue;
    }
    state.files.set(r.name, r.bytes);
    if (r.pending) state.pending.set(r.name, r.bytes);
    if (r.originalBytes) state.originals.set(r.name, r.originalBytes);
    totalBytes += r.bytes.byteLength;
    if (!firstOrigin) firstOrigin = r.origin;
  }
  if (state.origin === 'none' && firstOrigin) state.origin = firstOrigin;
  return { count: state.files.size, totalBytes };
}

export function getSidecarStore(): SidecarSource {
  return { origin: state.origin === 'bulk' ? 'folder' : state.origin, files: state.files };
}

export function sidecarOrigin(): Origin {
  return state.origin;
}

export function sidecarFileCount(): number {
  return state.files.size;
}

export function pendingSidecarCount(): number {
  return state.pending.size;
}

export function pendingSidecarFiles(): { name: string; bytes: Uint8Array }[] {
  return Array.from(state.pending, ([name, bytes]) => ({ name, bytes }));
}

export function clearPendingSidecars(): void {
  const snapshot = new SvelteMap(state.pending);
  state.pending.clear();
  void persistPendingFlag(snapshot, false);
}

export function hasOriginal(name: string): boolean {
  return state.originals.has(name);
}

export function isPendingSidecar(name: string): boolean {
  return state.pending.has(name);
}

export function replaceSidecarFiles(files: ReadonlyMap<string, Uint8Array>): void {
  if (files.size === 0) return;
  const persistRecords: StoredSidecar[] = [];
  const origin: PersistedOrigin =
    state.origin === 'none' ? 'folder' : (state.origin as PersistedOrigin);
  if (state.origin === 'none') state.origin = origin;
  const savedAt = Date.now();
  for (const [name, bytes] of files) {
    if (!state.originals.has(name)) {
      const prev = state.files.get(name);
      if (prev) state.originals.set(name, prev);
    }
    state.files.set(name, bytes);
    state.pending.set(name, bytes);
    persistRecords.push({
      name,
      bytes,
      origin,
      savedAt,
      pending: true,
      originalBytes: state.originals.get(name),
    });
  }
  void putSidecars(persistRecords);
}

export function revertSidecarFiles(names: Iterable<string>): {
  restored: string[];
  removed: string[];
} {
  const restored: string[] = [];
  const removed: string[] = [];
  const persistRecords: StoredSidecar[] = [];
  const deleted: string[] = [];
  const origin: PersistedOrigin =
    state.origin === 'none' ? 'folder' : (state.origin as PersistedOrigin);
  const savedAt = Date.now();
  for (const name of names) {
    const orig = state.originals.get(name);
    if (orig) {
      state.files.set(name, orig);
      state.originals.delete(name);
      state.pending.delete(name);
      restored.push(name);
      persistRecords.push({ name, bytes: orig, origin, savedAt });
    } else if (state.pending.has(name)) {
      state.files.delete(name);
      state.pending.delete(name);
      removed.push(name);
      deleted.push(name);
    }
  }
  if (persistRecords.length > 0) void putSidecars(persistRecords);
  for (const name of deleted) void deleteSidecar(name);
  return { restored, removed };
}

export function markPendingSidecars(files: ReadonlyMap<string, Uint8Array>): void {
  for (const [k, v] of files) state.pending.set(k, v);
  void persistPendingFlag(files, true);
}

async function persistPendingFlag(
  files: ReadonlyMap<string, Uint8Array>,
  pending: boolean,
): Promise<void> {
  if (files.size === 0) return;
  const origin: PersistedOrigin = state.origin === 'none' ? 'folder' : state.origin;
  const savedAt = Date.now();
  const records: StoredSidecar[] = [];
  for (const [name, bytes] of files) {
    records.push({
      name,
      bytes,
      origin,
      savedAt,
      pending,
      originalBytes: state.originals.get(name),
    });
  }
  await putSidecars(records);
}

export function setSidecarFromMap(
  origin: PersistedOrigin,
  files: ReadonlyMap<string, Uint8Array>,
): void {
  state.origin = origin;
  state.files = new SvelteMap(files);
  void persistAll(origin, files);
}

export function mergeSidecarFiles(
  origin: PersistedOrigin,
  files: ReadonlyMap<string, Uint8Array>,
): void {
  if (files.size === 0) return;
  for (const [k, v] of files) state.files.set(k, v);
  if (state.origin === 'none') state.origin = origin;
  void persistAll(state.origin as PersistedOrigin, files);
}

export function clearSidecar(): void {
  state.origin = 'none';
  state.files = new SvelteMap();
  state.pending = new SvelteMap();
  state.originals = new SvelteMap();
  void clearAllSidecars();
}

async function persistAll(
  origin: PersistedOrigin,
  files: ReadonlyMap<string, Uint8Array>,
): Promise<void> {
  const savedAt = Date.now();
  const records: StoredSidecar[] = [];
  for (const [name, bytes] of files) {
    records.push({
      name,
      bytes,
      origin,
      savedAt,
      pending: state.pending.has(name) ? true : undefined,
      originalBytes: state.originals.get(name),
    });
  }
  await putSidecars(records);
}

export function collectSidecarFromNamedBytes(
  origin: Exclude<Origin, 'none'>,
  entries: Iterable<{ name: string; bytes: Uint8Array }>,
): number {
  const fresh = new SvelteMap<string, Uint8Array>();
  for (const { name, bytes } of entries) {
    if (isJunkArchiveEntry(name)) continue;
    const base = baseName(name);
    if (!isSidecarFileName(base)) continue;
    fresh.set(base, bytes);
  }
  if (fresh.size === 0) return 0;
  mergeSidecarFiles(origin, fresh);
  return fresh.size;
}

function baseName(name: string): string {
  const idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  return idx >= 0 ? name.slice(idx + 1) : name;
}
