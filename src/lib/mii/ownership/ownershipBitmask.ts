import type { DataType } from '$lib/sav/dataType';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';

export type BitmaskAccess = {
  available: boolean;
  read: (itemIndex: number) => number;
  write: (itemIndex: number, mask: number) => void;
  validMask: (colorCount: number) => number;
  ownedColors: (itemIndex: number, colorCount: number) => number[];
  toggleColor: (itemIndex: number, colorIndex: number, owned: boolean) => void;
  setAllColors: (itemIndex: number, owned: boolean, colorCount: number) => void;
  popcount: (mask: number) => number;
};

type Config = {
  mii: MiiAccessor | null;
  leaf: SchemaLeaf<DataType.UIntArray> | null;
  totalCount: number;
  miiIndex: number | null;
  slotsPerMii: number;
  colorSlots: number;
};

export function createOwnershipBitmask({
  mii,
  leaf,
  totalCount,
  miiIndex,
  slotsPerMii,
  colorSlots,
}: Config): BitmaskAccess {
  const slot = (itemIndex: number) => (miiIndex ?? 0) * slotsPerMii + itemIndex;

  const read = (itemIndex: number): number => {
    if (!mii || !leaf || miiIndex == null) return 0;
    const i = slot(itemIndex);
    if (i < 0 || i >= totalCount) return 0;
    try {
      return mii.getElement(leaf, i) >>> 0;
    } catch {
      return 0;
    }
  };

  const write = (itemIndex: number, mask: number): void => {
    if (!mii || !leaf || miiIndex == null) return;
    const i = slot(itemIndex);
    if (i < 0 || i >= totalCount) return;
    try {
      mii.setElement(leaf, i, mask >>> 0);
    } catch {
      /* out of range */
    }
  };

  const validMask = (colorCount: number): number => {
    const n = Math.max(0, Math.min(colorSlots, colorCount | 0));
    return n >= 32 ? 0xffffffff : ((1 << n) - 1) >>> 0;
  };

  const ownedColors = (itemIndex: number, colorCount: number): number[] => {
    const mask = read(itemIndex);
    const limit = Math.min(colorCount, colorSlots);
    const out: number[] = [];
    for (let i = 0; i < limit; i++) {
      if (((mask >>> i) & 1) === 1) out.push(i);
    }
    return out;
  };

  const toggleColor = (itemIndex: number, colorIndex: number, owned: boolean): void => {
    const cur = read(itemIndex);
    const bit = (1 << colorIndex) >>> 0;
    const next = owned ? cur | bit : cur & ~bit;
    if (next >>> 0 === cur >>> 0) return;
    write(itemIndex, next);
  };

  const setAllColors = (itemIndex: number, owned: boolean, colorCount: number): void => {
    const cur = read(itemIndex);
    const valid = validMask(colorCount);
    const next = owned ? (cur | valid) >>> 0 : (cur & ~valid) >>> 0;
    if (next === cur) return;
    write(itemIndex, next);
  };

  const popcount = (mask: number): number => {
    let m = mask >>> 0;
    let n = 0;
    while (m) {
      n += m & 1;
      m >>>= 1;
    }
    return n;
  };

  return {
    available: mii != null && leaf != null,
    read,
    write,
    validMask,
    ownedColors,
    toggleColor,
    setAllColors,
    popcount,
  };
}
