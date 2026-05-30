<script lang="ts">
  import { _ } from 'virtual:i18n/mii+residents+advanced';
  import { allFoods } from '$lib/sav/lists/foodList.svelte';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import type { SchemaLeaf } from '$lib/sav/schema/leaf';
  import { miiAccessor } from './miiEditor.svelte';

  type Props = {
    index: number;
  };
  let { index }: Props = $props();

  const FOOD_LEAVES: readonly SchemaLeaf[] = [
    MII_SCHEMA.Mii.MiiMisc.EatInfo.UltraBestId,
    MII_SCHEMA.Mii.MiiMisc.EatInfo.BestId,
    MII_SCHEMA.Mii.MiiMisc.EatInfo.UltraWorstId,
    MII_SCHEMA.Mii.MiiMisc.EatInfo.WorstId,
  ];

  function randomize() {
    const foods = allFoods();
    if (foods.length === 0) return;
    const mii = miiAccessor();
    if (!mii) return;
    const chosen: number[] = [];
    for (const leaf of FOOD_LEAVES) {
      if (!mii.has(leaf)) continue;
      let hash = 0;
      for (let attempt = 0; attempt < 16; attempt++) {
        hash = foods[Math.floor(Math.random() * foods.length)].hash;
        if (!chosen.includes(hash)) break;
      }
      chosen.push(hash);
      try {
        mii.setElement(leaf, index, hash);
      } catch {
        /* schema mismatch handled upstream */
      }
    }
  }
</script>

<button
  type="button"
  class="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-content-strong shadow ring-1 ring-edge/60 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95"
  onclick={randomize}
  title={$_('mii.food.random_title')}
>
  <svg
    class="h-5 w-5 text-orange-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="m18 14 4 4-4 4" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
    <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
    <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
  </svg>
  {$_('mii.food.random')}
</button>
