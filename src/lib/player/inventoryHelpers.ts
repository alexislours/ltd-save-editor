import { SvelteMap } from 'svelte/reactivity';
import { markDirty, playerState } from '../playerEditor.svelte';
import {
  arrGetEnum,
  arrGetInt,
  arrSetEnum,
  arrSetInt,
  getBool,
  getEnum,
  getInt,
  getUInt,
  setBool,
  setEnum,
  setInt,
  setUInt,
} from '../sav/codec';
import { DataType } from '../sav/dataType';
import type { Entry } from '../sav/types';
import { OBTAINED_HASH } from './stateOptions';

export function buildEntryMap(entries: Entry[]): SvelteMap<number, Entry> {
  const m = new SvelteMap<number, Entry>();
  for (const e of entries) m.set(e.hash, e);
  return m;
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
  state: Entry | null;
  qty: Entry | null;
  index: number | null;
  newlyOwned?: Entry | null;
  mystery?: Entry | null;
};

function setBoolEntryTo(e: Entry | null | undefined, value: boolean): boolean {
  if (!e) return false;
  try {
    if (getBool(e) === value) return false;
    setBool(e, value);
    return true;
  } catch {
    return false;
  }
}

function clearNewlyOwned(slot: Slot): boolean {
  return setBoolEntryTo(slot.newlyOwned, false);
}

function applyMystery(slot: Slot): boolean {
  return setBoolEntryTo(slot.mystery, true);
}

export function readSlotState(slot: Slot): number {
  if (!slot.state) return 0;
  void playerState.tick;
  try {
    return slot.index == null ? getEnum(slot.state) : arrGetEnum(slot.state, slot.index);
  } catch {
    return 0;
  }
}

export function readSlotQty(slot: Slot): number {
  if (!slot.qty) return 0;
  void playerState.tick;
  try {
    if (slot.index == null) {
      const raw = slot.qty.type === DataType.UInt ? getUInt(slot.qty) : getInt(slot.qty);
      return raw < 0 ? 0 : raw;
    }
    return arrGetInt(slot.qty, slot.index);
  } catch {
    return 0;
  }
}

function setStateRaw(slot: Slot, value: number): boolean {
  if (!slot.state) return false;
  try {
    if (slot.index == null) setEnum(slot.state, value >>> 0);
    else arrSetEnum(slot.state, slot.index, value >>> 0);
    return true;
  } catch {
    return false;
  }
}

function setQtyRaw(slot: Slot, value: number): boolean {
  if (!slot.qty) return false;
  const v = Math.max(0, Math.trunc(value));
  try {
    if (slot.index == null) {
      if (slot.qty.type === DataType.UInt) setUInt(slot.qty, v >>> 0);
      else setInt(slot.qty, v);
    } else {
      arrSetInt(slot.qty, slot.index, v);
    }
    return true;
  } catch {
    return false;
  }
}

function bumpStateOnFirstAcquire(slot: Slot, prevQty: number, newQty: number): boolean {
  if (!slot.state) return false;
  if (prevQty !== 0 || newQty <= 0) return false;
  try {
    const cur = slot.index == null ? getEnum(slot.state) : arrGetEnum(slot.state, slot.index);
    if (cur === OBTAINED_HASH) return false;
  } catch {
    return false;
  }
  return setStateRaw(slot, OBTAINED_HASH);
}

export function writeSlotState(slot: Slot, value: number): void {
  if (setStateRaw(slot, value) && slot.state) markDirty(slot.state);
  if (clearNewlyOwned(slot) && slot.newlyOwned) markDirty(slot.newlyOwned);
  if (applyMystery(slot) && slot.mystery) markDirty(slot.mystery);
}

export function writeSlotQty(slot: Slot, value: number): void {
  const newQty = Math.max(0, Math.trunc(value));
  const prev = readSlotQty(slot);
  if (!setQtyRaw(slot, newQty)) return;
  if (slot.qty) markDirty(slot.qty);
  if (bumpStateOnFirstAcquire(slot, prev, newQty) && slot.state) markDirty(slot.state);
  if (clearNewlyOwned(slot) && slot.newlyOwned) markDirty(slot.newlyOwned);
  if (applyMystery(slot) && slot.mystery) markDirty(slot.mystery);
}

export function applyStateToSlots(slots: Iterable<Slot>, value: number): void {
  const dirtied = new Set<Entry>();
  const newlyDirty = new Set<Entry>();
  const mysteryDirty = new Set<Entry>();
  for (const slot of slots) {
    if (setStateRaw(slot, value) && slot.state) dirtied.add(slot.state);
    if (clearNewlyOwned(slot) && slot.newlyOwned) newlyDirty.add(slot.newlyOwned);
    if (applyMystery(slot) && slot.mystery) mysteryDirty.add(slot.mystery);
  }
  for (const e of dirtied) markDirty(e);
  for (const e of newlyDirty) markDirty(e);
  for (const e of mysteryDirty) markDirty(e);
}

export function applyQtyToSlots(slots: Iterable<Slot>, value: number): void {
  const v = Math.max(0, Math.trunc(value));
  const qtyDirty = new Set<Entry>();
  const stateDirty = new Set<Entry>();
  const newlyDirty = new Set<Entry>();
  const mysteryDirty = new Set<Entry>();
  for (const slot of slots) {
    if (!setQtyRaw(slot, v)) continue;
    if (slot.qty) qtyDirty.add(slot.qty);
    if (v > 0 && setStateIfNotObtained(slot) && slot.state) stateDirty.add(slot.state);
    if (clearNewlyOwned(slot) && slot.newlyOwned) newlyDirty.add(slot.newlyOwned);
    if (applyMystery(slot) && slot.mystery) mysteryDirty.add(slot.mystery);
  }
  for (const e of qtyDirty) markDirty(e);
  for (const e of stateDirty) markDirty(e);
  for (const e of newlyDirty) markDirty(e);
  for (const e of mysteryDirty) markDirty(e);
}

function setStateIfNotObtained(slot: Slot): boolean {
  if (!slot.state) return false;
  try {
    const cur = slot.index == null ? getEnum(slot.state) : arrGetEnum(slot.state, slot.index);
    if (cur === OBTAINED_HASH) return false;
  } catch {
    return false;
  }
  return setStateRaw(slot, OBTAINED_HASH);
}
