import { inBounds, indexFromXY, MAP_HEIGHT } from '$lib/map/state/mapEditor.svelte';
import { tileColorForHash } from '$lib/map/tiles/tiles';
import { UGC_TIER_COLORS, UGC_TIER_COUNT } from '../state/ugcEditor.svelte';
import type { TileClipboard } from '$lib/map/tools/tileClipboard.svelte';
import type { view as ViewState } from '$lib/map/state/viewTransform.svelte';

type View = typeof ViewState;

export function renderTileSelection(
  ctx: CanvasRenderingContext2D,
  view: View,
  indices: ReadonlySet<number>,
): void {
  if (indices.size === 0) return;
  const dpr = view.dpr;
  const tile = view.zoom * dpr;
  const panX = view.panX * dpr;
  const panY = view.panY * dpr;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const i of indices) {
    const x = (i / MAP_HEIGHT) | 0;
    const y = i % MAP_HEIGHT;
    if (!inBounds(x, y)) continue;
    const px = Math.floor(panX + x * tile);
    const py = Math.floor(panY + y * tile);
    const pw = Math.floor(panX + (x + 1) * tile) - px;
    const ph = Math.floor(panY + (y + 1) * tile) - py;
    ctx.fillRect(px, py, pw, ph);
  }

  ctx.lineWidth = Math.max(1, Math.min(2, tile * 0.08));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  for (const i of indices) {
    const x = (i / MAP_HEIGHT) | 0;
    const y = i % MAP_HEIGHT;
    if (!inBounds(x, y)) continue;
    const px = Math.floor(panX + x * tile);
    const py = Math.floor(panY + y * tile);
    const pw = Math.floor(panX + (x + 1) * tile) - px;
    const ph = Math.floor(panY + (y + 1) * tile) - py;

    const topInside = inBounds(x, y - 1) && indices.has(indexFromXY(x, y - 1));
    const bottomInside = inBounds(x, y + 1) && indices.has(indexFromXY(x, y + 1));
    const leftInside = inBounds(x - 1, y) && indices.has(indexFromXY(x - 1, y));
    const rightInside = inBounds(x + 1, y) && indices.has(indexFromXY(x + 1, y));
    if (!topInside) ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, 0);
    if (!bottomInside) ctx.strokeRect(px + 0.5, py + ph - 0.5, pw - 1, 0);
    if (!leftInside) ctx.strokeRect(px + 0.5, py + 0.5, 0, ph - 1);
    if (!rightInside) ctx.strokeRect(px + pw - 0.5, py + 0.5, 0, ph - 1);
  }
  ctx.restore();
}

function ugcTierColor(value: number): string {
  const tier = ((value % UGC_TIER_COUNT) + UGC_TIER_COUNT) % UGC_TIER_COUNT;
  return UGC_TIER_COLORS[tier];
}

export function renderPastePreview(
  ctx: CanvasRenderingContext2D,
  view: View,
  clip: TileClipboard,
  atX: number,
  atY: number,
  opacity: number,
): void {
  if (opacity <= 0) return;
  const dpr = view.dpr;
  const tile = view.zoom * dpr;
  const panX = view.panX * dpr;
  const panY = view.panY * dpr;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;

  for (let ly = 0; ly < clip.height; ly++) {
    for (let lx = 0; lx < clip.width; lx++) {
      const ci = ly * clip.width + lx;
      if (!clip.mask[ci]) continue;
      const x = atX + lx;
      const y = atY + ly;
      if (!inBounds(x, y)) continue;
      const px = Math.floor(panX + x * tile);
      const py = Math.floor(panY + y * tile);
      const pw = Math.floor(panX + (x + 1) * tile) - px;
      const ph = Math.floor(panY + (y + 1) * tile) - py;
      ctx.fillStyle = tileColorForHash(clip.floor[ci] >>> 0);
      ctx.fillRect(px, py, pw, ph);
      const ugc = clip.ugc[ci] | 0;
      if (ugc >= 0) {
        ctx.fillStyle = ugcTierColor(ugc);
        ctx.globalAlpha = opacity * 0.55;
        ctx.fillRect(px, py, pw, ph);
        ctx.globalAlpha = opacity;
      }
    }
  }

  ctx.globalAlpha = Math.min(1, opacity + 0.2);
  ctx.lineWidth = Math.max(1, Math.min(2, tile * 0.1));
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  const fx0 = Math.floor(panX + atX * tile) + 0.5;
  const fy0 = Math.floor(panY + atY * tile) + 0.5;
  const fx1 = Math.floor(panX + (atX + clip.width) * tile);
  const fy1 = Math.floor(panY + (atY + clip.height) * tile);
  ctx.strokeRect(fx0, fy0, fx1 - fx0 - 1, fy1 - fy0 - 1);

  ctx.restore();
}
