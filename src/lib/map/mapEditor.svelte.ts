import { MAP_SCHEMA } from '../sav/schema';
import {
  downloadMapSav,
  mapAccessor,
  mapSave,
  syncFromSave as syncMapSave,
} from './mapSave.svelte';

export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 80;
export const MAP_TILE_COUNT = MAP_WIDTH * MAP_HEIGHT;

const FLOOR_LEAF = MAP_SCHEMA.MapGrid.GridX.GridZ.FloorKeyHash;
const FLOOR_PATH = 'MapGrid.GridX.GridZ.FloorKeyHash';

type EditorState = {
  ready: boolean;
  error: string | null;
  loadId: number;
  tileRev: number;
};

const state = $state<EditorState>({
  ready: false,
  error: null,
  loadId: -1,
  tileRev: 0,
});

export const mapState = state;

function bumpRev(): void {
  state.tileRev = (state.tileRev + 1) | 0;
}

function tilesArray(): number[] | null {
  const decoded = mapSave.decoded;
  if (!decoded) return null;
  const arr = (decoded.values as unknown as Record<string, unknown>)[FLOOR_PATH] as
    | number[]
    | undefined;
  return arr ?? null;
}

export function floorTiles(): readonly number[] | null {
  void state.tileRev;
  return tilesArray();
}

export function syncFromSave(): void {
  syncMapSave();
  const decoded = mapSave.decoded;
  if (!decoded) {
    if (state.ready || state.error) {
      state.ready = false;
      state.error = mapSave.error;
      state.loadId = mapSave.loadId;
      bumpRev();
    }
    return;
  }
  if (state.loadId === mapSave.loadId && (state.ready || state.error)) return;

  try {
    const tiles = tilesArray();
    if (!tiles) {
      throw new Error('Map save has no MapGrid.GridX.GridZ.FloorKeyHash (expected UIntArray)');
    }
    if (tiles.length !== MAP_TILE_COUNT) {
      throw new Error(`Unexpected tile count ${tiles.length} (expected ${MAP_TILE_COUNT})`);
    }

    state.ready = true;
    state.error = null;
    state.loadId = mapSave.loadId;

    bumpRev();
  } catch (e) {
    state.ready = false;
    state.error = e instanceof Error ? e.message : String(e);
    state.loadId = mapSave.loadId;
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
  const tiles = tilesArray();
  if (!tiles) return 0;
  return tiles[indexFromXY(x, y)] >>> 0;
}

export function getTileByIndex(index: number): number {
  const tiles = tilesArray();
  if (!tiles) return 0;
  return tiles[index] >>> 0;
}

export function setTileIndex(index: number, value: number): boolean {
  const tiles = tilesArray();
  if (!tiles) return false;
  const v = value >>> 0;
  if (tiles[index] >>> 0 === v) return false;
  const acc = mapAccessor();
  if (!acc) return false;
  acc.setElement(FLOOR_LEAF, index, v);
  return true;
}

export function commitTileChanges(changedCount: number): void {
  if (changedCount <= 0) return;
  bumpRev();
}

export function replaceTilesFromSnapshot(snapshot: Uint32Array): void {
  const tiles = tilesArray();
  if (!tiles) return;
  const acc = mapAccessor();
  if (!acc) return;
  for (let i = 0; i < snapshot.length; i++) {
    if (tiles[i] >>> 0 !== snapshot[i] >>> 0) {
      acc.setElement(FLOOR_LEAF, i, snapshot[i] >>> 0);
    }
  }
  bumpRev();
}

export function snapshotTiles(): Uint32Array {
  const tiles = tilesArray();
  if (!tiles) return new Uint32Array(0);
  const out = new Uint32Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) out[i] = tiles[i] >>> 0;
  return out;
}

export function downloadModified(): void {
  downloadMapSav();
}
