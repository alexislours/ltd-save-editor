import { allCloths, clothLabel } from '$lib/sav/lists/clothList.svelte';
import { allFoods, foodLabel } from '$lib/sav/lists/foodList.svelte';
import { murmur3_x86_32 } from '$lib/sav/hash';
import { allTreasures, treasureLabel } from '$lib/sav/lists/treasureList.svelte';

type ClothEntry = { hash: number; index: number; label: string };
type TreasureEntry = { hash: number; name: string; label: string };

export function sortedFoodsFor(ui: string | null | undefined) {
  const list = allFoods();
  return [...list].sort((a, b) => {
    const an = foodLabel(a, ui).toLocaleLowerCase();
    const bn = foodLabel(b, ui).toLocaleLowerCase();
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
}

export function sortedClothesFor(ui: string | null | undefined): ClothEntry[] {
  return [...allCloths()]
    .map((c) => ({
      hash: murmur3_x86_32(c.name) >>> 0,
      index: c.index,
      label: clothLabel(c, ui),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function clothByHash(hash: number, ui: string | null | undefined): ClothEntry | null {
  if (hash === 0) return null;
  for (const c of allCloths()) {
    if (murmur3_x86_32(c.name) >>> 0 === hash >>> 0) {
      return { hash, index: c.index, label: clothLabel(c, ui) };
    }
  }
  return null;
}

export function sortedTreasuresFor(ui: string | null | undefined): TreasureEntry[] {
  return [...allTreasures()]
    .map((t) => ({
      hash: murmur3_x86_32(t.name) >>> 0,
      name: t.name,
      label: treasureLabel(t, ui),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function treasureByHash(hash: number, ui: string | null | undefined): TreasureEntry | null {
  if (hash === 0) return null;
  for (const t of allTreasures()) {
    if (murmur3_x86_32(t.name) >>> 0 === hash >>> 0) {
      return { hash, name: t.name, label: treasureLabel(t, ui) };
    }
  }
  return null;
}
