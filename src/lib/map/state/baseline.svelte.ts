import { floorTiles, MAP_TILE_COUNT, mapState } from '$lib/map/state/mapEditor.svelte';

type BaselineState = {
  loadId: number;
  rev: number;
  floor: readonly number[] | null;
};

const state = $state<BaselineState>({
  loadId: -2,
  rev: 0,
  floor: null,
});

function captureSnapshot(): void {
  const tiles = floorTiles();
  if (!mapState.ready || !tiles || tiles.length !== MAP_TILE_COUNT) {
    state.floor = null;
    state.loadId = mapState.loadId;
    state.rev = (state.rev + 1) | 0;
    return;
  }
  const fb = new Array<number>(MAP_TILE_COUNT);
  for (let i = 0; i < MAP_TILE_COUNT; i++) fb[i] = tiles[i] >>> 0;
  state.floor = fb;
  state.loadId = mapState.loadId;
  state.rev = (state.rev + 1) | 0;
}

export function syncBaselineFromSave(): void {
  if (state.loadId !== mapState.loadId) captureSnapshot();
}

export function floorBaseline(): readonly number[] | null {
  void state.rev;
  return state.floor;
}

export function modifiedFloorCount(): number {
  void state.rev;
  void mapState.tileRev;
  const baseline = state.floor;
  const tiles = floorTiles();
  if (!baseline || !tiles) return 0;
  let count = 0;
  for (let i = 0; i < MAP_TILE_COUNT; i++) {
    if (tiles[i] >>> 0 !== baseline[i]) count++;
  }
  return count;
}
