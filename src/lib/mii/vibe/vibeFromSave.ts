import { MII_SCHEMA } from '@alexislours/ltd-savedata/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import type { ResidentVibeInput } from './islandVibe';

const VIBE_LEAVES = [
  MII_SCHEMA.Mii.CharacterParam.Gaiety,
  MII_SCHEMA.Mii.CharacterParam.Activeness,
  MII_SCHEMA.Mii.CharacterParam.Audaciousness,
  MII_SCHEMA.Mii.CharacterParam.Sociability,
] as const;

export function hasVibeInputs(mii: MiiAccessor): boolean {
  return VIBE_LEAVES.every((leaf) => mii.has(leaf));
}

export function readVibeInputs(mii: MiiAccessor, populated: number[]): ResidentVibeInput[] {
  const [gaiety, activeness, audaciousness, sociability] = VIBE_LEAVES.map((leaf) => mii.get(leaf));
  return populated.map((index) => ({
    index,
    gaiety: gaiety[index] ?? 0,
    activeness: activeness[index] ?? 0,
    audaciousness: audaciousness[index] ?? 0,
    sociability: sociability[index] ?? 0,
  }));
}
