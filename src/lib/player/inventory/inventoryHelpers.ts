import { DataType } from '$lib/sav/dataType';
import { buildHashMap } from '$lib/sav/materialized/schemaIndex';
import { PLAYER_SCHEMA } from '$lib/sav/schema';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';
import type { PlayerAccessor } from '$lib/player/playerEditor.svelte';
import { OBTAINED_HASH } from './stateOptions';

const HASH_MAP = buildHashMap(PLAYER_SCHEMA);

export function leafForHash(hash: number): SchemaLeaf | null {
  return HASH_MAP.get(hash >>> 0) ?? null;
}

export function sortByLabel<T>(
  items: readonly T[],
  labelOf: (item: T) => string,
  locale: string | null | undefined,
): T[] {
  const collator = new Intl.Collator(locale ?? undefined, { sensitivity: 'base' });
  return [...items].sort((a, b) => collator.compare(labelOf(a), labelOf(b)));
}

export function filterBySearch<T>(
  items: readonly T[],
  query: string,
  searchKeys: (item: T) => Iterable<string>,
): readonly T[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    for (const key of searchKeys(item)) {
      if (key.toLocaleLowerCase().includes(q)) return true;
    }
    return false;
  });
}

export type Slot = {
  state: SchemaLeaf | null;
  qty: SchemaLeaf | null;
  index: number | null;
  newlyOwned?: SchemaLeaf | null;
  mystery?: SchemaLeaf | null;
};

const ARRAY_TYPES: ReadonlySet<DataType> = new Set([
  DataType.BoolArray,
  DataType.IntArray,
  DataType.UIntArray,
  DataType.FloatArray,
  DataType.EnumArray,
  DataType.Int64Array,
  DataType.UInt64Array,
  DataType.Vector2Array,
  DataType.Vector3Array,
  DataType.String16Array,
  DataType.String32Array,
  DataType.String64Array,
  DataType.WString16Array,
  DataType.WString32Array,
  DataType.WString64Array,
]);

function isArrayLeaf(leaf: SchemaLeaf): boolean {
  return ARRAY_TYPES.has(leaf.type);
}

function readNumber(acc: PlayerAccessor, leaf: SchemaLeaf, index: number | null): number {
  if (isArrayLeaf(leaf) && index != null) {
    return acc.getElement(leaf, index) as unknown as number;
  }
  return acc.get(leaf) as unknown as number;
}

function writeNumber(
  acc: PlayerAccessor,
  leaf: SchemaLeaf,
  index: number | null,
  value: number,
): void {
  if (isArrayLeaf(leaf) && index != null) {
    acc.setElement(leaf, index, value as never);
    return;
  }
  acc.set(leaf, value as never);
}

function readBool(acc: PlayerAccessor, leaf: SchemaLeaf, index: number | null): boolean {
  if (isArrayLeaf(leaf) && index != null) {
    return acc.getElement(leaf, index) as unknown as boolean;
  }
  return acc.get(leaf) as unknown as boolean;
}

function writeBool(
  acc: PlayerAccessor,
  leaf: SchemaLeaf,
  index: number | null,
  value: boolean,
): void {
  if (isArrayLeaf(leaf) && index != null) {
    acc.setElement(leaf, index, value as never);
    return;
  }
  acc.set(leaf, value as never);
}

export function readSlotState(acc: PlayerAccessor | null, slot: Slot): number {
  if (!acc || !slot.state) return 0;
  try {
    return readNumber(acc, slot.state, slot.index);
  } catch {
    return 0;
  }
}

export function readSlotQty(acc: PlayerAccessor | null, slot: Slot): number {
  if (!acc || !slot.qty) return 0;
  try {
    const v = readNumber(acc, slot.qty, slot.index);
    return v < 0 ? 0 : v;
  } catch {
    return 0;
  }
}

function setStateRaw(acc: PlayerAccessor, slot: Slot, value: number): boolean {
  if (!slot.state) return false;
  try {
    writeNumber(acc, slot.state, slot.index, value >>> 0);
    return true;
  } catch {
    return false;
  }
}

function setQtyRaw(acc: PlayerAccessor, slot: Slot, value: number): boolean {
  if (!slot.qty) return false;
  const v = Math.max(0, Math.trunc(value));
  try {
    writeNumber(acc, slot.qty, slot.index, v);
    return true;
  } catch {
    return false;
  }
}

function clearNewlyOwned(acc: PlayerAccessor, slot: Slot): void {
  if (!slot.newlyOwned) return;
  try {
    if (readBool(acc, slot.newlyOwned, slot.index) === false) return;
    writeBool(acc, slot.newlyOwned, slot.index, false);
  } catch {
    /* swallow */
  }
}

function applyMystery(acc: PlayerAccessor, slot: Slot): void {
  if (!slot.mystery) return;
  try {
    if (readBool(acc, slot.mystery, slot.index) === true) return;
    writeBool(acc, slot.mystery, slot.index, true);
  } catch {
    /* swallow */
  }
}

function bumpStateOnFirstAcquire(
  acc: PlayerAccessor,
  slot: Slot,
  prevQty: number,
  newQty: number,
): void {
  if (!slot.state || prevQty !== 0 || newQty <= 0) return;
  try {
    if (readNumber(acc, slot.state, slot.index) === OBTAINED_HASH) return;
  } catch {
    return;
  }
  setStateRaw(acc, slot, OBTAINED_HASH);
}

export function writeSlotState(acc: PlayerAccessor | null, slot: Slot, value: number): void {
  if (!acc) return;
  setStateRaw(acc, slot, value);
  clearNewlyOwned(acc, slot);
  applyMystery(acc, slot);
}

export function writeSlotQty(acc: PlayerAccessor | null, slot: Slot, value: number): void {
  if (!acc) return;
  const newQty = Math.max(0, Math.trunc(value));
  const prev = readSlotQty(acc, slot);
  if (!setQtyRaw(acc, slot, newQty)) return;
  bumpStateOnFirstAcquire(acc, slot, prev, newQty);
  clearNewlyOwned(acc, slot);
  applyMystery(acc, slot);
}

export function applyStateToSlots(
  acc: PlayerAccessor | null,
  slots: Iterable<Slot>,
  value: number,
): void {
  if (!acc) return;
  for (const slot of slots) {
    setStateRaw(acc, slot, value);
    clearNewlyOwned(acc, slot);
    applyMystery(acc, slot);
  }
}

export function applyQtyToSlots(
  acc: PlayerAccessor | null,
  slots: Iterable<Slot>,
  value: number,
): void {
  if (!acc) return;
  const v = Math.max(0, Math.trunc(value));
  for (const slot of slots) {
    if (!setQtyRaw(acc, slot, v)) continue;
    if (v > 0) bumpStateOnFirstAcquire(acc, slot, 0, v);
    clearNewlyOwned(acc, slot);
    applyMystery(acc, slot);
  }
}
