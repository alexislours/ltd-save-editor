import {
  getUgcByIndex,
  inBounds,
  indexFromXY,
  ugcTiles,
  UGC_NONE,
} from '$lib/map/state/mapEditor.svelte';

export { UGC_NONE };

export const UGC_TIER_COUNT = 6;

export const UGC_TIER_COLORS: readonly string[] = [
  '#a78bfa',
  '#14b8a6',
  '#facc15',
  '#f472b6',
  '#84cc16',
  '#38bdf8',
];

export function ugcIndex(): readonly number[] | null {
  return ugcTiles();
}

export function getUgcAt(x: number, y: number): number {
  if (!inBounds(x, y)) return UGC_NONE;
  return getUgcByIndex(indexFromXY(x, y));
}

export function ugcTier(value: number): number {
  if (value < 0) return -1;
  return value % UGC_TIER_COUNT;
}
