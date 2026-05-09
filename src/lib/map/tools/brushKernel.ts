export type BrushSize = number;
export type BrushShape = 'square' | 'diamond' | 'circle';

export const BRUSH_SIZE_MIN = 1;
export const BRUSH_SIZE_MAX = 50;

const cache = new Map<string, Int16Array>();

function build(size: BrushSize, shape: BrushShape): Int16Array {
  if (size <= 1) return Int16Array.of(0, 0);
  if (size === 2) return Int16Array.of(0, 0, 1, 0, 0, 1, 1, 1);
  const offsets: number[] = [];
  const low = -((size - 1) >> 1);
  const high = low + size - 1;
  const cx = (low + high) / 2;
  const cy = cx;
  const r = (size - 1) / 2;
  const circleThreshold = r * r + r / 2;
  for (let dy = low; dy <= high; dy++) {
    for (let dx = low; dx <= high; dx++) {
      const px = dx - cx;
      const py = dy - cy;
      const include =
        shape === 'square'
          ? true
          : shape === 'diamond'
            ? Math.abs(px) + Math.abs(py) <= r
            : px * px + py * py <= circleThreshold;
      if (include) offsets.push(dx, dy);
    }
  }
  return Int16Array.from(offsets);
}

export function clampBrushSize(size: number): BrushSize {
  const n = Math.round(size);
  if (!Number.isFinite(n)) return BRUSH_SIZE_MIN;
  if (n < BRUSH_SIZE_MIN) return BRUSH_SIZE_MIN;
  if (n > BRUSH_SIZE_MAX) return BRUSH_SIZE_MAX;
  return n;
}

export function kernelOffsets(size: BrushSize, shape: BrushShape): Int16Array {
  const key = `${size}:${shape}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const built = build(size, shape);
  cache.set(key, built);
  return built;
}
