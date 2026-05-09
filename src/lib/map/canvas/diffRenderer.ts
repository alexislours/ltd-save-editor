import { indexFromXY, MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';
import { FLOOR_TEXTURE_HEIGHT, FLOOR_TEXTURE_WIDTH } from './floorRenderer';
import { PATTERN_SIZE } from '../tiles/tilePatterns';

const BRAND_R = 0xf9;
const BRAND_G = 0x73;
const BRAND_B = 0x16;

function packRGBA(r: number, g: number, b: number, a: number): number {
  return (((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff)) >>> 0;
}

const TINT_PIXEL = packRGBA(BRAND_R, BRAND_G, BRAND_B, Math.round(0.35 * 255));
const STROKE_PIXEL = packRGBA(BRAND_R, BRAND_G, BRAND_B, 0xff);

export function renderDiff(
  target: ImageData,
  current: readonly number[],
  baseline: readonly number[],
): void {
  if (target.width !== FLOOR_TEXTURE_WIDTH || target.height !== FLOOR_TEXTURE_HEIGHT) {
    throw new Error(
      `renderDiff: target ImageData must be ${FLOOR_TEXTURE_WIDTH}x${FLOOR_TEXTURE_HEIGHT} (got ${target.width}x${target.height})`,
    );
  }
  const buf32 = new Uint32Array(target.data.buffer);
  buf32.fill(0);
  if (current.length !== baseline.length) return;

  const last = PATTERN_SIZE - 1;
  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      const idx = indexFromXY(tx, ty);
      const cv = current[idx] >>> 0;
      const bv = baseline[idx] >>> 0;
      if (cv === bv) continue;
      const baseX = tx * PATTERN_SIZE;
      const baseY = ty * PATTERN_SIZE;
      for (let sy = 0; sy < PATTERN_SIZE; sy++) {
        let dst = (baseY + sy) * FLOOR_TEXTURE_WIDTH + baseX;
        const edgeY = sy === 0 || sy === last;
        for (let sx = 0; sx < PATTERN_SIZE; sx++) {
          const edge = edgeY || sx === 0 || sx === last;
          buf32[dst++] = edge ? STROKE_PIXEL : TINT_PIXEL;
        }
      }
    }
  }
}
