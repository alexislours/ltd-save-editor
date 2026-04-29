import { SvelteMap } from 'svelte/reactivity';
import { clearAllSidecars, getAllSidecars, putSidecars, type StoredSidecar } from '../sessionStore';
import { isSidecarFileName, type SidecarSource } from './sidecar';

type Origin = 'none' | 'folder' | 'zip' | 'bulk';
type PersistedOrigin = Exclude<Origin, 'none'>;

const state = $state<{
  origin: Origin;
  files: SvelteMap<string, Uint8Array>;
  pending: SvelteMap<string, Uint8Array>;
}>({
  origin: 'none',
  files: new SvelteMap(),
  pending: new SvelteMap(),
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
  for (const r of records) {
    state.files.set(r.name, r.bytes);
    if (r.pending) state.pending.set(r.name, r.bytes);
    totalBytes += r.bytes.byteLength;
  }
  if (state.origin === 'none') state.origin = records[0].origin;
  return { count: records.length, totalBytes };
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
  for (const [name, bytes] of files) records.push({ name, bytes, origin, savedAt, pending });
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
  void clearAllSidecars();
}

async function persistAll(
  origin: PersistedOrigin,
  files: ReadonlyMap<string, Uint8Array>,
): Promise<void> {
  const savedAt = Date.now();
  const records: StoredSidecar[] = [];
  for (const [name, bytes] of files) records.push({ name, bytes, origin, savedAt });
  await putSidecars(records);
}

export function collectSidecarFromNamedBytes(
  origin: Exclude<Origin, 'none'>,
  entries: Iterable<{ name: string; bytes: Uint8Array }>,
): number {
  const fresh = new SvelteMap<string, Uint8Array>();
  for (const { name, bytes } of entries) {
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
