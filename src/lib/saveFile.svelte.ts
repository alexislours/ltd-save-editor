import { SvelteSet } from 'svelte/reactivity';
import { parseSav } from './sav/parse';
import { writeSav } from './sav/write';
import type { SavFile } from './sav/types';
import { murmur3_x86_32 } from './sav/hash';
import { clearAllSessions, deleteSession, putSession } from './sessionStore';
import { clearSidecar } from './shareMii/sidecarStore.svelte';

export type SaveKind = 'player' | 'mii' | 'map';

export type LoadedSave = {
  name: string;
  size: number;
  lastModified: number;
  parsed: SavFile | null;
  parseError: string | null;
  /** Bumped on each successful parse */
  loadId: number;
};

export const expectedFileName: Record<SaveKind, string> = {
  player: 'Player.sav',
  mii: 'Mii.sav',
  map: 'Map.sav',
};

const SIGNATURE_HASHES: Record<SaveKind, number> = {
  player: murmur3_x86_32('Player.Name'),
  mii: murmur3_x86_32('Mii.Name.Name'),
  map: 0x78e32e1c,
};

export function detectSaveKindFromBytes(bytes: Uint8Array): SaveKind | null {
  let parsed;
  try {
    parsed = parseSav(bytes);
  } catch {
    return null;
  }
  const hashes = new SvelteSet(parsed.entries.map((e) => e.hash));
  for (const kind of Object.keys(SIGNATURE_HASHES) as SaveKind[]) {
    if (hashes.has(SIGNATURE_HASHES[kind])) return kind;
  }
  return null;
}

export function detectSaveKindFromName(fileName: string): SaveKind | null {
  const lower = fileName.toLowerCase();
  for (const kind of Object.keys(expectedFileName) as SaveKind[]) {
    if (lower === expectedFileName[kind].toLowerCase()) return kind;
  }
  return null;
}

const saves = $state<Record<SaveKind, LoadedSave | null>>({
  player: null,
  mii: null,
  map: null,
});

let nextLoadId = 1;

export function getSave(kind: SaveKind): LoadedSave | null {
  return saves[kind];
}

export function getSaveBytes(kind: SaveKind): Uint8Array | null {
  const save = saves[kind];
  if (!save || !save.parsed) return null;
  return writeSav(save.parsed);
}

export async function setSaveFromFile(kind: SaveKind, file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  setSaveFromBytes(kind, {
    name: file.name,
    bytes,
    lastModified: file.lastModified,
  });
}

type SetSaveOptions = { persist?: boolean };

export function setSaveFromBytes(
  kind: SaveKind,
  input: { name: string; bytes: Uint8Array; lastModified?: number },
  options: SetSaveOptions = {},
): void {
  const lastModified = input.lastModified ?? Date.now();
  let parsed: SavFile | null = null;
  let parseError: string | null = null;
  try {
    parsed = parseSav(input.bytes);
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }
  saves[kind] = {
    name: input.name,
    size: input.bytes.byteLength,
    lastModified,
    parsed,
    parseError,
    loadId: nextLoadId++,
  };
  if (options.persist !== false) {
    void putSession({
      kind,
      name: input.name,
      bytes: input.bytes,
      lastModified,
      savedAt: Date.now(),
    });
  }
}

/** Persist the current in-memory state for crash recovery. */
export function persistCurrent(kind: SaveKind): void {
  const save = saves[kind];
  if (!save || !save.parsed) return;
  const bytes = writeSav(save.parsed);
  void putSession({
    kind,
    name: save.name,
    bytes,
    lastModified: save.lastModified,
    savedAt: Date.now(),
  });
}

export const SAVE_KINDS: readonly SaveKind[] = ['player', 'mii', 'map'];

export function clearSave(kind: SaveKind, options: SetSaveOptions = {}): void {
  saves[kind] = null;
  if (options.persist !== false) void deleteSession(kind);
}

export function clearAllSaves(options: SetSaveOptions = {}): SaveKind[] {
  const cleared: SaveKind[] = [];
  for (const kind of SAVE_KINDS) {
    if (saves[kind]) {
      saves[kind] = null;
      cleared.push(kind);
    }
  }
  clearSidecar();
  if (options.persist !== false) void clearAllSessions();
  return cleared;
}
