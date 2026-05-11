export type BrushSize = number;
export type BrushRotation = 0 | 90 | 180 | 270;

export const BRUSH_SIZE_MIN = 1;
export const BRUSH_SIZE_MAX = 50;
export const BRUSH_ROTATIONS: readonly BrushRotation[] = [0, 90, 180, 270];
export const SHAPE_VIEWBOX = 24;

export type ShapeGeometry =
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    }
  | { readonly kind: 'polygon'; readonly points: readonly (readonly [number, number])[] }
  | { readonly kind: 'path'; readonly d: string; readonly fillRule?: 'evenodd' | 'nonzero' };

function regularPolygonVerts(
  sides: number,
  radius: number,
  cx: number,
  cy: number,
): readonly [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    verts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return verts;
}

function starPolygonVerts(
  points: number,
  outerR: number,
  innerR: number,
  cx: number,
  cy: number,
): readonly [number, number][] {
  const verts: [number, number][] = [];
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + i * step;
    verts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return verts;
}

const TRIANGLE_HEIGHT = (SHAPE_VIEWBOX * Math.sqrt(3)) / 2;
const TRIANGLE_APEX_Y = (SHAPE_VIEWBOX - TRIANGLE_HEIGHT) / 2;
const TRIANGLE_BASE_Y = TRIANGLE_APEX_Y + TRIANGLE_HEIGHT;

const SHAPE_LIST = [
  {
    id: 'square',
    labelKey: 'map.toolbar.shape_square_label',
    geometry: { kind: 'rect', x: 0, y: 0, w: 24, h: 24 },
  },
  {
    id: 'diamond',
    labelKey: 'map.toolbar.shape_diamond_label',
    geometry: {
      kind: 'polygon',
      points: [
        [12, 0],
        [24, 12],
        [12, 24],
        [0, 12],
      ],
    },
  },
  {
    id: 'circle',
    labelKey: 'map.toolbar.shape_circle_label',
    geometry: { kind: 'circle', cx: 12, cy: 12, r: 12 },
  },
  {
    id: 'ring',
    labelKey: 'map.toolbar.shape_ring_label',
    geometry: {
      kind: 'path',
      d: 'M 12 0 a 12 12 0 1 0 0.01 0 z M 12 6 a 6 6 0 1 1 -0.01 0 z',
      fillRule: 'evenodd',
    },
  },
  {
    id: 'star5',
    labelKey: 'map.toolbar.shape_star5_label',
    geometry: { kind: 'polygon', points: starPolygonVerts(5, 12, 5, 12, 12) },
  },
  {
    id: 'star6',
    labelKey: 'map.toolbar.shape_star6_label',
    geometry: { kind: 'polygon', points: starPolygonVerts(6, 12, 5, 12, 12) },
  },
  {
    id: 'hex',
    labelKey: 'map.toolbar.shape_hex_label',
    geometry: { kind: 'polygon', points: regularPolygonVerts(6, 12, 12, 12) },
  },
  {
    id: 'cross',
    labelKey: 'map.toolbar.shape_cross_label',
    geometry: {
      kind: 'path',
      d: 'M 8 0 h 8 v 8 h 8 v 8 h -8 v 8 h -8 v -8 h -8 v -8 h 8 z',
    },
  },
  {
    id: 'triangle',
    labelKey: 'map.toolbar.shape_triangle_label',
    geometry: {
      kind: 'polygon',
      points: [
        [12, TRIANGLE_APEX_Y],
        [24, TRIANGLE_BASE_Y],
        [0, TRIANGLE_BASE_Y],
      ],
    },
  },
  {
    id: 'heart',
    labelKey: 'map.toolbar.shape_heart_label',
    geometry: {
      kind: 'path',
      d: 'M 12 24 C 4 18 0 13 0 8 C 0 4 3 0 7 0 C 10 0 12 2 12 4 C 12 2 14 0 17 0 C 21 0 24 4 24 8 C 24 13 20 18 12 24 Z',
    },
  },
] as const satisfies readonly {
  id: string;
  labelKey: string;
  geometry: ShapeGeometry;
}[];

export type BrushShape = (typeof SHAPE_LIST)[number]['id'];

export const BRUSH_SHAPES = SHAPE_LIST.map(({ id, labelKey }) => ({ id, labelKey })) as readonly {
  readonly id: BrushShape;
  readonly labelKey: (typeof SHAPE_LIST)[number]['labelKey'];
}[];

export const SHAPE_GEOMETRY = Object.fromEntries(
  SHAPE_LIST.map((s) => [s.id, s.geometry]),
) as Record<BrushShape, ShapeGeometry>;

type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function applyGeometry(ctx: AnyCtx, g: ShapeGeometry): void {
  if (g.kind === 'circle') {
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (g.kind === 'rect') {
    ctx.beginPath();
    ctx.rect(g.x, g.y, g.w, g.h);
    ctx.fill();
    return;
  }
  if (g.kind === 'polygon') {
    ctx.beginPath();
    for (let i = 0; i < g.points.length; i++) {
      const [x, y] = g.points[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fill(new Path2D(g.d), g.fillRule ?? 'nonzero');
}

function rasterize(size: BrushSize, geometry: ShapeGeometry): Int16Array {
  if (size <= 1) return Int16Array.of(0, 0);
  if (size === 2) return Int16Array.of(0, 0, 1, 0, 0, 1, 1, 1);
  const ctx = new OffscreenCanvas(size, size).getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.scale(size / SHAPE_VIEWBOX, size / SHAPE_VIEWBOX);
  applyGeometry(ctx, geometry);
  const img = ctx.getImageData(0, 0, size, size);
  const lo = -((size - 1) >> 1);
  const out: number[] = [];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      if (img.data[(py * size + px) * 4 + 3] >= 128) out.push(lo + px, lo + py);
    }
  }
  return Int16Array.from(out);
}

function rotateOffsets(offsets: Int16Array, rotation: BrushRotation): Int16Array {
  if (rotation === 0) return offsets;
  const out = new Int16Array(offsets.length);
  for (let i = 0; i < offsets.length; i += 2) {
    const dx = offsets[i];
    const dy = offsets[i + 1];
    if (rotation === 90) {
      out[i] = -dy;
      out[i + 1] = dx;
    } else if (rotation === 180) {
      out[i] = -dx;
      out[i + 1] = -dy;
    } else {
      out[i] = dy;
      out[i + 1] = -dx;
    }
  }
  return out;
}

const baseCache = new Map<string, Int16Array>();
const rotatedCache = new Map<string, Int16Array>();

export function clampBrushSize(size: number): BrushSize {
  const n = Math.round(size);
  if (!Number.isFinite(n)) return BRUSH_SIZE_MIN;
  if (n < BRUSH_SIZE_MIN) return BRUSH_SIZE_MIN;
  if (n > BRUSH_SIZE_MAX) return BRUSH_SIZE_MAX;
  return n;
}

function baseOffsets(size: BrushSize, shape: BrushShape): Int16Array {
  const key = `${size}:${shape}`;
  const cached = baseCache.get(key);
  if (cached) return cached;
  const built = rasterize(size, SHAPE_GEOMETRY[shape]);
  baseCache.set(key, built);
  return built;
}

export function kernelOffsets(
  size: BrushSize,
  shape: BrushShape,
  rotation: BrushRotation = 0,
): Int16Array {
  const base = baseOffsets(size, shape);
  if (rotation === 0 || size <= 2) return base;
  const key = `${size}:${shape}:${rotation}`;
  const cached = rotatedCache.get(key);
  if (cached) return cached;
  const oriented = rotateOffsets(base, rotation);
  rotatedCache.set(key, oriented);
  return oriented;
}
