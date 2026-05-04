import { mapAccessor, mapSave, syncFromSave as syncMapSave } from './mapSave.svelte';
import { MAP_SCHEMA } from '$lib/sav/schema';

export const GRID_WIDTH = 120;
export const GRID_HEIGHT = 80;

export type MapObjectRow = {
  index: number;
  actor: number;
  x: number;
  y: number;
  link: number;
  rot: number;
};

const ACTOR_LEAF = MAP_SCHEMA.MapObject.ActorKey;
const X_LEAF = MAP_SCHEMA.MapObject.Location.GridPosX;
const Y_LEAF = MAP_SCHEMA.MapObject.Location.GridPosY;
const LINK_LEAF = MAP_SCHEMA.MapObject.MapLink.LinkedMapId;
const ROT_LEAF = MAP_SCHEMA.MapObject.MapObjectMisc.RotY;

const ACTOR_HASH = ACTOR_LEAF.hash >>> 0;
const X_HASH = X_LEAF.hash >>> 0;
const Y_HASH = Y_LEAF.hash >>> 0;
const LINK_HASH = LINK_LEAF.hash >>> 0;
const ROT_HASH = ROT_LEAF.hash >>> 0;

type EditorState = {
  count: number;
  error: string | null;
  loadId: number;
  rev: number;
};

const state = $state<EditorState>({
  count: 0,
  error: null,
  loadId: -1,
  rev: 0,
});

export const objectsState = state;

function bumpRev(): void {
  state.rev = (state.rev + 1) | 0;
}

type Arrays = {
  actor: number[];
  x: number[];
  y: number[];
  link: number[];
  rot: number[];
};

function arrays(): Arrays | null {
  const decoded = mapSave.decoded;
  if (!decoded) return null;
  const v = decoded.values;
  const actor = v[ACTOR_HASH] as number[] | undefined;
  const x = v[X_HASH] as number[] | undefined;
  const y = v[Y_HASH] as number[] | undefined;
  const link = v[LINK_HASH] as number[] | undefined;
  const rot = v[ROT_HASH] as number[] | undefined;
  if (!actor || !x || !y || !link || !rot) return null;
  return { actor, x, y, link, rot };
}

function reset(): void {
  state.count = 0;
}

export function syncFromSave(): void {
  syncMapSave();
  const decoded = mapSave.decoded;
  if (!decoded) {
    if (state.count || state.error) {
      reset();
      state.error = mapSave.error;
      state.loadId = mapSave.loadId;
      bumpRev();
    }
    return;
  }
  if (state.loadId === mapSave.loadId && (state.count > 0 || state.error)) return;

  try {
    const arrs = arrays();
    if (!arrs) {
      throw new Error(
        'Map save is missing one of the MapObject.* parallel arrays ' +
          '(ActorKey / GridPosX / GridPosY / LinkedMapId / RotY).',
      );
    }
    const count = arrs.actor.length;
    for (const [label, a] of [
      ['GridPosX', arrs.x],
      ['GridPosY', arrs.y],
      ['LinkedMapId', arrs.link],
      ['RotY', arrs.rot],
    ] as const) {
      if (a.length !== count) {
        throw new Error(
          `MapObject.${label} count (${a.length}) doesn't match ActorKey count (${count})`,
        );
      }
    }

    state.count = count;
    state.error = null;
    state.loadId = mapSave.loadId;

    bumpRev();
  } catch (e) {
    reset();
    state.error = e instanceof Error ? e.message : String(e);
    state.loadId = mapSave.loadId;
    bumpRev();
  }
}

export function getRow(index: number): MapObjectRow | null {
  const arrs = arrays();
  if (!arrs || index < 0 || index >= state.count) return null;
  return {
    index,
    actor: arrs.actor[index] >>> 0,
    x: arrs.x[index],
    y: arrs.y[index],
    link: arrs.link[index],
    rot: arrs.rot[index],
  };
}

export function liveRows(): MapObjectRow[] {
  void state.rev;
  const arrs = arrays();
  if (!arrs) return [];
  const out: MapObjectRow[] = [];
  for (let i = 0; i < state.count; i++) {
    if (arrs.actor[i] >>> 0 === 0) continue;
    out.push({
      index: i,
      actor: arrs.actor[i] >>> 0,
      x: arrs.x[i],
      y: arrs.y[i],
      link: arrs.link[i],
      rot: arrs.rot[i],
    });
  }
  return out;
}

function clampX(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const i = v | 0;
  if (i < -1) return -1;
  if (i >= GRID_WIDTH) return GRID_WIDTH - 1;
  return i;
}
function clampY(v: number): number {
  if (!Number.isFinite(v)) return 0;
  const i = v | 0;
  if (i < -1) return -1;
  if (i >= GRID_HEIGHT) return GRID_HEIGHT - 1;
  return i;
}

export function setActor(index: number, hash: number): boolean {
  const arrs = arrays();
  if (!arrs || index < 0 || index >= state.count) return false;
  const acc = mapAccessor();
  if (!acc) return false;
  const next = hash >>> 0;
  if (arrs.actor[index] >>> 0 === next) return false;
  acc.setElement(ACTOR_LEAF, index, next);
  bumpRev();
  return true;
}

export function setPosition(index: number, x: number, y: number): boolean {
  const arrs = arrays();
  if (!arrs || index < 0 || index >= state.count) return false;
  const acc = mapAccessor();
  if (!acc) return false;
  const nx = clampX(x);
  const ny = clampY(y);
  if (arrs.x[index] === nx && arrs.y[index] === ny) return false;
  acc.setElement(X_LEAF, index, nx);
  acc.setElement(Y_LEAF, index, ny);
  bumpRev();
  return true;
}

export function setRotation(index: number, degrees: number): boolean {
  const arrs = arrays();
  if (!arrs || index < 0 || index >= state.count) return false;
  const acc = mapAccessor();
  if (!acc) return false;
  const next = Number.isFinite(degrees) ? degrees : 0;
  if (Object.is(arrs.rot[index], next)) return false;
  acc.setElement(ROT_LEAF, index, next);
  bumpRev();
  return true;
}

export function setLinkedMapId(index: number, id: number): boolean {
  const arrs = arrays();
  if (!arrs || index < 0 || index >= state.count) return false;
  const acc = mapAccessor();
  if (!acc) return false;
  const next = Number.isFinite(id) ? id | 0 : -1;
  if (arrs.link[index] === next) return false;
  acc.setElement(LINK_LEAF, index, next);
  bumpRev();
  return true;
}

export function clearSlot(index: number): boolean {
  return setActor(index, 0);
}
