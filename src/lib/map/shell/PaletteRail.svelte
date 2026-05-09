<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import { floorTiles } from '$lib/map/state/mapEditor.svelte';
  import {
    TILE_DEFS,
    tileColorForHash,
    tileDefForHash,
    tileLabelForHash,
    type TileDef,
  } from '$lib/map/tiles/tiles';
  import { INPUT_CLASS } from '$lib/ui/styles';
  import { paintState, selectTileHash } from '../tools/paintState.svelte';
  import TilePatternSwatch from '../tiles/TilePatternSwatch.svelte';

  type Pair = {
    base: TileDef;
    road: TileDef | null;
    baseLabel: string;
    roadLabel: string | null;
  };

  let query = $state('');

  const pairs = $derived.by((): Pair[] => {
    const byCode = new SvelteMap<string, TileDef>();
    for (const t of TILE_DEFS) {
      if (t.internal) continue;
      byCode.set(t.code, t);
    }
    const seen = new SvelteSet<string>();
    const out: Pair[] = [];
    for (const t of TILE_DEFS) {
      if (t.internal) continue;
      const isRoad = t.code.endsWith('_Road');
      const baseCode = isRoad ? t.code.slice(0, -'_Road'.length) : t.code;
      if (seen.has(baseCode)) continue;
      seen.add(baseCode);
      const base = byCode.get(baseCode) ?? t;
      const road = byCode.get(`${baseCode}_Road`) ?? null;
      out.push({
        base,
        road,
        baseLabel: tileLabelForHash(base.hash, $_),
        roadLabel: road ? tileLabelForHash(road.hash, $_) : null,
      });
    }
    out.sort((a, b) => a.baseLabel.localeCompare(b.baseLabel, undefined, { sensitivity: 'base' }));
    return out;
  });

  const filteredPairs = $derived.by((): Pair[] => {
    const q = query.trim().toLowerCase();
    if (!q) return pairs;
    return pairs.filter(
      (p) =>
        p.baseLabel.toLowerCase().includes(q) ||
        (p.roadLabel?.toLowerCase().includes(q) ?? false) ||
        p.base.code.toLowerCase().includes(q) ||
        (p.road?.code.toLowerCase().includes(q) ?? false),
    );
  });

  const extraTiles = $derived.by((): TileDef[] => {
    const tiles = floorTiles();
    if (!tiles) return [];
    const unknown = new SvelteSet<number>();
    for (let i = 0; i < tiles.length; i++) {
      const h = tiles[i] >>> 0;
      if (!tileDefForHash(h)) unknown.add(h);
    }
    return [...unknown].map((h) => ({
      hash: h,
      code: `0x${h.toString(16).padStart(8, '0')}`,
      color: tileColorForHash(h),
    }));
  });

  const recentTiles = $derived(paintState.recent);
</script>

<aside
  class="row-start-2 col-start-1 hidden h-full min-h-0 w-60 flex-col overflow-hidden bg-surface ring-1 ring-edge/40 md:flex"
>
  {#if recentTiles.length > 0}
    <div class="shrink-0 border-b border-edge/40 px-3 pt-2 pb-2">
      <span class="block pb-1.5 text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {$_('map.palette.recent')}
      </span>
      <div
        class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
        style="scroll-snap-type: x proximity;"
      >
        {#each recentTiles as hash (hash)}
          {@const label = tileLabelForHash(hash, $_)}
          {@const active = paintState.selectedTileHash === hash}
          <button
            type="button"
            class={[
              'h-7 w-7 shrink-0 overflow-hidden rounded-md border transition-shadow',
              active
                ? 'border-orange-500 ring-2 ring-orange-500/60'
                : 'border-edge/60 hover:border-edge',
            ]}
            style="scroll-snap-align: start;"
            title={label}
            aria-label={label}
            onclick={() => selectTileHash(hash)}
          >
            <TilePatternSwatch {hash} class="block h-full w-full" />
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="shrink-0 border-b border-edge/40 px-3 py-2">
    <input
      type="search"
      bind:value={query}
      placeholder={$_('map.palette.search_placeholder')}
      aria-label={$_('map.palette.search_aria')}
      class="{INPUT_CLASS} w-full pointer-coarse:h-11 pointer-coarse:text-base"
    />
  </div>

  <div class="flex-1 min-h-0 overflow-y-auto px-2 py-2">
    <ul class="flex flex-col gap-1.5">
      {#each filteredPairs as pair (pair.base.hash)}
        {@const baseActive = paintState.selectedTileHash === pair.base.hash >>> 0}
        {@const roadActive = pair.road
          ? paintState.selectedTileHash === pair.road.hash >>> 0
          : false}
        <li
          class={[
            'overflow-hidden rounded-lg ring-1',
            baseActive || roadActive ? 'ring-orange-500/70' : 'ring-edge/60',
          ]}
        >
          <button
            type="button"
            class={[
              'flex w-full items-center gap-2 px-2.5 py-1.5 pointer-coarse:py-3 pointer-coarse:min-h-11 pointer-coarse:gap-3 pointer-coarse:text-sm text-left text-xs font-medium transition-colors',
              baseActive
                ? 'bg-orange-500 text-white'
                : 'bg-surface text-content hover:bg-surface-muted',
            ]}
            onclick={() => selectTileHash(pair.base.hash)}
            title={pair.baseLabel}
          >
            <span
              class="h-4 w-4 shrink-0 overflow-hidden rounded-sm border border-black/10"
              aria-hidden="true"
            >
              <TilePatternSwatch hash={pair.base.hash} class="block h-full w-full" />
            </span>
            <span class="truncate">{pair.baseLabel}</span>
          </button>
          {#if pair.road}
            <button
              type="button"
              class={[
                'flex w-full items-center gap-2 border-t border-edge/30 px-2.5 py-1.5 pointer-coarse:py-3 pointer-coarse:min-h-11 pointer-coarse:gap-3 pointer-coarse:text-sm text-left text-xs font-medium transition-colors',
                roadActive
                  ? 'bg-orange-500 text-white'
                  : 'bg-surface text-content hover:bg-surface-muted',
              ]}
              onclick={() => selectTileHash(pair.road!.hash)}
              title={pair.roadLabel ?? ''}
            >
              <span
                class="h-4 w-4 shrink-0 overflow-hidden rounded-sm border border-black/10"
                aria-hidden="true"
              >
                <TilePatternSwatch hash={pair.road.hash} class="block h-full w-full" />
              </span>
              <span class="truncate text-content-muted">
                {pair.roadLabel}
              </span>
            </button>
          {/if}
        </li>
      {/each}
    </ul>

    {#if extraTiles.length > 0}
      <div class="mt-3 border-t border-edge/40 pt-2">
        <span
          class="block px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-content-muted"
        >
          {$_('map.objects.group.unknown')}
        </span>
        <ul class="flex flex-col gap-1.5">
          {#each extraTiles as tile (tile.hash)}
            {@const active = paintState.selectedTileHash === tile.hash >>> 0}
            <li>
              <button
                type="button"
                class={[
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] ring-1 transition-colors',
                  active
                    ? 'bg-orange-500 text-white ring-orange-500'
                    : 'bg-surface text-content ring-edge/60 hover:bg-surface-muted',
                ]}
                onclick={() => selectTileHash(tile.hash)}
                title={tile.code}
              >
                <span
                  class="h-4 w-4 shrink-0 overflow-hidden rounded-sm border border-black/10"
                  aria-hidden="true"
                >
                  <TilePatternSwatch hash={tile.hash} class="block h-full w-full" />
                </span>
                <span class="truncate">{tile.code}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</aside>
