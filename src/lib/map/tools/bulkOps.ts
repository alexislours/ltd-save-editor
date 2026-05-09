import type { ObjectChange, ObjectMapAction } from '$lib/map/state/history.svelte';
import {
  bumpObjectsRev,
  clampGridX,
  clampGridY,
  findEmptySlots,
  restoreObject,
  setActor,
  setLinkedMapId,
  setPosition,
  setRotation,
  snapshot,
  type ObjectSnapshot,
} from '$lib/map/state/mapObjectsEditor.svelte';

type DuplicateResult = {
  action: ObjectMapAction;
  newIndices: number[];
};

function snapTo15(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let v = Math.round(deg / 15) * 15;
  v = ((v % 360) + 360) % 360;
  return v;
}

function snapshots(indices: Iterable<number>): Array<{ index: number; snap: ObjectSnapshot }> {
  const out: Array<{ index: number; snap: ObjectSnapshot }> = [];
  const seen = new Set<number>();
  for (const i of indices) {
    if (seen.has(i)) continue;
    seen.add(i);
    const s = snapshot(i);
    if (s && s.actorKey >>> 0 !== 0) out.push({ index: i, snap: s });
  }
  return out;
}

export function nudge(indices: Iterable<number>, dx: number, dy: number): ObjectMapAction | null {
  if (dx === 0 && dy === 0) return null;
  const items = snapshots(indices);
  if (items.length === 0) return null;

  const changes: ObjectChange[] = [];
  for (const { index, snap } of items) {
    const nx = clampGridX(snap.gridX + dx);
    const ny = clampGridY(snap.gridY + dy);
    if (nx === snap.gridX && ny === snap.gridY) continue;
    if (!setPosition(index, nx, ny)) continue;
    const after = snapshot(index);
    if (!after) continue;
    changes.push({ index, before: snap, after });
  }
  if (changes.length === 0) return null;
  return { kind: 'object', changes };
}

export function rotate(indices: Iterable<number>, deltaDeg: number): ObjectMapAction | null {
  if (!Number.isFinite(deltaDeg) || deltaDeg === 0) return null;
  const items = snapshots(indices);
  if (items.length === 0) return null;

  const changes: ObjectChange[] = [];
  for (const { index, snap } of items) {
    const next = snapTo15(snap.rotY + deltaDeg);
    if (Object.is(next, snap.rotY)) continue;
    if (!setRotation(index, next)) continue;
    const after = snapshot(index);
    if (!after) continue;
    changes.push({ index, before: snap, after });
  }
  if (changes.length === 0) return null;
  return { kind: 'object', changes };
}

export function deleteAll(indices: Iterable<number>): ObjectMapAction | null {
  const items = snapshots(indices);
  if (items.length === 0) return null;

  const changes: ObjectChange[] = [];
  for (const { index, snap } of items) {
    if (!setActor(index, 0)) continue;
    const after = snapshot(index);
    if (!after) continue;
    changes.push({ index, before: snap, after });
  }
  if (changes.length === 0) return null;
  return { kind: 'object', changes };
}

export function linkAll(indices: Iterable<number>, mapId: number): ObjectMapAction | null {
  const items = snapshots(indices);
  if (items.length === 0) return null;
  const target = Number.isFinite(mapId) ? mapId | 0 : -1;

  const changes: ObjectChange[] = [];
  for (const { index, snap } of items) {
    if (snap.linkedMapId === target) continue;
    if (!setLinkedMapId(index, target)) continue;
    const after = snapshot(index);
    if (!after) continue;
    changes.push({ index, before: snap, after });
  }
  if (changes.length === 0) return null;
  return { kind: 'object', changes };
}

export function duplicate(
  indices: Iterable<number>,
  dx: number,
  dy: number,
): DuplicateResult | null {
  const items = snapshots(indices);
  if (items.length === 0) return null;

  const slots = findEmptySlots(items.length);
  if (slots.length < items.length) return null;

  const changes: ObjectChange[] = [];
  const newIndices: number[] = [];
  for (let k = 0; k < items.length; k++) {
    const slot = slots[k];
    const before = snapshot(slot);
    if (!before) return null;
    const src = items[k].snap;
    const after: ObjectSnapshot = {
      actorKey: src.actorKey >>> 0,
      gridX: clampGridX(src.gridX + dx),
      gridY: clampGridY(src.gridY + dy),
      rotY: src.rotY,
      linkedMapId: src.linkedMapId,
      addGameTime: src.addGameTime,
      ugcExteriorId: src.ugcExteriorId >>> 0,
      ugcId: src.ugcId >>> 0,
    };
    if (!restoreObject(slot, after)) {
      return null;
    }
    changes.push({ index: slot, before, after });
    newIndices.push(slot);
  }
  if (changes.length === 0) return null;
  bumpObjectsRev();
  return {
    action: { kind: 'object', changes },
    newIndices,
  };
}
