import type { TileChange } from '$lib/map/state/history.svelte';
import {
  commitTileChanges,
  floorTiles,
  getUgcByIndex,
  setTileIndex,
  setUgcIndex,
} from '$lib/map/state/mapEditor.svelte';

function diffReplaceAll(tiles: readonly number[], hashFrom: number, hashTo: number): TileChange[] {
  const from = hashFrom >>> 0;
  const to = hashTo >>> 0;
  if (from === to) return [];
  const changes: TileChange[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] >>> 0 === from) {
      changes.push({ index: i, oldValue: from, newValue: to });
    }
  }
  return changes;
}

export function replaceAll(hashFrom: number, hashTo: number, ugcOverride?: number): TileChange[] {
  const tiles = floorTiles();
  if (!tiles) return [];
  const changes = diffReplaceAll(tiles, hashFrom, hashTo);
  if (changes.length === 0) return changes;
  let applied = 0;
  for (const c of changes) {
    if (setTileIndex(c.index, c.newValue)) applied++;
    if (ugcOverride !== undefined) {
      const oldUgc = getUgcByIndex(c.index);
      if (oldUgc !== ugcOverride && setUgcIndex(c.index, ugcOverride)) {
        c.oldUgc = oldUgc;
        c.newUgc = ugcOverride;
        applied++;
      }
    }
  }
  commitTileChanges(applied);
  return changes;
}
