import { TILE_PIXEL_SIZE } from '../state/viewTransform.svelte';

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
  dpr: number;
};

type TierRect = { x: number; y: number; w: number; h: number };

// Source: romfs/Parameter/MapUnlockSystem/System.game__MapUnlockSystem.bgyml
// LevelN.MapGridIdx{Min,Max}{X,Z} (inclusive) and MapGridNumSize{X,Z}.
const TIER_RECTS: Record<1 | 2 | 3 | 4, TierRect> = {
  1: { x: 35, y: 22, w: 50, h: 36 },
  2: { x: 25, y: 15, w: 70, h: 50 },
  3: { x: 15, y: 8, w: 90, h: 64 },
  4: { x: 0, y: 0, w: 120, h: 80 },
};

function tierRectFor(level: number): TierRect | null {
  if (level === 1 || level === 2 || level === 3 || level === 4) return TIER_RECTS[level];
  return null;
}

const CELL_PX = 4;
const THICKNESS_PX = 4;
const TEAL = '#14b8a6';

export function renderTierBorder(
  ctx: CanvasRenderingContext2D,
  view: ViewLike,
  level: number,
  opacity: number,
): void {
  if (opacity <= 0) return;
  const rect = tierRectFor(level);
  if (!rect) return;

  const dpr = view.dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const tile = view.zoom * TILE_PIXEL_SIZE;
  const rx = view.panX + rect.x * tile;
  const ry = view.panY + rect.y * tile;
  const rw = rect.w * tile;
  const rh = rect.h * tile;

  ctx.fillStyle = TEAL;
  ctx.globalAlpha = opacity;

  const drawCell = (x: number, y: number, w: number, h: number): void => {
    if (w <= 0 || h <= 0) return;
    ctx.fillRect(x, y, w, h);
  };

  let i = 0;
  for (let cx = rx; cx < rx + rw; cx += CELL_PX) {
    const w = Math.min(CELL_PX, rx + rw - cx);
    if (i % 2 === 0) drawCell(cx, ry, w, THICKNESS_PX);
    i++;
  }
  i = 0;
  for (let cx = rx; cx < rx + rw; cx += CELL_PX) {
    const w = Math.min(CELL_PX, rx + rw - cx);
    if ((i + 1) % 2 === 0) drawCell(cx, ry + rh - THICKNESS_PX, w, THICKNESS_PX);
    i++;
  }
  i = 0;
  for (let cy = ry + THICKNESS_PX; cy < ry + rh - THICKNESS_PX; cy += CELL_PX) {
    const h = Math.min(CELL_PX, ry + rh - THICKNESS_PX - cy);
    if ((i + 1) % 2 === 0) drawCell(rx, cy, THICKNESS_PX, h);
    i++;
  }
  i = 0;
  for (let cy = ry + THICKNESS_PX; cy < ry + rh - THICKNESS_PX; cy += CELL_PX) {
    const h = Math.min(CELL_PX, ry + rh - THICKNESS_PX - cy);
    if (i % 2 === 0) drawCell(rx + rw - THICKNESS_PX, cy, THICKNESS_PX, h);
    i++;
  }

  ctx.restore();
}
