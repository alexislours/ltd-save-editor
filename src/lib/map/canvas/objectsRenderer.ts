import {
  actorDisplay,
  emptyFootprintRect,
  footprintRect,
  isFenceActor,
  rotateActorFootprint,
  type FootprintRect,
} from '$lib/map/actors/actors';
import { ACTOR_FOOTPRINT, DEFAULT_FOOTPRINT } from '$lib/map/actors/generatedActorNames';
import {
  rowFootprintRectInto,
  ugcBaseFootprint,
  ugcSlotForRow,
} from '$lib/map/actors/ugcDimensions.svelte';
import { getUgcObjectBitmap } from '$lib/map/state/ugcObjectTextures.svelte';
import type { MapObjectRow } from '$lib/map/state/mapObjectsEditor.svelte';
import { TILE_PIXEL_SIZE } from '../state/viewTransform.svelte';

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
  dpr: number;
};

const SELECTED_STROKE = 'rgba(249, 115, 22, 1)';
const SELECTED_FILL = 'rgba(249, 115, 22, 0.4)';
const FENCE_FILL = '#7c4a1e';
const FENCE_STROKE = 'rgba(0,0,0,0.6)';

function quarterTurns(rotDeg: number): number {
  if (!Number.isFinite(rotDeg)) return 0;
  return ((Math.round(rotDeg / 90) % 4) + 4) % 4;
}

export function renderObjects(
  ctx: CanvasRenderingContext2D,
  view: ViewLike,
  rows: readonly MapObjectRow[],
  opacity: number,
  selected?: ReadonlySet<number>,
): void {
  if (opacity <= 0) return;

  const dpr = view.dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;

  const tileSize = view.zoom * TILE_PIXEL_SIZE;

  type Prepared = {
    row: MapObjectRow;
    fp: FootprintRect;
    slot: ReturnType<typeof ugcSlotForRow>;
    color: string;
    category: string;
    area: number;
  };
  const prepared: Prepared[] = [];
  for (const row of rows) {
    if (isFenceActor(row.actor)) continue;
    const slot = ugcSlotForRow(row.actor, row.ugcId, row.ugcExteriorId);
    const fp = slot
      ? rotateActorFootprint(ugcBaseFootprint(slot), row.rot)
      : footprintRect(row.actor, row.rot);
    const display = actorDisplay(row.actor);
    prepared.push({
      row,
      fp,
      slot,
      color: display.color,
      category: display.category,
      area: fp.w * fp.h,
    });
  }
  prepared.sort((a, b) => b.area - a.area);
  const highlights: Array<{ rx: number; ry: number; rw: number; rh: number }> = [];

  for (const entry of prepared) {
    const { row, fp, slot, color, category } = entry;
    if (row.x < 0 || row.y < 0) continue;

    const rx = view.panX + (row.x + fp.x0) * tileSize;
    const ry = view.panY + (row.y + fp.y0) * tileSize;
    const rw = fp.w * tileSize;
    const rh = fp.h * tileSize;

    if (rx + rw < 0 || ry + rh < 0 || rx > view.stageW || ry > view.stageH) continue;

    const bitmap = slot
      ? getUgcObjectBitmap(category === 'MapObject_Ugc_House' ? 'Exterior' : 'MapObject', slot.slot)
      : null;

    if (bitmap && slot) {
      ctx.imageSmoothingEnabled = false;
      const base = ugcBaseFootprint(slot);
      const ax = view.panX + (row.x + 0.5) * tileSize;
      const ay = view.panY + (row.y + 0.5) * tileSize;
      const offsetX = (base.x0 - 0.5) * tileSize;
      const offsetY = (base.y0 - 0.5) * tileSize;
      const drawW = base.w * tileSize;
      const drawH = base.h * tileSize;
      const t = quarterTurns(row.rot);
      ctx.save();
      ctx.translate(ax, ay);
      if (t !== 0) ctx.rotate((-t * Math.PI) / 2);
      ctx.drawImage(bitmap, offsetX, offsetY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(rx, ry, rw, rh);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

    if ((fp.w > 1 || fp.h > 1) && fp.goalX != null && fp.goalY != null) {
      const gx = row.x + fp.goalX;
      const gy = row.y + fp.goalY;
      const gcx = view.panX + gx * tileSize;
      const gcy = view.panY + gy * tileSize;
      const onLeft = fp.goalX === fp.x0;
      const onRight = fp.goalX === fp.x0 + fp.w - 1;
      const onTop = fp.goalY === fp.y0;
      const onBottom = fp.goalY === fp.y0 + fp.h - 1;
      const cxRect = row.x + fp.x0 + fp.w / 2;
      const cyRect = row.y + fp.y0 + fp.h / 2;
      const dx = gx + 0.5 - cxRect;
      const dy = gy + 0.5 - cyRect;
      let vertical: boolean;
      if (onLeft || onRight) vertical = !(onTop || onBottom) || Math.abs(dx) >= Math.abs(dy);
      else if (onTop || onBottom) vertical = false;
      else vertical = Math.abs(dx) >= Math.abs(dy);
      ctx.lineWidth = Math.max(2, tileSize * 0.25);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      if (vertical) {
        const edgeX = onRight ? gcx + tileSize : onLeft ? gcx : dx >= 0 ? gcx + tileSize : gcx;
        ctx.moveTo(edgeX, gcy + tileSize * 0.15);
        ctx.lineTo(edgeX, gcy + tileSize * 0.85);
      } else {
        const edgeY = onBottom ? gcy + tileSize : onTop ? gcy : dy >= 0 ? gcy + tileSize : gcy;
        ctx.moveTo(gcx + tileSize * 0.15, edgeY);
        ctx.lineTo(gcx + tileSize * 0.85, edgeY);
      }
      ctx.stroke();
    }

    const ax = view.panX + row.x * tileSize + tileSize / 2;
    const ay = view.panY + row.y * tileSize + tileSize / 2;
    ctx.beginPath();
    ctx.arc(ax, ay, Math.max(1.5, tileSize * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fill();

    if (selected && selected.has(row.index)) {
      highlights.push({ rx, ry, rw, rh });
    }
  }

  if (highlights.length > 0) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = SELECTED_FILL;
    for (const h of highlights) ctx.fillRect(h.rx, h.ry, h.rw, h.rh);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = SELECTED_STROKE;
    for (const h of highlights) {
      ctx.strokeRect(h.rx + 0.75, h.ry + 0.75, h.rw - 1.5, h.rh - 1.5);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

export function renderFences(
  ctx: CanvasRenderingContext2D,
  view: ViewLike,
  rows: readonly MapObjectRow[],
  opacity: number,
  selected?: ReadonlySet<number>,
): void {
  if (opacity <= 0) return;

  const dpr = view.dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;

  const tileSize = view.zoom * TILE_PIXEL_SIZE;
  const highlights: Array<{ rx: number; ry: number; rw: number; rh: number }> = [];
  const fp = emptyFootprintRect();

  for (const row of rows) {
    if (row.x < 0 || row.y < 0) continue;
    if (!isFenceActor(row.actor)) continue;
    rowFootprintRectInto(row, fp);

    const rx = view.panX + (row.x + fp.x0) * tileSize;
    const ry = view.panY + (row.y + fp.y0) * tileSize;
    const rw = fp.w * tileSize;
    const rh = fp.h * tileSize;

    if (rx + rw < 0 || ry + rh < 0 || rx > view.stageW || ry > view.stageH) continue;

    const t = quarterTurns(row.rot);
    const raw = ACTOR_FOOTPRINT.get(row.actor >>> 0) ?? DEFAULT_FOOTPRINT;
    const horizontal = raw.w >= raw.h ? t % 2 === 0 : t % 2 === 1;
    const thickness = Math.max(2, tileSize * 0.18);
    let bx: number, by: number, bw: number, bh: number;
    if (horizontal) {
      bw = rw;
      bh = thickness;
      bx = rx;
      by = t === 2 ? ry : ry + rh - thickness;
    } else {
      bw = thickness;
      bh = rh;
      by = ry;
      bx = t === 3 ? rx : rx + rw - thickness;
    }
    ctx.fillStyle = FENCE_FILL;
    ctx.fillRect(bx, by, bw, bh);
    ctx.lineWidth = 1;
    ctx.strokeStyle = FENCE_STROKE;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    if (selected && selected.has(row.index)) {
      highlights.push({ rx, ry, rw, rh });
    }
  }

  if (highlights.length > 0) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = SELECTED_FILL;
    for (const h of highlights) ctx.fillRect(h.rx, h.ry, h.rw, h.rh);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = SELECTED_STROKE;
    for (const h of highlights) {
      ctx.strokeRect(h.rx + 0.75, h.ry + 0.75, h.rw - 1.5, h.rh - 1.5);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
