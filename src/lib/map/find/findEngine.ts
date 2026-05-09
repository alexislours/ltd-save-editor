import { actorDisplay, type ActorGroup } from '$lib/map/actors/actors';
import { rowFootprintRect } from '$lib/map/actors/ugcDimensions.svelte';
import { MAP_HEIGHT, MAP_WIDTH, UGC_NONE } from '$lib/map/state/mapEditor.svelte';
import { tileDefForHash, tileLabelForHash } from '$lib/map/tiles/tiles';
import { hexU32 } from '$lib/sav/format';
import { score as fuzzyScore } from './fuzzy';

type Cell = { x: number; y: number };

export type FindObject = {
  index: number;
  actor: number;
  x: number;
  y: number;
  rot: number;
  link: number;
  ugcExt: number;
  ugcId: number;
};

export type FindResult =
  | {
      kind: 'tile';
      hash: number;
      label: string;
      cellCount: number;
      sampleCell: Cell;
      cells: Cell[];
    }
  | {
      kind: 'actor';
      actorKey: number;
      label: string;
      group: ActorGroup;
      placements: number[];
    }
  | {
      kind: 'unknown-tile';
      hash: number;
      cellCount: number;
      sampleCell: Cell;
      cells: Cell[];
    }
  | { kind: 'unknown-actor'; hash: number; placements: number[] }
  | { kind: 'link'; mapId: number; placements: number[] }
  | {
      kind: 'ugc';
      index: number;
      cellCount: number;
      objectIndices: number[];
      sampleCell: Cell;
      cells: Cell[];
    };

export type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'text'; frag: string }
  | { kind: 'tile'; frag: string }
  | { kind: 'actor'; frag: string }
  | { kind: 'unknown' }
  | { kind: 'link'; mapId: number }
  | { kind: 'ugc'; index: number | null };

export type Translator = (key: string) => string;

export type FindInput = {
  rows: ReadonlyArray<FindObject>;
  tiles: ReadonlyArray<number> | null;
  ugcCells: ReadonlyArray<number> | null;
  translator: Translator;
  tilesRev?: number;
  rowsRev?: number;
};

const PREFIXES = ['tile', 'actor', 'unknown', 'link', 'ugc'] as const;
type Prefix = (typeof PREFIXES)[number];

function isPrefix(s: string): s is Prefix {
  return (PREFIXES as readonly string[]).includes(s);
}

export function parseQuery(input: string): ParsedQuery {
  const raw = input.trim();
  if (raw === '') return { kind: 'empty' };
  const colon = raw.indexOf(':');
  if (colon < 0) return { kind: 'text', frag: raw.toLowerCase() };
  const prefix = raw.slice(0, colon).trim().toLowerCase();
  const rest = raw.slice(colon + 1).trim();
  if (!isPrefix(prefix)) return { kind: 'text', frag: raw.toLowerCase() };
  switch (prefix) {
    case 'tile':
      return { kind: 'tile', frag: rest.toLowerCase() };
    case 'actor':
      return { kind: 'actor', frag: rest.toLowerCase() };
    case 'unknown':
      return { kind: 'unknown' };
    case 'link': {
      const id = parseInt(rest, 10);
      return { kind: 'link', mapId: Number.isFinite(id) ? id : NaN };
    }
    case 'ugc': {
      if (rest === '') return { kind: 'ugc', index: null };
      const idx = parseInt(rest, 10);
      return { kind: 'ugc', index: Number.isFinite(idx) ? idx : null };
    }
  }
}

type TileBucket = {
  cells: Cell[];
  sumX: number;
  sumY: number;
  def: ReturnType<typeof tileDefForHash>;
};

function computeTileBuckets(tiles: ReadonlyArray<number>): Map<number, TileBucket> {
  const out = new Map<number, TileBucket>();
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const h = tiles[x * MAP_HEIGHT + y] >>> 0;
      let b = out.get(h);
      if (!b) {
        b = { cells: [], sumX: 0, sumY: 0, def: tileDefForHash(h) };
        out.set(h, b);
      }
      b.cells.push({ x, y });
      b.sumX += x;
      b.sumY += y;
    }
  }
  return out;
}

let tileBucketCache: {
  ref: ReadonlyArray<number>;
  rev: number;
  buckets: Map<number, TileBucket>;
} | null = null;

function bucketTiles(
  tiles: ReadonlyArray<number>,
  rev: number | undefined,
): Map<number, TileBucket> {
  if (
    rev != null &&
    tileBucketCache &&
    tileBucketCache.ref === tiles &&
    tileBucketCache.rev === rev
  ) {
    return tileBucketCache.buckets;
  }
  const buckets = computeTileBuckets(tiles);
  if (rev != null) tileBucketCache = { ref: tiles, rev, buckets };
  else tileBucketCache = null;
  return buckets;
}

function tileResults(
  buckets: Map<number, TileBucket>,
  frag: string,
  t: Translator,
  includeKnown: boolean,
  includeUnknown: boolean,
): FindResult[] {
  const out: FindResult[] = [];
  for (const [hash, b] of buckets) {
    const known = b.def != null;
    if (known && !includeKnown) continue;
    if (!known && !includeUnknown) continue;
    if (known) {
      const label = tileLabelForHash(hash, t);
      const code = b.def?.code ?? '';
      if (frag !== '') {
        const hit = label.toLowerCase().includes(frag) || code.toLowerCase().includes(frag);
        if (!hit) continue;
      }
      out.push({
        kind: 'tile',
        hash,
        label,
        cellCount: b.cells.length,
        sampleCell: b.cells[0],
        cells: b.cells,
      });
    } else {
      const label = hexU32(hash);
      if (frag !== '' && !label.toLowerCase().includes(frag)) continue;
      out.push({
        kind: 'unknown-tile',
        hash,
        cellCount: b.cells.length,
        sampleCell: b.cells[0],
        cells: b.cells,
      });
    }
  }
  out.sort((a, b) => cellCountOf(b) - cellCountOf(a));
  return out;
}

function cellCountOf(r: FindResult): number {
  if (r.kind === 'tile' || r.kind === 'unknown-tile' || r.kind === 'ugc') return r.cellCount;
  return 0;
}

type ActorBucket = {
  actorKey: number;
  label: string;
  group: ActorGroup;
  key: string;
  placements: number[];
  knownActor: boolean;
};

function computeActorBuckets(rows: ReadonlyArray<FindObject>): Map<number, ActorBucket> {
  const out = new Map<number, ActorBucket>();
  for (const r of rows) {
    const d = actorDisplay(r.actor);
    let b = out.get(r.actor);
    if (!b) {
      b = {
        actorKey: r.actor,
        label: d.label,
        group: d.group,
        key: d.key,
        placements: [],
        knownActor: d.group !== 'unknown',
      };
      out.set(r.actor, b);
    }
    b.placements.push(r.index);
  }
  return out;
}

let actorBucketCache: {
  ref: ReadonlyArray<FindObject>;
  rev: number;
  buckets: Map<number, ActorBucket>;
} | null = null;

function bucketActors(
  rows: ReadonlyArray<FindObject>,
  rev: number | undefined,
): Map<number, ActorBucket> {
  if (
    rev != null &&
    actorBucketCache &&
    actorBucketCache.ref === rows &&
    actorBucketCache.rev === rev
  ) {
    return actorBucketCache.buckets;
  }
  const buckets = computeActorBuckets(rows);
  if (rev != null) actorBucketCache = { ref: rows, rev, buckets };
  else actorBucketCache = null;
  return buckets;
}

function actorResults(
  buckets: Map<number, ActorBucket>,
  frag: string,
  includeKnown: boolean,
  includeUnknown: boolean,
): FindResult[] {
  const out: FindResult[] = [];
  for (const [, b] of buckets) {
    if (b.knownActor && !includeKnown) continue;
    if (!b.knownActor && !includeUnknown) continue;
    if (b.knownActor) {
      if (frag !== '') {
        const hit = b.label.toLowerCase().includes(frag) || b.key.toLowerCase().includes(frag);
        if (!hit) continue;
      }
      out.push({
        kind: 'actor',
        actorKey: b.actorKey,
        label: b.label,
        group: b.group,
        placements: b.placements.slice().sort((x, y) => x - y),
      });
    } else {
      const hex = hexU32(b.actorKey);
      if (frag !== '' && !hex.toLowerCase().includes(frag)) continue;
      out.push({
        kind: 'unknown-actor',
        hash: b.actorKey,
        placements: b.placements.slice().sort((x, y) => x - y),
      });
    }
  }
  out.sort((a, b) => placementCount(b) - placementCount(a));
  return out;
}

function placementCount(r: FindResult): number {
  if (r.kind === 'actor' || r.kind === 'unknown-actor' || r.kind === 'link') {
    return r.placements.length;
  }
  return 0;
}

function runText(frag: string, input: FindInput): FindResult[] {
  const tileBuckets = input.tiles
    ? bucketTiles(input.tiles, input.tilesRev)
    : new Map<number, TileBucket>();
  const actorBuckets = bucketActors(input.rows, input.rowsRev);

  type TileRow = Extract<FindResult, { kind: 'tile' }>;
  type ActorRow = Extract<FindResult, { kind: 'actor' }>;

  const tileScored: Array<{ row: TileRow; s: number }> = [];
  for (const [hash, b] of tileBuckets) {
    if (b.def == null) continue;
    const label = tileLabelForHash(hash, input.translator);
    const code = b.def.code;
    const s = Math.max(fuzzyScore(frag, { text: label }), fuzzyScore(frag, { text: code }));
    if (s <= 0) continue;
    tileScored.push({
      s,
      row: {
        kind: 'tile',
        hash,
        label,
        cellCount: b.cells.length,
        sampleCell: b.cells[0],
        cells: b.cells,
      },
    });
  }
  tileScored.sort((a, b) => b.row.cellCount - a.row.cellCount || b.s - a.s);

  const actorScored: Array<{ row: ActorRow; s: number }> = [];
  for (const [, b] of actorBuckets) {
    if (!b.knownActor) continue;
    const s = Math.max(
      fuzzyScore(frag, { text: b.label, group: b.group }),
      fuzzyScore(frag, { text: b.key, group: b.group }),
    );
    if (s <= 0) continue;
    actorScored.push({
      s,
      row: {
        kind: 'actor',
        actorKey: b.actorKey,
        label: b.label,
        group: b.group,
        placements: b.placements.slice().sort((x, y) => x - y),
      },
    });
  }
  actorScored.sort((a, b) => b.row.placements.length - a.row.placements.length || b.s - a.s);

  return [...tileScored.map((s) => s.row), ...actorScored.map((s) => s.row)];
}

function runTile(frag: string, input: FindInput): FindResult[] {
  if (!input.tiles) return [];
  return tileResults(bucketTiles(input.tiles, input.tilesRev), frag, input.translator, true, false);
}

function runActor(frag: string, input: FindInput): FindResult[] {
  return actorResults(bucketActors(input.rows, input.rowsRev), frag, true, false);
}

function runUnknown(input: FindInput): FindResult[] {
  const tileBuckets = input.tiles
    ? bucketTiles(input.tiles, input.tilesRev)
    : new Map<number, TileBucket>();
  const actors = actorResults(bucketActors(input.rows, input.rowsRev), '', false, true);
  const tiles = tileResults(tileBuckets, '', input.translator, false, true);
  return [...tiles, ...actors];
}

function runLink(mapId: number, input: FindInput): FindResult[] {
  if (!Number.isFinite(mapId)) return [];
  const placements: number[] = [];
  for (const r of input.rows) {
    if (r.link === mapId) placements.push(r.index);
  }
  if (placements.length === 0) return [];
  return [
    {
      kind: 'link',
      mapId,
      placements: placements.sort((a, b) => a - b),
    },
  ];
}

type UgcBucket = {
  index: number;
  cells: Cell[];
  objectIndices: number[];
};

function runUgc(filter: number | null, input: FindInput): FindResult[] {
  const buckets = new Map<number, UgcBucket>();
  function bucket(idx: number): UgcBucket {
    let b = buckets.get(idx);
    if (!b) {
      b = { index: idx, cells: [], objectIndices: [] };
      buckets.set(idx, b);
    }
    return b;
  }

  if (input.ugcCells) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        const v = input.ugcCells[x * MAP_HEIGHT + y] | 0;
        if (v === UGC_NONE) continue;
        if (filter != null && v !== filter) continue;
        bucket(v).cells.push({ x, y });
      }
    }
  }

  for (const r of input.rows) {
    const ext = r.ugcExt | 0;
    const id = r.ugcId | 0;
    const candidates: number[] = [];
    if (ext !== UGC_NONE) candidates.push(ext);
    if (id !== UGC_NONE && id !== ext) candidates.push(id);
    for (const v of candidates) {
      if (filter != null && v !== filter) continue;
      bucket(v).objectIndices.push(r.index);
    }
  }

  const out: FindResult[] = [];
  for (const [, b] of buckets) {
    const sample = b.cells[0] ?? sampleCellFromObject(input.rows, b.objectIndices[0]);
    if (!sample) continue;
    out.push({
      kind: 'ugc',
      index: b.index,
      cellCount: b.cells.length,
      objectIndices: b.objectIndices.slice().sort((a, b) => a - b),
      sampleCell: sample,
      cells: b.cells,
    });
  }
  out.sort(
    (a, b) =>
      (b.kind === 'ugc' ? b.cellCount + b.objectIndices.length : 0) -
      (a.kind === 'ugc' ? a.cellCount + a.objectIndices.length : 0),
  );
  return out;
}

function sampleCellFromObject(
  rows: ReadonlyArray<FindObject>,
  index: number | undefined,
): Cell | null {
  if (index == null) return null;
  for (const r of rows) {
    if (r.index !== index) continue;
    const fp = rowFootprintRect({
      actor: r.actor,
      rot: r.rot,
      ugcId: r.ugcId,
      ugcExteriorId: r.ugcExt,
    });
    return { x: r.x + fp.x0, y: r.y + fp.y0 };
  }
  return null;
}

export function runQuery(q: ParsedQuery, input: FindInput): FindResult[] {
  switch (q.kind) {
    case 'empty':
      return [];
    case 'text':
      return runText(q.frag, input);
    case 'tile':
      return runTile(q.frag, input);
    case 'actor':
      return runActor(q.frag, input);
    case 'unknown':
      return runUnknown(input);
    case 'link':
      return runLink(q.mapId, input);
    case 'ugc':
      return runUgc(q.index, input);
  }
}

export function resultId(r: FindResult): string {
  switch (r.kind) {
    case 'tile':
      return `tile:${r.hash.toString(16)}`;
    case 'unknown-tile':
      return `unknown-tile:${r.hash.toString(16)}`;
    case 'actor':
      return `actor:${r.actorKey.toString(16)}`;
    case 'unknown-actor':
      return `unknown-actor:${r.hash.toString(16)}`;
    case 'link':
      return `link:${r.mapId}`;
    case 'ugc':
      return `ugc:${r.index}`;
  }
}
