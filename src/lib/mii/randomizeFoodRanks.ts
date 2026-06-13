import { MII_SCHEMA, type SchemaLeaf } from '@alexislours/ltd-savedata/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { allFoods } from '$lib/sav/lists/foodList.svelte';

const EAT = MII_SCHEMA.Mii.MiiMisc.EatInfo;

const FOOD_RANK_LEAVES: readonly SchemaLeaf[] = [
  EAT.UltraBestId,
  EAT.BestId,
  EAT.UltraWorstId,
  EAT.WorstId,
];

export function randomizeFoodRanks(mii: MiiAccessor, index: number): void {
  const foods = allFoods();
  if (foods.length === 0) return;
  const chosen: number[] = [];
  for (const leaf of FOOD_RANK_LEAVES) {
    if (!mii.has(leaf)) continue;
    let hash = 0;
    for (let attempt = 0; attempt < 16; attempt++) {
      hash = foods[Math.floor(Math.random() * foods.length)].hash;
      if (!chosen.includes(hash)) break;
    }
    chosen.push(hash);
    mii.setElement(leaf, index, hash);
  }
}
