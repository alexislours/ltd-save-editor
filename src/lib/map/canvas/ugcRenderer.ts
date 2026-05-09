import { indexFromXY, MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';
import { UGC_TIER_COLORS, UGC_TIER_COUNT } from '../state/ugcEditor.svelte';
import { getUgcFloorBitmap } from '../state/ugcFloorTextures.svelte';

export const UGC_TILE_PIXELS = 16;
export const UGC_TEXTURE_WIDTH = MAP_WIDTH * UGC_TILE_PIXELS;
export const UGC_TEXTURE_HEIGHT = MAP_HEIGHT * UGC_TILE_PIXELS;

const FALLBACK_ALPHA = 0.5;

function fallbackFillStyle(value: number): string {
  const tier = ((value % UGC_TIER_COUNT) + UGC_TIER_COUNT) % UGC_TIER_COUNT;
  const hex = UGC_TIER_COLORS[tier];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${FALLBACK_ALPHA})`;
}

export function renderUgc(ctx: CanvasRenderingContext2D, ugc: readonly number[] | null): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, UGC_TEXTURE_WIDTH, UGC_TEXTURE_HEIGHT);
  if (!ugc) return;
  ctx.imageSmoothingEnabled = false;

  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      const v = ugc[indexFromXY(tx, ty)] | 0;
      if (v < 0) continue;
      const dx = tx * UGC_TILE_PIXELS;
      const dy = ty * UGC_TILE_PIXELS;
      const bitmap = getUgcFloorBitmap(v);
      if (bitmap) {
        ctx.drawImage(bitmap, dx, dy, UGC_TILE_PIXELS, UGC_TILE_PIXELS);
      } else {
        ctx.fillStyle = fallbackFillStyle(v);
        ctx.fillRect(dx, dy, UGC_TILE_PIXELS, UGC_TILE_PIXELS);
      }
    }
  }
}
