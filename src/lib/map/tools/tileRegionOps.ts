import {
  commitTileChanges,
  getTileByIndex,
  getUgcByIndex,
  inBounds,
  indexFromXY,
  MAP_HEIGHT,
  setTileIndex,
  setUgcIndex,
  UGC_NONE,
} from '$lib/map/state/mapEditor.svelte';
import type { TileChange } from '$lib/map/state/history.svelte';
import { GRASS_HASH } from '$lib/map/tiles/tiles';
import { emptyClipboard, type TileClipboard } from './tileClipboard.svelte';

function xyFromIndex(i: number): { x: number; y: number } {
  return { x: (i / MAP_HEIGHT) | 0, y: i % MAP_HEIGHT };
}

function boundingBox(indices: Iterable<number>): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let any = false;
  for (const i of indices) {
    const { x, y } = xyFromIndex(i);
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
    any = true;
  }
  if (!any) return null;
  return { x0, y0, x1, y1 };
}

export function copyRegion(indices: Iterable<number>): TileClipboard | null {
  const bb = boundingBox(indices);
  if (!bb) return null;
  const width = bb.x1 - bb.x0 + 1;
  const height = bb.y1 - bb.y0 + 1;
  const clip = emptyClipboard(width, height);

  for (const i of indices) {
    const { x, y } = xyFromIndex(i);
    const lx = x - bb.x0;
    const ly = y - bb.y0;
    const ci = ly * width + lx;
    clip.mask[ci] = 1;
    clip.floor[ci] = getTileByIndex(i) >>> 0;
    clip.ugc[ci] = getUgcByIndex(i) | 0;
  }
  return clip;
}

export function eraseRegion(indices: Iterable<number>): TileChange[] {
  const changes: TileChange[] = [];
  let applied = 0;
  for (const i of indices) {
    const oldValue = getTileByIndex(i) >>> 0;
    const oldUgc = getUgcByIndex(i) | 0;
    const newValue = GRASS_HASH;
    const newUgc = UGC_NONE;
    const tileChanged = oldValue !== newValue;
    const ugcChanged = oldUgc !== newUgc;
    if (!tileChanged && !ugcChanged) continue;
    if (tileChanged && setTileIndex(i, newValue)) applied++;
    if (ugcChanged && setUgcIndex(i, newUgc)) applied++;
    const change: TileChange = { index: i, oldValue, newValue };
    if (ugcChanged) {
      change.oldUgc = oldUgc;
      change.newUgc = newUgc;
    }
    changes.push(change);
  }
  commitTileChanges(applied);
  changes.sort((a, b) => a.index - b.index);
  return changes;
}

export function cutRegion(indices: Iterable<number>): {
  clip: TileClipboard | null;
  changes: TileChange[];
} {
  // Materialize to avoid double-iteration of a live set after mutations.
  const list: number[] = [];
  for (const i of indices) list.push(i);
  const clip = copyRegion(list);
  const changes = eraseRegion(list);
  return { clip, changes };
}

export function pasteRegion(clip: TileClipboard, atX: number, atY: number): TileChange[] {
  const changes: TileChange[] = [];
  let applied = 0;
  for (let ly = 0; ly < clip.height; ly++) {
    for (let lx = 0; lx < clip.width; lx++) {
      const ci = ly * clip.width + lx;
      if (!clip.mask[ci]) continue;
      const x = atX + lx;
      const y = atY + ly;
      if (!inBounds(x, y)) continue;
      const i = indexFromXY(x, y);
      const oldValue = getTileByIndex(i) >>> 0;
      const oldUgc = getUgcByIndex(i) | 0;
      const newValue = clip.floor[ci] >>> 0;
      const newUgc = clip.ugc[ci] | 0;
      const tileChanged = oldValue !== newValue;
      const ugcChanged = oldUgc !== newUgc;
      if (!tileChanged && !ugcChanged) continue;
      if (tileChanged && setTileIndex(i, newValue)) applied++;
      if (ugcChanged && setUgcIndex(i, newUgc)) applied++;
      const change: TileChange = { index: i, oldValue, newValue };
      if (ugcChanged) {
        change.oldUgc = oldUgc;
        change.newUgc = newUgc;
      }
      changes.push(change);
    }
  }
  commitTileChanges(applied);
  changes.sort((a, b) => a.index - b.index);
  return changes;
}

export function mirrorX(clip: TileClipboard): TileClipboard {
  const { width, height } = clip;
  const out = emptyClipboard(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * width + x;
      const dst = y * width + (width - 1 - x);
      out.mask[dst] = clip.mask[src];
      out.floor[dst] = clip.floor[src];
      out.ugc[dst] = clip.ugc[src];
    }
  }
  return out;
}

export function mirrorY(clip: TileClipboard): TileClipboard {
  const { width, height } = clip;
  const out = emptyClipboard(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * width + x;
      const dst = (height - 1 - y) * width + x;
      out.mask[dst] = clip.mask[src];
      out.floor[dst] = clip.floor[src];
      out.ugc[dst] = clip.ugc[src];
    }
  }
  return out;
}

export function rotateCW(clip: TileClipboard): TileClipboard {
  const { width, height } = clip;
  const newW = height;
  const newH = width;
  const out = emptyClipboard(newW, newH);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * width + x;
      const nx = height - 1 - y;
      const ny = x;
      const dst = ny * newW + nx;
      out.mask[dst] = clip.mask[src];
      out.floor[dst] = clip.floor[src];
      out.ugc[dst] = clip.ugc[src];
    }
  }
  return out;
}

export function rotateCCW(clip: TileClipboard): TileClipboard {
  const { width, height } = clip;
  const newW = height;
  const newH = width;
  const out = emptyClipboard(newW, newH);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * width + x;
      const nx = y;
      const ny = width - 1 - x;
      const dst = ny * newW + nx;
      out.mask[dst] = clip.mask[src];
      out.floor[dst] = clip.floor[src];
      out.ugc[dst] = clip.ugc[src];
    }
  }
  return out;
}
