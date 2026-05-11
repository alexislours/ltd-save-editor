import { inBounds } from '$lib/map/state/mapEditor.svelte';
import { tileColorForHash } from '$lib/map/tiles/tiles';
import type { view as ViewState } from '$lib/map/state/viewTransform.svelte';

type View = typeof ViewState;

export function renderBrushPreview(
  ctx: CanvasRenderingContext2D,
  view: View,
  kernel: Int16Array,
  cx: number,
  cy: number,
  tileHash: number,
  opacity: number,
): void {
  if (opacity <= 0 || kernel.length === 0) return;
  const dpr = view.dpr;
  const tile = view.zoom * dpr;
  const panX = view.panX * dpr;
  const panY = view.panY * dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;
  ctx.fillStyle = tileColorForHash(tileHash);
  for (let i = 0; i < kernel.length; i += 2) {
    const x = cx + kernel[i];
    const y = cy + kernel[i + 1];
    if (!inBounds(x, y)) continue;
    const px = Math.floor(panX + x * tile);
    const py = Math.floor(panY + y * tile);
    const pw = Math.floor(panX + (x + 1) * tile) - px;
    const ph = Math.floor(panY + (y + 1) * tile) - py;
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
}
