import { indexFromXY, MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';
import { packColorRGBA } from '$lib/map/tiles/tiles';
import { getTilePattern, PATTERN_SIZE } from '../tiles/tilePatterns';

export const FLOOR_TEXTURE_WIDTH = MAP_WIDTH * PATTERN_SIZE;
export const FLOOR_TEXTURE_HEIGHT = MAP_HEIGHT * PATTERN_SIZE;

const EMPTY_FALLBACK = '#f3f4f6';

function readEmptyColor(): string {
  if (typeof document === 'undefined') return EMPTY_FALLBACK;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue('--map-canvas-empty')
    .trim();
  return v.startsWith('#') && (v.length === 7 || v.length === 4) ? v : EMPTY_FALLBACK;
}

type RenderFloorExtra = {
  tint?: ReadonlyMap<number, number>;
};

export function renderFloor(
  target: ImageData,
  tiles: readonly number[] | null,
  extra?: RenderFloorExtra,
): void {
  if (target.width !== FLOOR_TEXTURE_WIDTH || target.height !== FLOOR_TEXTURE_HEIGHT) {
    throw new Error(
      `renderFloor: target ImageData must be ${FLOOR_TEXTURE_WIDTH}x${FLOOR_TEXTURE_HEIGHT} (got ${target.width}x${target.height})`,
    );
  }
  const buf32 = new Uint32Array(target.data.buffer);
  if (!tiles) {
    buf32.fill(packColorRGBA(readEmptyColor()));
    return;
  }
  const tint = extra?.tint;
  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      const tileIndex = indexFromXY(tx, ty);
      const tinted = tint?.get(tileIndex);
      if (tinted !== undefined) {
        const baseX = tx * PATTERN_SIZE;
        const baseY = ty * PATTERN_SIZE;
        for (let sy = 0; sy < PATTERN_SIZE; sy++) {
          let dst = (baseY + sy) * FLOOR_TEXTURE_WIDTH + baseX;
          for (let sx = 0; sx < PATTERN_SIZE; sx++) {
            buf32[dst++] = tinted;
          }
        }
        continue;
      }
      const pattern = getTilePattern(tiles[tileIndex] >>> 0);
      const baseX = tx * PATTERN_SIZE;
      const baseY = ty * PATTERN_SIZE;
      for (let sy = 0; sy < PATTERN_SIZE; sy++) {
        let dst = (baseY + sy) * FLOOR_TEXTURE_WIDTH + baseX;
        for (let sx = 0; sx < PATTERN_SIZE; sx++) {
          buf32[dst++] = pattern[(sx << 2) | sy];
        }
      }
    }
  }
}
