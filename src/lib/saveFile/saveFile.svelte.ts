import { decode } from '$lib/sav/materialized/decode';
import { encode } from '$lib/sav/materialized/encode';
import type { DecodedSave } from '$lib/sav/materialized/types';
import { parseSav } from '$lib/sav/parse';
import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from '$lib/sav/schema';
import { writeSav } from '$lib/sav/write';
import type { Entry } from '$lib/sav/types';
import { clearAllSessions, deleteSession, putSession } from '$lib/session/sessionStore';
import { clearSidecar } from '$lib/shareMii/sidecar/sidecarStore.svelte';

export type SaveKind = 'player' | 'mii' | 'map';

type LoadedSave = {
  name: string;
  size: number;
  lastModified: number;
  decoded: DecodedSave | null;
  loadedBytes: Uint8Array | null;
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

const SIGNATURE_HASHES: Record<SaveKind, number> = {
  player: PLAYER_SCHEMA.Player.Name.hash,
  mii: MII_SCHEMA.Mii.Name.Name.hash,
  map: MAP_SCHEMA.MapGrid.GridX.GridZ.FloorKeyHash.hash,
};

export function detectSaveKindFromBytes(bytes: Uint8Array): SaveKind | null {
  let parsed;
  try {
    parsed = parseSav(bytes);
  } catch {
    return null;
  }
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const hashes = new Set(parsed.entries.map((e) => e.hash));
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
  return save != null && save.parseError == null && save.decoded != null;
}

export function getSaveBytes(kind: SaveKind): Uint8Array | null {
  const save = saves[kind];
  if (!save) return null;
  const decoded = save.decoded;
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

type SetSaveOptions = { persist?: boolean };

export function setSaveFromBytes(
  kind: SaveKind,
  input: { name: string; bytes: Uint8Array; lastModified?: number },
  options: SetSaveOptions = {},
): void {
  const lastModified = input.lastModified ?? Date.now();
  let decoded: DecodedSave | null = null;
  let parseError: string | null = null;
  try {
    const parsed = parseSav(input.bytes);
    decoded = decode(SCHEMAS[kind], parsed);
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
  if (options.persist !== false && decoded) persistCurrent(kind);
}

export function restoreSaveFromDecoded(
  kind: SaveKind,
  input: { name: string; size: number; lastModified: number; decoded: DecodedSave },
): void {
  const { decoded } = input;
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    !decoded.values ||
    typeof decoded.values !== 'object' ||
    !Array.isArray(decoded.unknowns) ||
    !Array.isArray(decoded.plan) ||
    typeof decoded.version !== 'number'
  ) {
    throw new Error('restoreSaveFromDecoded: invalid decoded shape');
  }
  const unknownsLen = decoded.unknowns.length;
  const values = decoded.values;
  for (const item of decoded.plan) {
    if (item.kind === 'known') {
      if (typeof item.hash !== 'number' || !Object.hasOwn(values, item.hash)) {
        throw new Error('restoreSaveFromDecoded: invalid plan entry');
      }
    } else if (item.kind === 'unknown') {
      if (typeof item.index !== 'number' || item.index < 0 || item.index >= unknownsLen) {
        throw new Error('restoreSaveFromDecoded: plan references missing unknown');
      }
    } else {
      throw new Error('restoreSaveFromDecoded: invalid plan entry');
    }
  }
  saves[kind] = {
    name: input.name,
    size: input.size,
    lastModified: input.lastModified,
    decoded,
    loadedBytes: null,
    parseError: null,
    loadId: nextLoadId++,
  };
}

export function persistCurrent(kind: SaveKind): void {
  const save = saves[kind];
  if (!save) return;
  const decoded = save.decoded;
  if (!decoded) return;
  void putSession({
    kind,
    name: save.name,
    size: save.size,
    lastModified: save.lastModified,
    savedAt: Date.now(),
    decoded: $state.snapshot(decoded) as DecodedSave,
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
