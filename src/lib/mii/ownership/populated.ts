import { MII_SCHEMA } from '@alexislours/ltd-savedata/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';

export function isAllZero(bytes: Uint8Array): boolean {
  for (let b = 0; b < bytes.length; b++) {
    if (bytes[b] !== 0) return false;
  }
  return true;
}

export function populatedMiiIndices(mii: MiiAccessor): number[] {
  if (!mii.has(MII_SCHEMA.Mii.Name.Name)) return [];
  const names = mii.get(MII_SCHEMA.Mii.Name.Name);
  if (mii.has(MII_SCHEMA.Mii.CharInfoEx)) {
    const elements = mii.get(MII_SCHEMA.Mii.CharInfoEx);
    const out: number[] = [];
    const limit = Math.min(names.length, elements.length);
    for (let i = 0; i < limit; i++) {
      if (!isAllZero(elements[i])) out.push(i);
    }
    return out;
  }
  const out: number[] = [];
  for (let i = 0; i < names.length; i++) {
    if (names[i].length > 0) out.push(i);
  }
  return out;
}
