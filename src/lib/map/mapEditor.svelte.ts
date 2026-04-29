import { DataType } from '../sav/dataType';
import type { Entry } from '../sav/types';
import { downloadMapSav, ensureParsed, mapSave, scheduleMapPersist } from './mapSave.svelte';

export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 80;
export const MAP_TILE_COUNT = MAP_WIDTH * MAP_HEIGHT;

export const FLOOR_KEY_HASH = 0x78e32e1c;

type EditorState = {
  entry: Entry | null;
  error: string | null;
  parseRev: number;
  dirty: boolean;
  tileRev: number;
};

const state = $state<EditorState>({
  entry: null,
  error: null,
  parseRev: -1,
  dirty: false,
  tileRev: 0,
});

export const mapState = state;

let originalTiles: Uint32Array | null = null;

function bumpRev(): void {
  state.tileRev = (state.tileRev + 1) | 0;
}

function tileBufferView(): Uint32Array {
  if (!state.entry?.payload) {
    throw new Error('Map is not loaded');
  }

  return new Uint32Array(
    state.entry.payload.buffer,
    state.entry.payload.byteOffset + 4,
    MAP_TILE_COUNT,
  );
}

function recomputeDirty(): void {
  if (!state.entry || !originalTiles) {
    state.dirty = false;
    return;
  }
  const current = tileBufferView();
  for (let i = 0; i < MAP_TILE_COUNT; i++) {
    if (current[i] !== originalTiles[i]) {
      state.dirty = true;
      return;
    }
  }
  state.dirty = false;
}

export function syncFromSave(): void {
  const parsed = ensureParsed();
  if (!parsed) {
    if (state.entry || state.error) {
      state.entry = null;
      state.error = mapSave.error;
      state.dirty = false;
      originalTiles = null;
      state.parseRev = mapSave.parseRev;
      bumpRev();
    }
    return;
  }
  if (state.parseRev === mapSave.parseRev && state.entry) return;

  try {
    const entry = parsed.entries.find(
      (e) => e.hash === FLOOR_KEY_HASH && e.type === DataType.UIntArray,
    );
    if (!entry || !entry.payload) {
      throw new Error('Map save has no MapGrid.GridX.GridZ.FloorKeyHash (expected UIntArray)');
    }

    const view = new DataView(
      entry.payload.buffer,
      entry.payload.byteOffset,
      entry.payload.byteLength,
    );
    const count = view.getUint32(0, true);
    if (count !== MAP_TILE_COUNT) {
      throw new Error(`Unexpected tile count ${count} (expected ${MAP_TILE_COUNT})`);
    }

    state.entry = entry;
    state.error = null;
    state.parseRev = mapSave.parseRev;
    state.dirty = false;

    // Snapshot tiles so reverts clear the dirty flag.
    const tiles = tileBufferView();
    originalTiles = new Uint32Array(tiles);
    bumpRev();
  } catch (e) {
    state.entry = null;
    state.error = e instanceof Error ? e.message : String(e);
    state.parseRev = mapSave.parseRev;
    state.dirty = false;
    originalTiles = null;
    bumpRev();
  }
}

export function indexFromXY(x: number, y: number): number {
  return x * MAP_HEIGHT + y;
}

export function xyFromIndex(index: number): { x: number; y: number } {
  return { x: (index / MAP_HEIGHT) | 0, y: index % MAP_HEIGHT };
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
}

export function getTile(x: number, y: number): number {
  if (!state.entry) return 0;
  return tileBufferView()[indexFromXY(x, y)];
}

export function getTileByIndex(index: number): number {
  if (!state.entry) return 0;
  return tileBufferView()[index];
}

export function setTileIndex(index: number, value: number): boolean {
  if (!state.entry) return false;
  const tiles = tileBufferView();
  if (tiles[index] === value >>> 0) return false;
  tiles[index] = value >>> 0;
  return true;
}

export function commitTileChanges(changedCount: number): void {
  if (changedCount <= 0) return;
  bumpRev();
  recomputeDirty();
  scheduleMapPersist();
}

export function replaceTilesFromSnapshot(snapshot: Uint32Array): void {
  if (!state.entry) return;
  const tiles = tileBufferView();
  tiles.set(snapshot);
  bumpRev();
  recomputeDirty();
  scheduleMapPersist();
}

export function snapshotTiles(): Uint32Array {
  return new Uint32Array(tileBufferView());
}

export function downloadModified(): void {
  downloadMapSav('Map.sav');
}
