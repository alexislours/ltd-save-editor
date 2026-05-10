import {
  compress as zstdCompress,
  decompress as zstdDecompress,
  init as zstdInit,
} from '@bokuweb/zstd-wasm';

import { actorDisplay, type ActorGroup } from '$lib/map/actors/actors';
import type { MapObjectRow } from '$lib/map/state/mapObjectsEditor.svelte';
import { TILE_DEFS, tileDefForHash } from '$lib/map/tiles/tiles';

const MAP_SHARE_MAGIC = 'LTDMAP';
const MAP_SHARE_VERSION = 1;
export const MAP_SHARE_EXT = '.ltdmap';

const ZSTD_LEVEL = 16;
const SHARE_WIDTH = 120;
const SHARE_HEIGHT = 80;
const SHARE_TILE_COUNT = SHARE_WIDTH * SHARE_HEIGHT;

const GRASS_HASH = 0xff4ae68a;
const UGC_TILE_HASH = 0x69fff2f1;

const KEEP_GROUPS: ReadonlySet<ActorGroup> = new Set<ActorGroup>(['deco', 'room', 'step']);

export type MapShareObject = {
  actor: number;
  x: number;
  y: number;
  rotY: number;
};

type MapShareTiles = {
  palette: string[];
  cells: number[];
};

type MapShareDoc = {
  magic: typeof MAP_SHARE_MAGIC;
  version: number;
  size: [number, number];
  tiles: MapShareTiles;
  objects: { items: MapShareObject[] } | null;
  meta: { exportedAt: string; appVersion: string };
};

export type EncodeInput = {
  tiles: readonly number[];
  objects: readonly MapObjectRow[] | null;
  appVersion: string;
};

export type DecodedShare = {
  doc: MapShareDoc;
  tiles: number[];
  objects: MapShareObject[] | null;
};

function codeForExportHash(hash: number): string {
  const h = hash >>> 0;
  if (h === UGC_TILE_HASH) return tileDefForHash(GRASS_HASH)!.code;
  const def = tileDefForHash(h);
  if (def && !def.internal) return def.code;
  return tileDefForHash(GRASS_HASH)!.code;
}

function hashForCode(code: string): number {
  for (const def of TILE_DEFS) {
    if (def.code === code) return def.hash >>> 0;
  }
  throw new Error(`Unknown tile code "${code}" in .ltdmap palette`);
}

function encodeJson(input: EncodeInput): MapShareDoc {
  if (input.tiles.length !== SHARE_TILE_COUNT) {
    throw new Error(`Expected ${SHARE_TILE_COUNT} tiles, got ${input.tiles.length}`);
  }

  const palette: string[] = [];
  const paletteIndex = new Map<string, number>();
  const cells = new Array<number>(SHARE_TILE_COUNT);

  for (let i = 0; i < SHARE_TILE_COUNT; i++) {
    const code = codeForExportHash(input.tiles[i]);
    let idx = paletteIndex.get(code);
    if (idx === undefined) {
      idx = palette.length;
      palette.push(code);
      paletteIndex.set(code, idx);
    }
    cells[i] = idx;
  }

  const objects = input.objects === null ? null : { items: filterObjects(input.objects) };

  return {
    magic: MAP_SHARE_MAGIC,
    version: MAP_SHARE_VERSION,
    size: [SHARE_WIDTH, SHARE_HEIGHT],
    tiles: { palette, cells },
    objects,
    meta: {
      exportedAt: new Date().toISOString(),
      appVersion: input.appVersion,
    },
  };
}

function filterObjects(rows: readonly MapObjectRow[]): MapShareObject[] {
  const out: MapShareObject[] = [];
  for (const r of rows) {
    if (r.actor >>> 0 === 0) continue;
    const grp = actorDisplay(r.actor).group;
    if (!KEEP_GROUPS.has(grp)) continue;
    out.push({ actor: r.actor >>> 0, x: r.x | 0, y: r.y | 0, rotY: Number(r.rot) || 0 });
  }
  return out;
}

function decodeJson(raw: unknown): DecodedShare {
  const doc = parseDoc(raw);

  const palette = doc.tiles.palette.map(hashForCode);
  const cells = doc.tiles.cells;
  if (cells.length !== SHARE_TILE_COUNT) {
    throw new Error(`Expected ${SHARE_TILE_COUNT} cells, got ${cells.length}`);
  }
  const tiles = new Array<number>(SHARE_TILE_COUNT);
  for (let i = 0; i < SHARE_TILE_COUNT; i++) {
    const idx = cells[i];
    if (idx < 0 || idx >= palette.length) {
      throw new Error(`Cell ${i} references palette index ${idx} (palette size ${palette.length})`);
    }
    tiles[i] = palette[idx];
  }

  const objects = doc.objects ? doc.objects.items.slice() : null;
  return { doc, tiles, objects };
}

function parseDoc(raw: unknown): MapShareDoc {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Not a valid .ltdmap document');
  }
  const o = raw as Record<string, unknown>;
  if (o.magic !== MAP_SHARE_MAGIC) {
    throw new Error(`Bad magic: expected "${MAP_SHARE_MAGIC}", got ${JSON.stringify(o.magic)}`);
  }
  if (typeof o.version !== 'number' || o.version !== MAP_SHARE_VERSION) {
    throw new Error(
      `Unsupported .ltdmap version ${String(o.version)} (expected ${MAP_SHARE_VERSION})`,
    );
  }
  if (!Array.isArray(o.size) || o.size.length !== 2) {
    throw new Error('Missing or malformed "size"');
  }
  const [w, h] = o.size as unknown[];
  if (w !== SHARE_WIDTH || h !== SHARE_HEIGHT) {
    throw new Error(
      `Unsupported map size ${String(w)}x${String(h)} (expected ${SHARE_WIDTH}x${SHARE_HEIGHT})`,
    );
  }

  const tiles = o.tiles as Record<string, unknown> | undefined;
  if (!tiles || !Array.isArray(tiles.palette) || !Array.isArray(tiles.cells)) {
    throw new Error('Missing or malformed "tiles"');
  }
  const palette = tiles.palette;
  for (const c of palette) {
    if (typeof c !== 'string') throw new Error('Palette entries must be strings');
  }
  const cells: number[] = [];
  for (const cell of tiles.cells) {
    if (typeof cell !== 'number') throw new Error('Cell entries must be numbers');
    cells.push(cell | 0);
  }

  let objects: MapShareDoc['objects'] = null;
  if (o.objects !== null && o.objects !== undefined) {
    const obj = o.objects as Record<string, unknown>;
    if (!Array.isArray(obj.items)) {
      throw new Error('Malformed "objects.items"');
    }
    const items: MapShareObject[] = [];
    for (const it of obj.items) {
      if (!it || typeof it !== 'object') {
        throw new Error('Each object must be an object');
      }
      const r = it as Record<string, unknown>;
      const actor = typeof r.actor === 'number' ? r.actor >>> 0 : NaN;
      const x = typeof r.x === 'number' ? r.x | 0 : NaN;
      const y = typeof r.y === 'number' ? r.y | 0 : NaN;
      const rotY = typeof r.rotY === 'number' ? r.rotY : NaN;
      if (
        !Number.isFinite(actor) ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(rotY)
      ) {
        throw new Error('Each object must have actor, x, y, rotY numbers');
      }
      items.push({ actor, x, y, rotY });
    }
    objects = { items };
  }

  const meta = o.meta as Record<string, unknown> | undefined;
  const exportedAt = typeof meta?.exportedAt === 'string' ? meta.exportedAt : '';
  const appVersion = typeof meta?.appVersion === 'string' ? meta.appVersion : '';

  return {
    magic: MAP_SHARE_MAGIC,
    version: MAP_SHARE_VERSION,
    size: [SHARE_WIDTH, SHARE_HEIGHT],
    tiles: { palette: palette as string[], cells },
    objects,
    meta: { exportedAt, appVersion },
  };
}

let zstdReady: Promise<void> | null = null;
function ensureZstd(): Promise<void> {
  if (!zstdReady) zstdReady = zstdInit();
  return zstdReady;
}

export async function encodeMapShareFile(input: EncodeInput): Promise<Uint8Array> {
  await ensureZstd();
  const doc = encodeJson(input);
  const json = new TextEncoder().encode(JSON.stringify(doc));
  return zstdCompress(json, ZSTD_LEVEL);
}

export async function decodeMapShareFile(bytes: Uint8Array): Promise<DecodedShare> {
  await ensureZstd();
  const json = zstdDecompress(bytes);
  const text = new TextDecoder().decode(json);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    throw new Error(
      `Not a valid .ltdmap file: JSON parse failed (${cause instanceof Error ? cause.message : String(cause)})`,
      { cause },
    );
  }
  return decodeJson(raw);
}

export function defaultMapShareFilename(): string {
  const ts = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
  return `map-${ts}${MAP_SHARE_EXT}`;
}
