import type { PlayerAccessor } from '$lib/player/playerEditor.svelte';
import { PLAYER_SCHEMA } from '$lib/sav/schema';

const ID_LEAF = PLAYER_SCHEMA.Liberation.WishInfo.WishIdValue;
const LIB_LEAF = PLAYER_SCHEMA.Liberation.WishInfo.IsLiberated;
const NEW_LEAF = PLAYER_SCHEMA.Liberation.WishInfo.IsNew;
const LEVEL_LEAF = PLAYER_SCHEMA.Liberation.FountainLevel;
const COUNT_LEAF = PLAYER_SCHEMA.Liberation.ComeTrueCount;

function readArray<T>(
  acc: PlayerAccessor,
  leaf: typeof ID_LEAF | typeof LIB_LEAF | typeof NEW_LEAF,
): T[] {
  if (!acc.has(leaf)) return [] as T[];
  return ((acc.get(leaf) as unknown as T[]) ?? []) as T[];
}

export function liberatedWishHashes(acc: PlayerAccessor | null): Set<number> {
  const out = new Set<number>();
  if (!acc) return out;
  const ids = readArray<number>(acc, ID_LEAF);
  const flags = readArray<boolean>(acc, LIB_LEAF);
  const len = Math.min(ids.length, flags.length);
  for (let i = 0; i < len; i++) {
    if (flags[i]) out.add(ids[i] >>> 0);
  }
  return out;
}

export function setWishLiberated(
  acc: PlayerAccessor | null,
  wishHash: number,
  value: boolean,
): void {
  if (!acc) return;
  const target = wishHash >>> 0;
  const ids = [...readArray<number>(acc, ID_LEAF)];
  const liberated = [...readArray<boolean>(acc, LIB_LEAF)];
  const hasIsNew = acc.has(NEW_LEAF);
  const isNew = hasIsNew ? [...readArray<boolean>(acc, NEW_LEAF)] : null;

  let idx = -1;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] >>> 0 === target) {
      idx = i;
      break;
    }
  }

  if (idx < 0) {
    if (!value) return;
    ids.push(target);
    liberated.push(true);
    if (isNew) isNew.push(false);
  } else {
    if (liberated[idx] === value) return;
    liberated[idx] = value;
  }

  syncParallelArrays(ids, liberated, isNew);
  acc.set(ID_LEAF, ids);
  acc.set(LIB_LEAF, liberated);
  if (isNew) acc.set(NEW_LEAF, isNew);
}

export function applyLiberatedToWishes(
  acc: PlayerAccessor | null,
  wishHashes: Iterable<number>,
  value: boolean,
): void {
  if (!acc) return;
  const ids = [...readArray<number>(acc, ID_LEAF)];
  const liberated = [...readArray<boolean>(acc, LIB_LEAF)];
  const hasIsNew = acc.has(NEW_LEAF);
  const isNew = hasIsNew ? [...readArray<boolean>(acc, NEW_LEAF)] : null;

  const indexByHash = new Map<number, number>();
  for (let i = 0; i < ids.length; i++) indexByHash.set(ids[i] >>> 0, i);

  let changed = false;
  for (const raw of wishHashes) {
    const target = raw >>> 0;
    const idx = indexByHash.get(target);
    if (idx == null) {
      if (!value) continue;
      ids.push(target);
      liberated.push(true);
      if (isNew) isNew.push(false);
      indexByHash.set(target, ids.length - 1);
      changed = true;
    } else if (liberated[idx] !== value) {
      liberated[idx] = value;
      changed = true;
    }
  }

  if (!changed) return;

  syncParallelArrays(ids, liberated, isNew);
  acc.set(ID_LEAF, ids);
  acc.set(LIB_LEAF, liberated);
  if (isNew) acc.set(NEW_LEAF, isNew);
}

function syncParallelArrays(ids: number[], liberated: boolean[], isNew: boolean[] | null): void {
  const len = ids.length;
  while (liberated.length < len) liberated.push(false);
  liberated.length = len;
  if (isNew) {
    while (isNew.length < len) isNew.push(false);
    isNew.length = len;
  }
}

export function wishesAvailable(acc: PlayerAccessor | null): boolean {
  if (!acc) return false;
  return acc.has(ID_LEAF) && acc.has(LIB_LEAF);
}

export function getFountainLevel(acc: PlayerAccessor | null): number | null {
  if (!acc || !acc.has(LEVEL_LEAF)) return null;
  return acc.get(LEVEL_LEAF) as number;
}

export function getComeTrueCount(acc: PlayerAccessor | null): number | null {
  if (!acc || !acc.has(COUNT_LEAF)) return null;
  return acc.get(COUNT_LEAF) as number;
}

export function bumpStatsToSatisfy(
  acc: PlayerAccessor | null,
  level: number | null,
  count: number | null,
): void {
  if (!acc) return;
  if (level != null && acc.has(LEVEL_LEAF)) {
    const current = (acc.get(LEVEL_LEAF) as number) ?? 0;
    if (current < level) acc.set(LEVEL_LEAF, level);
  }
  if (count != null && acc.has(COUNT_LEAF)) {
    const current = (acc.get(COUNT_LEAF) as number) ?? 0;
    if (current < count) acc.set(COUNT_LEAF, count);
  }
}
