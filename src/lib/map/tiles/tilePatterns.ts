import { tileDefForHash } from '$lib/map/tiles/tiles';

export const PATTERN_SIZE = 4;
const PATTERN_LEN = PATTERN_SIZE * PATTERN_SIZE;

const cache = new Map<string, Uint32Array>();
let satBoost = 0;

function readSatBoost(): number {
  if (typeof document === 'undefined') return 0;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--map-tile-sat-boost');
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

export function refreshTilePatternSaturation(): boolean {
  const next = readSatBoost();
  if (next === satBoost) return false;
  satBoost = next;
  cache.clear();
  return true;
}

type Family = 'grass' | 'sand' | 'wood' | 'road' | 'stone' | 'snow' | 'solid';

const BASE_FAMILY: Record<string, Family> = {
  Grass: 'grass',
  Clover: 'grass',
  CherryBlossom: 'grass',
  FallenLeaves: 'grass',
  Seaside: 'grass',
  Sand: 'sand',
  Beach: 'sand',
  Pebble: 'sand',
  Soil: 'sand',
  Wood: 'wood',
  Stone: 'stone',
  Cobblestone: 'stone',
  Archstone: 'stone',
  Concrete: 'stone',
  Asphalt: 'stone',
  Iron: 'stone',
  Gold: 'stone',
  Tile: 'stone',
  Snow: 'snow',
};

function familyFromCode(code: string | undefined): Family {
  if (!code) return 'solid';
  const isRoad = code.endsWith('_Road');
  const base = isRoad ? code.slice(0, -'_Road'.length) : code;
  const fam = BASE_FAMILY[base];
  if (isRoad) return 'road';
  return fam ?? 'solid';
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function clamp8(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

function packRgb(r: number, g: number, b: number): number {
  return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function shade(rgb: [number, number, number], delta: number): number {
  return packRgb(clamp8(rgb[0] + delta), clamp8(rgb[1] + delta), clamp8(rgb[2] + delta));
}

const idx = (x: number, y: number): number => ((x & 3) << 2) | (y & 3);

function emit(template: readonly number[], shades: readonly number[]): Uint32Array {
  const out = new Uint32Array(PATTERN_LEN);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      out[idx(x, y)] = shades[template[y * 4 + x]];
    }
  }
  return out;
}

const GRASS_TEMPLATE = [0, 1, 0, 2, 1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1];

const SAND_TEMPLATE = [0, 1, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 2, 0];

const WOOD_TEMPLATE = [0, 1, 0, 0, 0, 1, 0, 0, 2, 2, 2, 2, 0, 0, 0, 1];

const ROAD_TEMPLATE = [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1];

const STONE_TEMPLATE = [0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0];

const SNOW_TEMPLATE = [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hueToChannel(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hueToChannel(p, q, h + 1 / 3) * 255),
    Math.round(hueToChannel(p, q, h) * 255),
    Math.round(hueToChannel(p, q, h - 1 / 3) * 255),
  ];
}

function applySatBoost(rgb: [number, number, number]): [number, number, number] {
  if (satBoost <= 0) return rgb;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const boosted = Math.min(1, s + satBoost);
  if (boosted === s) return rgb;
  return hslToRgb(h, boosted, l);
}

function build(hash: number): Uint32Array {
  const def = tileDefForHash(hash);
  const color = def?.color ?? '#FF00FF';
  const rgb = applySatBoost(hexToRgb(color));
  const family = familyFromCode(def?.code);
  const base = packRgb(rgb[0], rgb[1], rgb[2]);

  switch (family) {
    case 'grass':
      return emit(GRASS_TEMPLATE, [base, shade(rgb, -22), shade(rgb, +18)]);
    case 'sand':
      return emit(SAND_TEMPLATE, [base, shade(rgb, -18), shade(rgb, +18)]);
    case 'wood':
      return emit(WOOD_TEMPLATE, [base, shade(rgb, -22), shade(rgb, -38)]);
    case 'road':
      return emit(ROAD_TEMPLATE, [base, shade(rgb, -16)]);
    case 'stone':
      return emit(STONE_TEMPLATE, [base, shade(rgb, -14), shade(rgb, +10)]);
    case 'snow':
      return emit(SNOW_TEMPLATE, [base, shade(rgb, -10)]);
    case 'solid':
    default: {
      const out = new Uint32Array(PATTERN_LEN);
      out.fill(base);
      return out;
    }
  }
}

export function getTilePattern(hash: number): Uint32Array {
  const key = `${(hash >>> 0).toString(16)}@${satBoost}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const built = build(hash >>> 0);
  cache.set(key, built);
  return built;
}
