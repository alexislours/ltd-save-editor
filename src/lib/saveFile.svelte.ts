import { SvelteSet } from 'svelte/reactivity';
import { decode } from './sav/materialized/decode';
import { encode } from './sav/materialized/encode';
import type { DecodedSave } from './sav/materialized/types';
import { parseSav } from './sav/parse';
import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from './sav/schema';
import { writeSav } from './sav/write';
import type { Entry } from './sav/types';
import { murmur3_x86_32 } from './sav/hash';
import { clearAllSessions, deleteSession, putSession } from './sessionStore';
import { clearSidecar } from './shareMii/sidecarStore.svelte';

export type SaveKind = 'player' | 'mii' | 'map';

export type DecodedByKind = {
  mii: DecodedSave | null;
  player: DecodedSave | null;
  map: DecodedSave | null;
};

export type LoadedSave = {
  name: string;
  size: number;
  lastModified: number;
  decoded: DecodedByKind;
  loadedBytes: Uint8Array;
  parseError: string | null;
  loadId: number;
};

export const expectedFileName: Record<SaveKind, string> = {
  player: 'Player.sav',
  mii: 'Mii.sav',
  map: 'Map.sav',
};

export type SchemaForKind = {
  player: typeof PLAYER_SCHEMA;
  mii: typeof MII_SCHEMA;
  map: typeof MAP_SCHEMA;
};

const SCHEMAS: SchemaForKind = {
  mii: MII_SCHEMA,
  player: PLAYER_SCHEMA,
  map: MAP_SCHEMA,
};

export function schemaFor<K extends SaveKind>(kind: K): SchemaForKind[K] {
  return SCHEMAS[kind];
}

const SIGNATURE_HASHES: Record<SaveKind, number> = {
  player: murmur3_x86_32('Player.Name'),
  mii: murmur3_x86_32('Mii.Name.Name'),
  map: MAP_SCHEMA.MapGrid.GridX.GridZ.FloorKeyHash.hash,
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

export function isSaveLoaded(kind: SaveKind): boolean {
  const save = saves[kind];
  return save != null && save.parseError == null && save.decoded[kind] != null;
}

export function getSaveBytes(kind: SaveKind): Uint8Array | null {
  const save = saves[kind];
  if (!save) return null;
  const decoded = save.decoded[kind];
  if (decoded) {
    return writeSav(encode(SCHEMAS[kind], decoded));
  }
  return save.loadedBytes;
}

export function getEntriesForAdvanced(kind: SaveKind): Entry[] {
  const bytes = getSaveBytes(kind);
  if (!bytes) return [];
  try {
    return parseSav(bytes).entries;
  } catch {
    return [];
  }
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

function emptyDecoded(): DecodedByKind {
  return { mii: null, player: null, map: null };
}

export function setSaveFromBytes(
  kind: SaveKind,
  input: { name: string; bytes: Uint8Array; lastModified?: number },
  options: SetSaveOptions = {},
): void {
  const lastModified = input.lastModified ?? Date.now();
  let parseError: string | null = null;
  const decoded: DecodedByKind = emptyDecoded();
  try {
    const parsed = parseSav(input.bytes);
    const d = decode(SCHEMAS[kind], parsed);
    if (kind === 'mii') decoded.mii = d;
    else if (kind === 'player') decoded.player = d;
    else decoded.map = d;
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }
  saves[kind] = {
    name: input.name,
    size: input.bytes.byteLength,
    lastModified,
    decoded,
    loadedBytes: input.bytes,
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

export function persistCurrent(kind: SaveKind): void {
  const save = saves[kind];
  if (!save) return;
  const bytes = getSaveBytes(kind);
  if (!bytes) return;
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
