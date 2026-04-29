import { DataType } from '../sav/dataType';
import type { Entry } from '../sav/types';
import { ensureParsed, mapSave, scheduleMapPersist } from '../map/mapSave.svelte';

export const HASH_ACTOR_KEY = 0x724d5b50;
export const HASH_GRID_POS_X = 0xb3ab615b;
export const HASH_GRID_POS_Y = 0x97825020;
export const HASH_LINKED_MAP = 0xee0b27ec;
export const HASH_ROT_Y = 0xb558468c;

// Map bounds (same grid as the floor editor).
export const GRID_WIDTH = 120;
export const GRID_HEIGHT = 80;

export type MapObjectRow = {
  index: number;
  actor: number; // u32 MurmurHash of Actor.Key (0 == empty slot)
  x: number; // i32
  y: number; // i32
  link: number; // i32 (-1 = none)
  rot: number; // f32 degrees
};

type EditorState = {
  count: number;
  error: string | null;
  parseRev: number;
  dirty: boolean;
  rev: number;
};

const state = $state<EditorState>({
  count: 0,
  error: null,
  parseRev: -1,
  dirty: false,
  rev: 0,
});

export const objectsState = state;

let actorEntry: Entry | null = null;
let xEntry: Entry | null = null;
let yEntry: Entry | null = null;
let linkEntry: Entry | null = null;
let rotEntry: Entry | null = null;

let originalActor: Uint32Array | null = null;
let originalX: Int32Array | null = null;
let originalY: Int32Array | null = null;
let originalLink: Int32Array | null = null;
let originalRot: Float32Array | null = null;

function bumpRev(): void {
  state.rev = (state.rev + 1) | 0;
}

function actorView(): Uint32Array {
  if (!actorEntry?.payload) throw new Error('MapObject arrays not loaded');
  return new Uint32Array(actorEntry.payload.buffer, actorEntry.payload.byteOffset + 4, state.count);
}
function xView(): Int32Array {
  if (!xEntry?.payload) throw new Error('MapObject arrays not loaded');
  return new Int32Array(xEntry.payload.buffer, xEntry.payload.byteOffset + 4, state.count);
}
function yView(): Int32Array {
  if (!yEntry?.payload) throw new Error('MapObject arrays not loaded');
  return new Int32Array(yEntry.payload.buffer, yEntry.payload.byteOffset + 4, state.count);
}
function linkView(): Int32Array {
  if (!linkEntry?.payload) throw new Error('MapObject arrays not loaded');
  return new Int32Array(linkEntry.payload.buffer, linkEntry.payload.byteOffset + 4, state.count);
}
function rotView(): Float32Array {
  if (!rotEntry?.payload) throw new Error('MapObject arrays not loaded');
  return new Float32Array(rotEntry.payload.buffer, rotEntry.payload.byteOffset + 4, state.count);
}

function recomputeDirty(): void {
  if (!actorEntry || !originalActor || !originalX || !originalY || !originalLink || !originalRot) {
    state.dirty = false;
    return;
  }
  const a = actorView(),
    x = xView(),
    y = yView(),
    l = linkView(),
    r = rotView();
  for (let i = 0; i < state.count; i++) {
    if (a[i] !== originalActor[i]) {
      state.dirty = true;
      return;
    }
    if (x[i] !== originalX[i]) {
      state.dirty = true;
      return;
    }
    if (y[i] !== originalY[i]) {
      state.dirty = true;
      return;
    }
    if (l[i] !== originalLink[i]) {
      state.dirty = true;
      return;
    }
    // Float32 bitwise compare - NaN-safe via Object.is.
    if (!Object.is(r[i], originalRot[i])) {
      state.dirty = true;
      return;
    }
  }
  state.dirty = false;
}

function reset(): void {
  actorEntry = xEntry = yEntry = linkEntry = rotEntry = null;
  originalActor = originalX = originalY = originalLink = originalRot = null;
  state.count = 0;
  state.dirty = false;
}

export function syncFromSave(): void {
  const parsed = ensureParsed();
  if (!parsed) {
    if (state.count || state.error) {
      reset();
      state.error = mapSave.error;
      state.parseRev = mapSave.parseRev;
      bumpRev();
    }
    return;
  }
  if (state.parseRev === mapSave.parseRev && actorEntry) return;

  try {
    const a = parsed.entries.find(
      (e) => e.hash === HASH_ACTOR_KEY && e.type === DataType.UIntArray,
    );
    const x = parsed.entries.find(
      (e) => e.hash === HASH_GRID_POS_X && e.type === DataType.IntArray,
    );
    const y = parsed.entries.find(
      (e) => e.hash === HASH_GRID_POS_Y && e.type === DataType.IntArray,
    );
    const l = parsed.entries.find(
      (e) => e.hash === HASH_LINKED_MAP && e.type === DataType.IntArray,
    );
    const r = parsed.entries.find((e) => e.hash === HASH_ROT_Y && e.type === DataType.FloatArray);

    if (!a?.payload || !x?.payload || !y?.payload || !l?.payload || !r?.payload) {
      throw new Error(
        'Map save is missing one of the MapObject.* parallel arrays ' +
          '(ActorKey / GridPosX / GridPosY / LinkedMapId / RotY).',
      );
    }

    const count = new DataView(a.payload.buffer, a.payload.byteOffset, 4).getUint32(0, true);
    for (const [label, entry] of [
      ['GridPosX', x],
      ['GridPosY', y],
      ['LinkedMapId', l],
      ['RotY', r],
    ] as const) {
      const c = new DataView(entry.payload!.buffer, entry.payload!.byteOffset, 4).getUint32(
        0,
        true,
      );
      if (c !== count) {
        throw new Error(`MapObject.${label} count (${c}) doesn't match ActorKey count (${count})`);
      }
    }

    actorEntry = a;
    xEntry = x;
    yEntry = y;
    linkEntry = l;
    rotEntry = r;
    state.count = count;
    state.error = null;
    state.parseRev = mapSave.parseRev;
    state.dirty = false;

    originalActor = new Uint32Array(actorView());
    originalX = new Int32Array(xView());
    originalY = new Int32Array(yView());
    originalLink = new Int32Array(linkView());
    originalRot = new Float32Array(rotView());

    bumpRev();
  } catch (e) {
    reset();
    state.error = e instanceof Error ? e.message : String(e);
    state.parseRev = mapSave.parseRev;
    bumpRev();
  }
}

export function getRow(index: number): MapObjectRow | null {
  if (!actorEntry || index < 0 || index >= state.count) return null;
  return {
    index,
    actor: actorView()[index] >>> 0,
    x: xView()[index],
    y: yView()[index],
    link: linkView()[index],
    rot: rotView()[index],
  };
}

export function isEmpty(index: number): boolean {
  if (!actorEntry || index < 0 || index >= state.count) return true;
  return actorView()[index] >>> 0 === 0;
}

export function liveRows(): MapObjectRow[] {
  void state.rev;
  if (!actorEntry) return [];
  const a = actorView(),
    x = xView(),
    y = yView(),
    l = linkView(),
    r = rotView();
  const out: MapObjectRow[] = [];
  for (let i = 0; i < state.count; i++) {
    if (a[i] >>> 0 === 0) continue;
    out.push({
      index: i,
      actor: a[i] >>> 0,
      x: x[i],
      y: y[i],
      link: l[i],
      rot: r[i],
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
  if (!actorEntry || index < 0 || index >= state.count) return false;
  const a = actorView();
  const next = hash >>> 0;
  if (a[index] === next) return false;
  a[index] = next;
  bumpRev();
  recomputeDirty();
  scheduleMapPersist();
  return true;
}

export function setPosition(index: number, x: number, y: number): boolean {
  if (!actorEntry || index < 0 || index >= state.count) return false;
  const xs = xView(),
    ys = yView();
  const nx = clampX(x),
    ny = clampY(y);
  if (xs[index] === nx && ys[index] === ny) return false;
  xs[index] = nx;
  ys[index] = ny;
  bumpRev();
  recomputeDirty();
  scheduleMapPersist();
  return true;
}

export function setRotation(index: number, degrees: number): boolean {
  if (!actorEntry || index < 0 || index >= state.count) return false;
  const r = rotView();
  const next = Number.isFinite(degrees) ? degrees : 0;
  if (Object.is(r[index], next)) return false;
  r[index] = next;
  bumpRev();
  recomputeDirty();
  scheduleMapPersist();
  return true;
}

export function setLinkedMapId(index: number, id: number): boolean {
  if (!actorEntry || index < 0 || index >= state.count) return false;
  const l = linkView();
  const next = Number.isFinite(id) ? id | 0 : -1;
  if (l[index] === next) return false;
  l[index] = next;
  bumpRev();
  recomputeDirty();
  scheduleMapPersist();
  return true;
}

export function clearSlot(index: number): boolean {
  return setActor(index, 0);
}
