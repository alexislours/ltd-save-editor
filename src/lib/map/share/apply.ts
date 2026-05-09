import { actorDisplay, type ActorGroup } from '$lib/map/actors/actors';
import {
  commitTileChanges,
  getTileByIndex,
  getUgcByIndex,
  MAP_TILE_COUNT,
  setTileIndex,
  setUgcIndex,
  UGC_NONE,
} from '$lib/map/state/mapEditor.svelte';
import {
  bumpObjectsRev,
  findEmptySlots,
  liveRows,
  restoreObject,
  snapshot,
  type ObjectChange,
  type ObjectSnapshot,
} from '$lib/map/state/mapObjectsEditor.svelte';
import { pushAction, type TileChange } from '$lib/map/state/history.svelte';

import type { DecodedShare, MapShareObject } from './codec';

const KEEP_GROUPS: ReadonlySet<ActorGroup> = new Set<ActorGroup>(['deco', 'room', 'step']);

const EMPTY_SNAPSHOT: ObjectSnapshot = {
  actorKey: 0,
  gridX: -1,
  gridY: -1,
  rotY: 0,
  linkedMapId: -1,
  addGameTime: 0n,
  ugcExteriorId: 0,
  ugcId: 0,
};

type ApplyResult = {
  tilesChanged: number;
  objectsCleared: number;
  objectsPlaced: number;
  objectsSkippedUnknown: number;
  objectsTruncated: number;
};

export function applyMapShare(decoded: DecodedShare): ApplyResult {
  const tileChanges = applyTiles(decoded.tiles);
  const objResult = decoded.objects
    ? applyObjects(decoded.objects)
    : { changes: [], cleared: 0, placed: 0, skippedUnknown: 0, truncated: 0 };

  const tileAction =
    tileChanges.length > 0 ? ({ kind: 'tile', changes: tileChanges } as const) : null;
  const objectAction =
    objResult.changes.length > 0 ? ({ kind: 'object', changes: objResult.changes } as const) : null;
  if (tileAction && objectAction) {
    pushAction({ kind: 'compound', actions: [tileAction, objectAction] });
  } else if (tileAction) {
    pushAction(tileAction);
  } else if (objectAction) {
    pushAction(objectAction);
  }

  return {
    tilesChanged: tileChanges.length,
    objectsCleared: objResult.cleared,
    objectsPlaced: objResult.placed,
    objectsSkippedUnknown: objResult.skippedUnknown,
    objectsTruncated: objResult.truncated,
  };
}

function applyTiles(target: readonly number[]): TileChange[] {
  if (target.length !== MAP_TILE_COUNT) {
    throw new Error(`applyTiles expected ${MAP_TILE_COUNT} tiles, got ${target.length}`);
  }
  const changes: TileChange[] = [];
  for (let i = 0; i < MAP_TILE_COUNT; i++) {
    const oldVal = getTileByIndex(i) >>> 0;
    const newVal = target[i] >>> 0;
    const oldUgc = getUgcByIndex(i) | 0;
    const tileDiff = oldVal !== newVal;
    const ugcDiff = oldUgc !== UGC_NONE;
    if (!tileDiff && !ugcDiff) continue;

    if (tileDiff) setTileIndex(i, newVal);
    if (ugcDiff) setUgcIndex(i, UGC_NONE);

    const change: TileChange = { index: i, oldValue: oldVal, newValue: newVal };
    if (ugcDiff) {
      change.oldUgc = oldUgc;
      change.newUgc = UGC_NONE;
    }
    changes.push(change);
  }
  if (changes.length > 0) {
    commitTileChanges(changes.length);
  }
  return changes;
}

type ObjectApplyResult = {
  changes: ObjectChange[];
  cleared: number;
  placed: number;
  skippedUnknown: number;
  truncated: number;
};

function applyObjects(items: readonly MapShareObject[]): ObjectApplyResult {
  const changes: ObjectChange[] = [];

  let cleared = 0;
  for (const r of liveRows()) {
    const grp = actorDisplay(r.actor).group;
    if (!KEEP_GROUPS.has(grp)) continue;
    const before = snapshot(r.index);
    if (!before) continue;
    if (restoreObject(r.index, EMPTY_SNAPSHOT)) {
      changes.push({ index: r.index, before, after: { ...EMPTY_SNAPSHOT } });
      cleared++;
    }
  }

  const filtered: MapShareObject[] = [];
  let skippedUnknown = 0;
  for (const it of items) {
    const grp = actorDisplay(it.actor).group;
    if (!KEEP_GROUPS.has(grp)) {
      skippedUnknown++;
      continue;
    }
    filtered.push(it);
  }

  const slots = findEmptySlots(filtered.length);
  let placed = 0;
  for (let i = 0; i < filtered.length && i < slots.length; i++) {
    const idx = slots[i];
    const before = snapshot(idx);
    if (!before) continue;
    const after: ObjectSnapshot = {
      actorKey: filtered[i].actor >>> 0,
      gridX: filtered[i].x | 0,
      gridY: filtered[i].y | 0,
      rotY: Number(filtered[i].rotY) || 0,
      linkedMapId: -1,
      addGameTime: 0n,
      ugcExteriorId: 0,
      ugcId: 0,
    };
    if (restoreObject(idx, after)) {
      changes.push({ index: idx, before, after });
      placed++;
    }
  }

  const truncated = Math.max(0, filtered.length - placed);
  if (changes.length > 0) bumpObjectsRev();
  return { changes, cleared, placed, skippedUnknown, truncated };
}
