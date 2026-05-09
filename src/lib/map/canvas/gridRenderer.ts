import { MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';
import { TILE_PIXEL_SIZE } from '../state/viewTransform.svelte';

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
  dpr: number;
};

const GRID_MIN_ZOOM = 4;

export function renderGridOverlay(
  ctx: CanvasRenderingContext2D,
  view: ViewLike,
  opacity: number,
): void {
  if (view.zoom < GRID_MIN_ZOOM) return;
  if (opacity <= 0) return;

  const dpr = view.dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const gridColor = `rgba(255,255,255,${(0.18 * opacity).toFixed(3)})`;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const stepCss = view.zoom * TILE_PIXEL_SIZE;
  const startScreenX = view.panX;
  const endScreenX = view.panX + MAP_WIDTH * stepCss;
  const startScreenY = view.panY;
  const endScreenY = view.panY + MAP_HEIGHT * stepCss;

  const left = Math.max(0, startScreenX);
  const right = Math.min(view.stageW, endScreenX);
  const top = Math.max(0, startScreenY);
  const bottom = Math.min(view.stageH, endScreenY);

  for (let x = 0; x <= MAP_WIDTH; x++) {
    const sx = view.panX + x * stepCss;
    if (sx < 0 || sx > view.stageW) continue;
    const px = Math.round(sx) + 0.5;
    ctx.moveTo(px, top);
    ctx.lineTo(px, bottom);
  }
  for (let y = 0; y <= MAP_HEIGHT; y++) {
    const sy = view.panY + y * stepCss;
    if (sy < 0 || sy > view.stageH) continue;
    const py = Math.round(sy) + 0.5;
    ctx.moveTo(left, py);
    ctx.lineTo(right, py);
  }

  ctx.stroke();
  ctx.restore();
}
