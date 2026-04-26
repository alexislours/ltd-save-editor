<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { _ } from 'svelte-i18n';
  import { TILE_DEFS, tileLabelForHash, type TileDef } from './tiles';

  type Props = {
    selectedHash: number;
    onSelect: (hash: number) => void;
    extraTiles?: TileDef[];
  };

  let { selectedHash, onSelect, extraTiles = [] }: Props = $props();

  const items = $derived.by(() => {
    const knownHashes = new SvelteSet(TILE_DEFS.map((t) => t.hash >>> 0));
    const merged: TileDef[] = TILE_DEFS.filter((t) => !t.internal);
    for (const t of extraTiles) {
      if (!knownHashes.has(t.hash >>> 0)) merged.push(t);
    }
    return merged
      .map((t) => ({ tile: t, label: tileLabelForHash(t.hash, $_) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  });
</script>

<ul class="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
  {#each items as { tile, label } (tile.hash)}
    {@const active = tile.hash >>> 0 === selectedHash >>> 0}
    <li>
      <button
        type="button"
        onclick={() => onSelect(tile.hash)}
        class={[
          'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors',
          active
            ? 'border-orange-600 bg-orange-500 text-white shadow'
            : 'border-edge/60 bg-surface text-content hover:bg-surface-muted',
        ]}
      >
        <span
          class="h-4 w-4 shrink-0 rounded-sm border border-black/10"
          style="background-color: {tile.color}"
          aria-hidden="true"
        ></span>
        <span class="truncate">{label}</span>
      </button>
    </li>
  {/each}
</ul>
