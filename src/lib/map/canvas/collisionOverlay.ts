import { emptyFootprintRect, isFenceActor } from '$lib/map/actors/actors';
import { rowFootprintRectInto } from '$lib/map/actors/ugcDimensions.svelte';
import { GRID_HEIGHT, GRID_WIDTH, type MapObjectRow } from '$lib/map/state/mapObjectsEditor.svelte';
import { TILE_PIXEL_SIZE } from '../state/viewTransform.svelte';

export const COLLISION_GRID_W = GRID_WIDTH;
export const COLLISION_GRID_H = GRID_HEIGHT;
const COLLISION_FILL = 'rgba(248, 113, 113, 0.45)';
const COLLISION_FILL_HOT = 'rgba(248, 113, 113, 0.65)';

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
  dpr: number;
};

function maskIndex(x: number, y: number): number {
  return y * COLLISION_GRID_W + x;
}

function forEachCollisionCell(
  rows: readonly MapObjectRow[],
  fn: (cellIndex: number, row: MapObjectRow) => void,
): void {
  const fp = emptyFootprintRect();
  for (const row of rows) {
    if (row.x < 0 || row.y < 0) continue;
    if (isFenceActor(row.actor)) continue;
    rowFootprintRectInto(row, fp);
    const x0 = Math.max(0, row.x + fp.x0);
    const y0 = Math.max(0, row.y + fp.y0);
    const x1 = Math.min(COLLISION_GRID_W, row.x + fp.x0 + fp.w);
    const y1 = Math.min(COLLISION_GRID_H, row.y + fp.y0 + fp.h);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        fn(maskIndex(x, y), row);
      }
    }
  }
}

export function computeCollisions(rows: readonly MapObjectRow[], out?: Uint8Array): Uint8Array {
  const mask = out ?? new Uint8Array(COLLISION_GRID_W * COLLISION_GRID_H);
  if (out) out.fill(0);
  forEachCollisionCell(rows, (i) => {
    const v = mask[i];
    if (v < 255) mask[i] = v + 1;
  });
  return mask;
}

export function collisionCountAt(mask: Uint8Array, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= COLLISION_GRID_W || y >= COLLISION_GRID_H) return 0;
  return mask[maskIndex(x, y)];
}

export function renderCollisions(
  ctx: CanvasRenderingContext2D,
  view: ViewLike,
  mask: Uint8Array,
  hot?: { x: number; y: number } | null,
): void {
  const dpr = view.dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const tileSize = view.zoom * TILE_PIXEL_SIZE;
  const minX = Math.max(0, Math.floor(-view.panX / tileSize));
  const minY = Math.max(0, Math.floor(-view.panY / tileSize));
  const maxX = Math.min(COLLISION_GRID_W, Math.ceil((view.stageW - view.panX) / tileSize));
  const maxY = Math.min(COLLISION_GRID_H, Math.ceil((view.stageH - view.panY) / tileSize));

  ctx.fillStyle = COLLISION_FILL;
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const v = mask[maskIndex(x, y)];
      if (v < 2) continue;
      if (hot && hot.x === x && hot.y === y) continue;
      const px = view.panX + x * tileSize;
      const py = view.panY + y * tileSize;
      ctx.fillRect(px, py, tileSize, tileSize);
    }
  }

  if (hot) {
    const v = mask[maskIndex(hot.x, hot.y)] ?? 0;
    if (v >= 2) {
      ctx.fillStyle = COLLISION_FILL_HOT;
      const px = view.panX + hot.x * tileSize;
      const py = view.panY + hot.y * tileSize;
      ctx.fillRect(px, py, tileSize, tileSize);
    }
  }

  ctx.restore();
}
