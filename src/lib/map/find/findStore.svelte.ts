import { liveRows, objectsState, snapshot } from '$lib/map/state/mapObjectsEditor.svelte';
import { floorTiles, mapState, ugcTiles } from '$lib/map/state/mapEditor.svelte';
import { snapToCells, snapToObject, snapToTile } from '../input/snapTo.svelte';
import { selection, set as setSelection } from '../tools/selection.svelte';
import {
  parseQuery,
  resultId,
  runQuery,
  type FindObject,
  type FindResult,
  type ParsedQuery,
  type Translator,
} from './findEngine';

type FindState = {
  open: boolean;
  query: string;
  cursor: number;
  hitCursor: number;
  hitRowId: string | null;
};

export const findStore = $state<FindState>({
  open: false,
  query: '',
  cursor: 0,
  hitCursor: -1,
  hitRowId: null,
});

let translator: Translator = (key) => key;

export function setFindTranslator(fn: Translator): void {
  translator = fn;
}

let rowsCache: { rev: number; rows: FindObject[] } | null = null;

function rowsForFind(): FindObject[] {
  const rev = objectsState.rev;
  if (rowsCache && rowsCache.rev === rev) return rowsCache.rows;
  const out: FindObject[] = [];
  for (const r of liveRows()) {
    const snap = snapshot(r.index);
    out.push({
      index: r.index,
      actor: r.actor,
      x: r.x,
      y: r.y,
      rot: r.rot,
      link: r.link,
      ugcExt: snap?.ugcExteriorId ?? -1,
      ugcId: snap?.ugcId ?? -1,
    });
  }
  rowsCache = { rev, rows: out };
  return out;
}

export function findParsed(): ParsedQuery {
  return parseQuery(findStore.query);
}

export function findResults(): readonly FindResult[] {
  if (!findStore.open) return [];
  const tilesRev = mapState.tileRev;
  const rowsRev = objectsState.rev;
  return runQuery(findParsed(), {
    rows: rowsForFind(),
    tiles: floorTiles(),
    ugcCells: ugcTiles(),
    translator,
    tilesRev,
    rowsRev,
  });
}

export function open(): void {
  findStore.open = true;
  findStore.cursor = 0;
  findStore.hitCursor = -1;
  findStore.hitRowId = null;
}

export function close(): void {
  findStore.open = false;
  findStore.query = '';
  findStore.cursor = 0;
  findStore.hitCursor = -1;
  findStore.hitRowId = null;
}

export function setQuery(q: string): void {
  if (findStore.query === q) return;
  findStore.query = q;
  findStore.cursor = 0;
  findStore.hitCursor = -1;
  findStore.hitRowId = null;
}

export function next(): void {
  const n = findResults().length;
  if (n === 0) return;
  findStore.cursor = (findStore.cursor + 1) % n;
  findStore.hitCursor = -1;
  findStore.hitRowId = null;
}

export function prev(): void {
  const n = findResults().length;
  if (n === 0) return;
  findStore.cursor = (findStore.cursor - 1 + n) % n;
  findStore.hitCursor = -1;
  findStore.hitRowId = null;
}

export function setCursor(i: number): void {
  const n = findResults().length;
  if (n === 0) return;
  if (i < 0 || i >= n) return;
  if (findStore.cursor === i) return;
  findStore.cursor = i;
  findStore.hitCursor = -1;
  findStore.hitRowId = null;
}

type Hit = { kind: 'cell'; x: number; y: number } | { kind: 'object'; index: number };

function hitsFor(r: FindResult): Hit[] {
  switch (r.kind) {
    case 'tile':
    case 'unknown-tile':
      return r.cells.map((c) => ({ kind: 'cell' as const, x: c.x, y: c.y }));
    case 'actor':
    case 'unknown-actor':
    case 'link':
      return r.placements.map((index) => ({ kind: 'object' as const, index }));
    case 'ugc': {
      const out: Hit[] = r.cells.map((c) => ({ kind: 'cell' as const, x: c.x, y: c.y }));
      for (const index of r.objectIndices) out.push({ kind: 'object', index });
      return out;
    }
  }
}

export function cycleSnap(direction: 1 | -1): void {
  const all = findResults();
  const r = all[findStore.cursor];
  if (!r) return;
  const hits = hitsFor(r);
  if (hits.length === 0) {
    snapWhole(r);
    return;
  }
  const id = resultId(r);
  if (findStore.hitRowId !== id) {
    findStore.hitRowId = id;
    findStore.hitCursor = direction === 1 ? -1 : 0;
  }
  const next = (findStore.hitCursor + direction + hits.length) % hits.length;
  findStore.hitCursor = next;
  const hit = hits[next];
  if (hit.kind === 'cell') snapToTile(hit.x, hit.y);
  else snapToObject(hit.index);
}

function snapWhole(r: FindResult): void {
  if (r.kind === 'tile' || r.kind === 'unknown-tile') {
    if (r.cells.length > 0) snapToCells(r.cells);
  } else if (r.kind === 'ugc') {
    if (r.cells.length > 0) snapToCells(r.cells);
    else if (r.objectIndices.length > 0) snapToObject(r.objectIndices[0]);
  } else if (r.placements.length > 0) {
    snapToObject(r.placements[0]);
  }
}

function indicesForResult(r: FindResult): number[] {
  switch (r.kind) {
    case 'actor':
    case 'unknown-actor':
    case 'link':
      return r.placements;
    case 'ugc':
      return r.objectIndices;
    default:
      return [];
  }
}

export function commitToSelection(mode: 'replace' | 'union'): void {
  const r = findResults()[findStore.cursor];
  if (!r) return;
  const indices = indicesForResult(r);
  if (indices.length === 0) {
    snapWhole(r);
    return;
  }
  if (mode === 'replace') {
    setSelection(indices);
    return;
  }
  setSelection([...selection.indices, ...indices]);
}
