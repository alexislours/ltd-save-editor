<script lang="ts">
  import { _ } from 'virtual:i18n/mii+residents+advanced';
  import { locale } from 'svelte-i18n';
  import { CARD_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import { populatedMiiIndices } from '$lib/mii/ownership/populated';
  import { readMiiName } from '$lib/mii/relations/relations';
  import { islandVibeLabel, personalityCategoryLabel } from '$lib/mii/miiLabelList.svelte';
  import { computeIslandVibe, vibeColor, NORMAL_COLOR, OCTANT_COLORS } from './islandVibe';
  import { hasVibeInputs, readVibeInputs } from './vibeFromSave';
  import MiiIslandVibeChart from './MiiIslandVibeChart.svelte';

  const mii = $derived(miiAccessor());
  const available = $derived(mii != null && hasVibeInputs(mii));

  const vibe = $derived.by(() => {
    if (!mii || !available) return null;
    return computeIslandVibe(readVibeInputs(mii, populatedMiiIndices(mii)));
  });

  const vibeLabel = $derived((key: string) => islandVibeLabel(key, $locale) ?? key);
  const categoryLabel = $derived((key: string) => personalityCategoryLabel(key, $locale) ?? key);

  function signed(n: number): string {
    return n > 0 ? `+${n}` : `${n}`;
  }

  const OCTANT_ARROWS = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'] as const;

  function nameOf(idx: number): string {
    return mii ? readMiiName(mii, idx) : '';
  }
</script>

<section class={CARD_CLASS}>
  <h3 class="text-base font-bold text-content-strong">{$_('mii.vibe.graph_title')}</h3>
  <p class="mt-0.5 text-xs text-content-muted">{$_('mii.vibe.intro')}</p>

  {#if !mii || !available}
    <p class="mt-4 text-sm text-content-muted">{$_('mii.vibe.no_data')}</p>
  {:else if vibe && vibe.residentCount === 0}
    <p class="mt-4 text-sm text-content-muted">{$_('mii.vibe.no_populated')}</p>
  {:else if vibe}
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <span
        class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-bold text-white shadow"
        style:background-color={vibeColor(vibe)}
      >
        {vibeLabel(vibe.key)}
      </span>
      <span class="text-sm text-content-muted">
        (SX, SY) = ({signed(vibe.sx)}, {signed(vibe.sy)}) ·
        {$_('mii.vibe.resident_count', { values: { count: vibe.residentCount } })}
      </span>
    </div>

    <div class="mt-4 overflow-auto">
      <MiiIslandVibeChart
        {vibe}
        ariaLabel={$_('mii.vibe.chart_aria', { values: { name: vibeLabel(vibe.key) } })}
        {vibeLabel}
        {categoryLabel}
        {nameOf}
      />
    </div>

    <p class="mt-3 text-xs text-content-muted">{$_('mii.vibe.legend_dots')}</p>

    <div class="mt-4 overflow-x-auto">
      <table class="w-full text-xs text-content">
        <thead>
          <tr class="text-left text-content-muted">
            <th class="py-1 pr-3 font-bold">{$_('mii.vibe.th_direction')}</th>
            <th class="px-3 py-1 font-bold">{$_('mii.vibe.th_strong')}</th>
            <th class="px-3 py-1 font-bold">{$_('mii.vibe.th_weak')}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-edge/40">
            <td class="py-1 pr-3 whitespace-nowrap">
              <span
                class="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                style:background-color={NORMAL_COLOR}
              ></span>
              <span class="align-middle font-mono">•</span>
            </td>
            <td class="px-3 py-1" colspan="2" class:font-bold={vibe.strength === 'normal'}>
              {vibeLabel('Normal')}
            </td>
          </tr>
          {#each OCTANT_ARROWS as glyph, o (o)}
            <tr class="border-t border-edge/40">
              <td class="py-1 pr-3 whitespace-nowrap">
                <span
                  class="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style:background-color={OCTANT_COLORS[o]}
                ></span>
                <span class="align-middle font-mono">{glyph}</span>
              </td>
              <td
                class="px-3 py-1"
                class:font-bold={vibe.strength === 'strong' && vibe.octant === o}
              >
                {vibeLabel(`Strong_0${o}`)}
              </td>
              <td class="px-3 py-1" class:font-bold={vibe.strength === 'weak' && vibe.octant === o}>
                {vibeLabel(`Weak_0${o}`)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
