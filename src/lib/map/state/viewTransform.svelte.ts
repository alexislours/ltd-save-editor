import { MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';

export const TILE_PIXEL_SIZE = 1;
const WORLD_WIDTH = MAP_WIDTH * TILE_PIXEL_SIZE;
const WORLD_HEIGHT = MAP_HEIGHT * TILE_PIXEL_SIZE;

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 32;
export const ZOOM_100 = 8;
const OVERPAN_FACTOR = 0.25;

type ViewState = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
  dpr: number;
};

export const view = $state<ViewState>({
  zoom: 1,
  panX: 0,
  panY: 0,
  stageW: 0,
  stageH: 0,
  dpr: 1,
});

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function fitZoom(stageW: number, stageH: number): number {
  if (stageW <= 0 || stageH <= 0) return 1;
  return Math.min(stageW / WORLD_WIDTH, stageH / WORLD_HEIGHT);
}

let hasFitOnce = false;

export function setStageSize(stageW: number, stageH: number): void {
  view.stageW = stageW;
  view.stageH = stageH;
  if (!hasFitOnce && stageW > 0 && stageH > 0) {
    hasFitOnce = true;
    fit();
    return;
  }
  clampPan();
}

export function fit(): void {
  cancelViewAnim();
  view.zoom = clamp(fitZoom(view.stageW, view.stageH), ZOOM_MIN, ZOOM_MAX);
  view.panX = (view.stageW - WORLD_WIDTH * view.zoom) / 2;
  view.panY = (view.stageH - WORLD_HEIGHT * view.zoom) / 2;
}

export function setZoomTo(newZoom: number): void {
  setZoomAtPoint(newZoom, view.stageW / 2, view.stageH / 2);
}

export function setZoomAtPoint(newZoom: number, cssX: number, cssY: number): void {
  cancelViewAnim();
  const z = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);
  if (z === view.zoom) return;
  const worldX = (cssX - view.panX) / view.zoom;
  const worldY = (cssY - view.panY) / view.zoom;
  view.zoom = z;
  view.panX = cssX - worldX * z;
  view.panY = cssY - worldY * z;
  clampPan();
}

export function panBy(dx: number, dy: number): void {
  cancelViewAnim();
  view.panX += dx;
  view.panY += dy;
}

export function centerOnTile(tileX: number, tileY: number): void {
  if (view.stageW <= 0 || view.stageH <= 0) return;
  const worldX = (tileX + 0.5) * TILE_PIXEL_SIZE * view.zoom;
  const worldY = (tileY + 0.5) * TILE_PIXEL_SIZE * view.zoom;
  view.panX = view.stageW / 2 - worldX;
  view.panY = view.stageH / 2 - worldY;
  clampPan();
}

type ViewAnim = {
  startTime: number;
  duration: number;
  startZoom: number;
  startPanX: number;
  startPanY: number;
  targetZoom: number;
  targetPanX: number;
  targetPanY: number;
  raf: number | null;
};

let activeAnim: ViewAnim | null = null;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cancelViewAnim(): void {
  if (activeAnim?.raf != null) cancelAnimationFrame(activeAnim.raf);
  activeAnim = null;
}

function panForCenter(tileX: number, tileY: number, zoom: number): { x: number; y: number } {
  const worldX = (tileX + 0.5) * TILE_PIXEL_SIZE * zoom;
  const worldY = (tileY + 0.5) * TILE_PIXEL_SIZE * zoom;
  return { x: view.stageW / 2 - worldX, y: view.stageH / 2 - worldY };
}

function startViewAnim(
  targetZoom: number,
  targetPanX: number,
  targetPanY: number,
  duration: number,
): void {
  if (typeof requestAnimationFrame !== 'function') {
    view.zoom = targetZoom;
    view.panX = targetPanX;
    view.panY = targetPanY;
    clampPan();
    return;
  }
  cancelViewAnim();
  const z = clamp(targetZoom, ZOOM_MIN, ZOOM_MAX);
  const anim: ViewAnim = {
    startTime: performance.now(),
    duration,
    startZoom: view.zoom,
    startPanX: view.panX,
    startPanY: view.panY,
    targetZoom: z,
    targetPanX,
    targetPanY,
    raf: null,
  };
  activeAnim = anim;

  const tick = (): void => {
    if (activeAnim !== anim) return;
    const elapsed = performance.now() - anim.startTime;
    const t = Math.min(1, elapsed / anim.duration);
    const e = easeInOutCubic(t);
    view.zoom = anim.startZoom + (anim.targetZoom - anim.startZoom) * e;
    view.panX = anim.startPanX + (anim.targetPanX - anim.startPanX) * e;
    view.panY = anim.startPanY + (anim.targetPanY - anim.startPanY) * e;
    clampPan();
    if (t >= 1) {
      activeAnim = null;
      return;
    }
    anim.raf = requestAnimationFrame(tick);
  };
  anim.raf = requestAnimationFrame(tick);
}

export function smoothCenterOnTile(tileX: number, tileY: number, duration = 400): void {
  if (view.stageW <= 0 || view.stageH <= 0) return;
  const target = panForCenter(tileX, tileY, view.zoom);
  startViewAnim(view.zoom, target.x, target.y, duration);
}

export function smoothFitToCells(
  cells: ReadonlyArray<{ x: number; y: number }>,
  opts: { duration?: number; maxZoom?: number; minFill?: number; maxFill?: number } = {},
): void {
  if (view.stageW <= 0 || view.stageH <= 0 || cells.length === 0) return;
  const duration = opts.duration ?? 450;
  const maxZoom = opts.maxZoom ?? ZOOM_100 * 2;
  const minFill = opts.minFill ?? 0.5;
  const maxFill = opts.maxFill ?? 0.85;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }
  const w = (maxX - minX + 1) * TILE_PIXEL_SIZE;
  const h = (maxY - minY + 1) * TILE_PIXEL_SIZE;
  const cx = (minX + maxX + 1) / 2 - 0.5;
  const cy = (minY + maxY + 1) / 2 - 0.5;

  const fitMax = Math.min((view.stageW * maxFill) / w, (view.stageH * maxFill) / h);
  const fitMin = Math.min((view.stageW * minFill) / w, (view.stageH * minFill) / h);
  let targetZoom = view.zoom;
  if (view.zoom > fitMax) targetZoom = fitMax;
  else if (view.zoom < fitMin) targetZoom = Math.min(fitMin, maxZoom);
  targetZoom = clamp(targetZoom, ZOOM_MIN, maxZoom);

  const target = panForCenter(cx, cy, targetZoom);
  startViewAnim(targetZoom, target.x, target.y, duration);
}

export function clampPan(): void {
  const { stageW, stageH, zoom } = view;
  const worldPxW = WORLD_WIDTH * zoom;
  const worldPxH = WORLD_HEIGHT * zoom;
  const slackX = stageW * OVERPAN_FACTOR;
  const slackY = stageH * OVERPAN_FACTOR;
  const minX = stageW - worldPxW - slackX;
  const maxX = slackX;
  const minY = stageH - worldPxH - slackY;
  const maxY = slackY;
  view.panX = clamp(view.panX, Math.min(minX, maxX), Math.max(minX, maxX));
  view.panY = clamp(view.panY, Math.min(minY, maxY), Math.max(minY, maxY));
}

type TileCoord = {
  x: number;
  y: number;
  subX: number;
  subY: number;
};

export function tileFromClient(cssX: number, cssY: number): TileCoord {
  const worldX = (cssX - view.panX) / view.zoom;
  const worldY = (cssY - view.panY) / view.zoom;
  const tileX = worldX / TILE_PIXEL_SIZE;
  const tileY = worldY / TILE_PIXEL_SIZE;
  return {
    x: Math.floor(tileX),
    y: Math.floor(tileY),
    subX: tileX - Math.floor(tileX),
    subY: tileY - Math.floor(tileY),
  };
}
