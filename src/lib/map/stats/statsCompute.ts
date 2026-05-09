import {
  actorDisplay,
  emptyFootprintRect,
  isFenceActor,
  type ActorGroup,
} from '$lib/map/actors/actors';
import { rowFootprintRectInto } from '$lib/map/actors/ugcDimensions.svelte';
import { MAP_HEIGHT, MAP_WIDTH } from '$lib/map/state/mapEditor.svelte';
import { type MapObjectRow } from '$lib/map/state/mapObjectsEditor.svelte';
import { tileColorForHash, tileDefForHash } from '$lib/map/tiles/tiles';
import { COLLISION_GRID_H, COLLISION_GRID_W, computeCollisions } from '../canvas/collisionOverlay';

type Cell = { x: number; y: number };

export type TileCoverageRow = {
  hash: number;
  code: string | null;
  color: string;
  count: number;
  percent: number;
  centroid: Cell;
  cells: Cell[];
};

type GroupCountRow = {
  group: ActorGroup;
  count: number;
};

export type ObjectCounts = {
  groups: GroupCountRow[];
  used: number;
  total: number;
  free: number;
};

type OobIssue = {
  kind: 'oob';
  id: string;
  index: number;
  actor: number;
  x: number;
  y: number;
};

export type OverlapIssue = {
  kind: 'overlap';
  id: string;
  cells: Cell[];
  indices: number[];
  centroid: Cell;
};

type UnknownActorIssue = {
  kind: 'unknown-actor';
  id: string;
  index: number;
  actor: number;
  x: number;
  y: number;
};

export type UnknownTileIssue = {
  kind: 'unknown-tile';
  id: string;
  hash: number;
  count: number;
  cells: Cell[];
  centroid: Cell;
};

export type IssueGroups = {
  oob: OobIssue[];
  overlaps: OverlapIssue[];
  unknownActors: UnknownActorIssue[];
  unknownTiles: UnknownTileIssue[];
  total: number;
};

const GROUP_ORDER: readonly ActorGroup[] = [
  'house',
  'facility',
  'deco',
  'step',
  'room',
  'ugc',
  'unknown',
];

const TILE_AREA = MAP_WIDTH * MAP_HEIGHT;

export function computeTileCoverage(tiles: ReadonlyArray<number>): TileCoverageRow[] {
  const counts = new Map<number, { count: number; sumX: number; sumY: number; cells: Cell[] }>();

  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const h = tiles[x * MAP_HEIGHT + y] >>> 0;
      let bucket = counts.get(h);
      if (!bucket) {
        bucket = { count: 0, sumX: 0, sumY: 0, cells: [] };
        counts.set(h, bucket);
      }
      bucket.count++;
      bucket.sumX += x;
      bucket.sumY += y;
      bucket.cells.push({ x, y });
    }
  }

  const result: TileCoverageRow[] = [];
  for (const [hash, bucket] of counts) {
    const def = tileDefForHash(hash);
    result.push({
      hash,
      code: def?.code ?? null,
      color: tileColorForHash(hash),
      count: bucket.count,
      percent: TILE_AREA > 0 ? bucket.count / TILE_AREA : 0,
      centroid: {
        x: Math.round(bucket.sumX / bucket.count),
        y: Math.round(bucket.sumY / bucket.count),
      },
      cells: bucket.cells,
    });
  }
  result.sort((a, b) => b.count - a.count);
  return result;
}

export function computeObjectCounts(
  rows: ReadonlyArray<MapObjectRow>,
  total: number,
): ObjectCounts {
  const counts = new Map<ActorGroup, number>();
  for (const g of GROUP_ORDER) counts.set(g, 0);
  let used = 0;
  for (const r of rows) {
    used++;
    const g = actorDisplay(r.actor).group;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const groups: GroupCountRow[] = GROUP_ORDER.map((group) => ({
    group,
    count: counts.get(group) ?? 0,
  })).filter((g) => g.count > 0);
  return {
    groups,
    used,
    total,
    free: Math.max(0, total - used),
  };
}

function clusterCells(cells: ReadonlyArray<Cell>): Cell[][] {
  if (cells.length === 0) return [];
  const set = new Set<number>();
  for (const c of cells) set.add(c.y * COLLISION_GRID_W + c.x);
  const visited = new Set<number>();
  const out: Cell[][] = [];
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const start of set) {
    if (visited.has(start)) continue;
    const cluster: Cell[] = [];
    const queue: number[] = [start];
    visited.add(start);
    while (queue.length > 0) {
      const k = queue.pop()!;
      const cx = k % COLLISION_GRID_W;
      const cy = (k / COLLISION_GRID_W) | 0;
      cluster.push({ x: cx, y: cy });
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLLISION_GRID_W || ny >= COLLISION_GRID_H) continue;
        const nk = ny * COLLISION_GRID_W + nx;
        if (set.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
    out.push(cluster);
  }
  return out;
}

function collectOverlapClusters(rows: ReadonlyArray<MapObjectRow>): OverlapIssue[] {
  const mask = computeCollisions(rows);
  const overlapCells: Cell[] = [];
  for (let y = 0; y < COLLISION_GRID_H; y++) {
    for (let x = 0; x < COLLISION_GRID_W; x++) {
      if (mask[y * COLLISION_GRID_W + x] >= 2) overlapCells.push({ x, y });
    }
  }
  if (overlapCells.length === 0) return [];

  const clusters = clusterCells(overlapCells);

  const indicesPerCluster = new Map<number, Set<number>>();
  for (let i = 0; i < clusters.length; i++) indicesPerCluster.set(i, new Set());

  const cellOwner = new Map<number, number>();
  for (let i = 0; i < clusters.length; i++) {
    for (const c of clusters[i]) cellOwner.set(c.y * COLLISION_GRID_W + c.x, i);
  }

  const fp = emptyFootprintRect();
  for (const r of rows) {
    if (r.x < 0 || r.y < 0) continue;
    if (isFenceActor(r.actor)) continue;
    rowFootprintRectInto(r, fp);
    const x0 = Math.max(0, r.x + fp.x0);
    const y0 = Math.max(0, r.y + fp.y0);
    const x1 = Math.min(COLLISION_GRID_W, r.x + fp.x0 + fp.w);
    const y1 = Math.min(COLLISION_GRID_H, r.y + fp.y0 + fp.h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const owner = cellOwner.get(yy * COLLISION_GRID_W + xx);
        if (owner != null) indicesPerCluster.get(owner)!.add(r.index);
      }
    }
  }

  const out: OverlapIssue[] = [];
  for (let i = 0; i < clusters.length; i++) {
    const cells = clusters[i];
    let sx = 0;
    let sy = 0;
    for (const c of cells) {
      sx += c.x;
      sy += c.y;
    }
    out.push({
      kind: 'overlap',
      id: `overlap:${cells[0].x}:${cells[0].y}:${cells.length}`,
      cells,
      indices: Array.from(indicesPerCluster.get(i) ?? []).sort((a, b) => a - b),
      centroid: {
        x: Math.round(sx / cells.length),
        y: Math.round(sy / cells.length),
      },
    });
  }
  out.sort((a, b) => a.centroid.y - b.centroid.y || a.centroid.x - b.centroid.x);
  return out;
}

function collectUnknownTilesFromTiles(tiles: ReadonlyArray<number>): UnknownTileIssue[] {
  const buckets = new Map<number, { cells: Cell[]; sumX: number; sumY: number }>();
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const h = tiles[x * MAP_HEIGHT + y] >>> 0;
      if (tileDefForHash(h)) continue;
      let b = buckets.get(h);
      if (!b) {
        b = { cells: [], sumX: 0, sumY: 0 };
        buckets.set(h, b);
      }
      b.cells.push({ x, y });
      b.sumX += x;
      b.sumY += y;
    }
  }
  const out: UnknownTileIssue[] = [];
  for (const [hash, b] of buckets) {
    out.push({
      kind: 'unknown-tile',
      id: `unknown-tile:${hash.toString(16)}`,
      hash,
      count: b.cells.length,
      cells: b.cells,
      centroid: {
        x: Math.round(b.sumX / b.cells.length),
        y: Math.round(b.sumY / b.cells.length),
      },
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

export function computeIssues(
  rows: ReadonlyArray<MapObjectRow>,
  tiles: ReadonlyArray<number> | null,
): IssueGroups {
  const oob: OobIssue[] = [];
  const unknownActors: UnknownActorIssue[] = [];
  for (const r of rows) {
    if (r.x < 0 || r.y < 0) {
      oob.push({
        kind: 'oob',
        id: `oob:${r.index}`,
        index: r.index,
        actor: r.actor,
        x: r.x,
        y: r.y,
      });
    }
    if (actorDisplay(r.actor).group === 'unknown') {
      unknownActors.push({
        kind: 'unknown-actor',
        id: `unknown-actor:${r.index}`,
        index: r.index,
        actor: r.actor,
        x: r.x,
        y: r.y,
      });
    }
  }

  const overlaps = collectOverlapClusters(rows);
  const unknownTiles = tiles ? collectUnknownTilesFromTiles(tiles) : [];

  return {
    oob,
    overlaps,
    unknownActors,
    unknownTiles,
    total: oob.length + overlaps.length + unknownActors.length + unknownTiles.length,
  };
}
