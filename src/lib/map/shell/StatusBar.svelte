<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { floorTiles, indexFromXY } from '$lib/map/state/mapEditor.svelte';
  import { mapSave } from '$lib/map/state/mapSave.svelte';
  import { tileLabelForHash } from '$lib/map/tiles/tiles';
  import { selection } from '../tools/selection.svelte';
  import { floorBaseline } from '../state/baseline.svelte';
  import { layers } from '../state/layers.svelte';

  import { ugcTier } from '../state/ugcEditor.svelte';

  type Props = {
    hover: { x: number; y: number; collisionCount?: number; ugcIndex?: number } | null;
  };

  let { hover }: Props = $props();

  const tileLabel = $derived.by(() => {
    if (!hover) return null;
    const tiles = floorTiles();
    if (!tiles) return null;
    const hash = tiles[indexFromXY(hover.x, hover.y)] >>> 0;
    return tileLabelForHash(hash, $_);
  });

  const diffInfo = $derived.by(() => {
    if (!hover) return null;
    if (!layers.diff.visible) return null;
    const tiles = floorTiles();
    const baseline = floorBaseline();
    if (!tiles || !baseline) return null;
    const idx = indexFromXY(hover.x, hover.y);
    const cur = tiles[idx] >>> 0;
    const base = baseline[idx] >>> 0;
    if (cur === base) return null;
    return {
      was: tileLabelForHash(base, $_),
      now: tileLabelForHash(cur, $_),
    };
  });
</script>

<footer
  class="row-start-3 col-span-3 flex h-7 items-center gap-4 bg-surface-sunken px-3 ring-1 ring-edge/40"
>
  {#if hover}
    <span class="font-mono text-[11px]">
      <span class="text-content-muted">X</span>
      <span class="text-content-strong">{hover.x}</span>
    </span>
    <span class="font-mono text-[11px]">
      <span class="text-content-muted">Y</span>
      <span class="text-content-strong">{hover.y}</span>
    </span>
    {#if tileLabel}
      <span class="font-mono text-[11px] text-content-strong">{tileLabel}</span>
    {/if}
    {#if hover.ugcIndex !== undefined}
      <span class="font-mono text-[11px] text-content-strong">
        {$_('map.status.ugc_tier', {
          values: { index: hover.ugcIndex, tier: ugcTier(hover.ugcIndex) },
        })}
      </span>
    {/if}
    {#if hover.collisionCount && hover.collisionCount >= 2}
      <span class="font-mono text-[11px] text-danger">
        {$_('map.status.collision', { values: { count: hover.collisionCount } })}
      </span>
    {/if}
    {#if diffInfo}
      <span class="font-mono text-[11px] text-orange-500">
        {$_('map.status.modified', { values: { was: diffInfo.was, now: diffInfo.now } })}
      </span>
    {/if}
  {:else}
    <span class="font-mono text-[11px] text-content-muted">
      {$_('map.workbench.status_hover_hint')}
    </span>
  {/if}
  {#if mapSave.dirty}
    <span class="font-mono text-[11px] text-content-strong" aria-label={$_('save.unsaved_changes')}
      >*</span
    >
  {/if}
  {#if selection.indices.size > 0}
    <span class="ml-auto font-mono text-[11px] text-content-strong">
      · {$_('map.status.selected', { values: { count: selection.indices.size } })}
    </span>
  {/if}
</footer>
