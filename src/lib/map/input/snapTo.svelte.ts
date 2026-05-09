import { rowFootprintRect } from '$lib/map/actors/ugcDimensions.svelte';
import { getRow } from '$lib/map/state/mapObjectsEditor.svelte';
import {
  smoothCenterOnTile,
  smoothFitToCells,
  TILE_PIXEL_SIZE,
} from '../state/viewTransform.svelte';
import { set as setSelection } from '../tools/selection.svelte';

type Cell = { x: number; y: number };

const FLASH_DURATION_MS = 1000;

type FlashState = {
  rev: number;
  cells: Cell[];
  startedAt: number;
};

export const flashState = $state<FlashState>({
  rev: 0,
  cells: [],
  startedAt: 0,
});

let flashRaf: number | null = null;

function bumpFlash(): void {
  flashState.rev = (flashState.rev + 1) | 0;
}

export function resetFlash(): void {
  if (flashRaf != null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(flashRaf);
  }
  flashRaf = null;
  flashState.cells = [];
  flashState.startedAt = 0;
  bumpFlash();
}

function startFlash(cells: Cell[]): void {
  if (cells.length === 0) return;
  flashState.cells = cells;
  flashState.startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  bumpFlash();

  if (typeof requestAnimationFrame !== 'function') return;

  if (flashRaf != null) cancelAnimationFrame(flashRaf);

  const tick = (): void => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - flashState.startedAt;
    if (elapsed >= FLASH_DURATION_MS) {
      flashState.cells = [];
      flashRaf = null;
      bumpFlash();
      return;
    }
    bumpFlash();
    flashRaf = requestAnimationFrame(tick);
  };
  flashRaf = requestAnimationFrame(tick);
}

export function snapToTile(x: number, y: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  smoothCenterOnTile(x, y);
  startFlash([{ x: x | 0, y: y | 0 }]);
}

export function snapToCells(cells: readonly Cell[]): void {
  if (cells.length === 0) return;
  const intCells = cells.map((c) => ({ x: c.x | 0, y: c.y | 0 }));
  smoothFitToCells(intCells);
  startFlash(intCells);
}

export function snapToObject(index: number): void {
  const r = getRow(index);
  if (!r) return;
  setSelection([index]);
  const fp = rowFootprintRect(r);
  const cells: Cell[] = [];
  for (let dy = 0; dy < fp.h; dy++) {
    for (let dx = 0; dx < fp.w; dx++) {
      cells.push({ x: r.x + fp.x0 + dx, y: r.y + fp.y0 + dy });
    }
  }
  smoothFitToCells(cells);
  startFlash(cells);
}

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
};

function flashProgress(): number {
  if (flashState.cells.length === 0) return -1;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const elapsed = now - flashState.startedAt;
  if (elapsed >= FLASH_DURATION_MS) return -1;
  return elapsed / FLASH_DURATION_MS;
}

export function renderFlash(ctx: CanvasRenderingContext2D, view: ViewLike): void {
  const t = flashProgress();
  if (t < 0) return;
  const envelope = Math.sin(Math.PI * t);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const tileSize = view.zoom * TILE_PIXEL_SIZE;
  const baseWidth = Math.max(1.5, tileSize * 0.12);
  ctx.lineWidth = baseWidth * (1 + envelope * 0.4);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(249, 115, 22, ${0.55 * envelope})`;
  ctx.fillStyle = `rgba(249, 115, 22, ${0.18 * envelope})`;
  for (const c of flashState.cells) {
    const px = view.panX + c.x * tileSize;
    const py = view.panY + c.y * tileSize;
    ctx.fillRect(px, py, tileSize, tileSize);
    ctx.strokeRect(px, py, tileSize, tileSize);
  }
  ctx.restore();
}
