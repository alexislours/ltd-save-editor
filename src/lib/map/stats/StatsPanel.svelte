<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { ActorGroup } from '$lib/map/actors/actors';
  import { hexU32 } from '$lib/sav/format';
  import { tileLabelForHash } from '$lib/map/tiles/tiles';
  import {
    issues,
    objectCounts,
    tileCoverage,
    type OverlapIssue,
    type UnknownTileIssue,
  } from './stats.svelte';
  import { snapToCells, snapToObject, snapToTile } from '../input/snapTo.svelte';
  import { isSaveLoaded } from '$lib/saveFile/saveFile.svelte';
  import { showToast } from '$lib/toast/toast.svelte';
  import HousePicker, { type PickResult } from '../residents/HousePicker.svelte';
  import {
    emptyHouses,
    housingStats,
    isMiiSaveAvailable,
    moveToHouseRoom,
    removeFromHouse,
    residentsState,
    setHouseAssignment,
    swapResidents,
    unhousedMiis,
  } from '../residents/residents.svelte';
  import { mapDisplayLabel } from '../tiles/mapNameRegistry';

  type Props = {
    open: boolean;
    onToggle: () => void;
    onPickGroup: (group: ActorGroup) => void;
  };

  let { open, onToggle, onPickGroup }: Props = $props();

  const coverage = $derived(tileCoverage());
  const counts = $derived(objectCounts());
  const allIssues = $derived(issues());

  let oobOpen = $state(false);
  let overlapsOpen = $state(false);
  let unknownActorsOpen = $state(false);
  let unknownTilesOpen = $state(false);
  let unhousedOpen = $state(false);
  let emptyHousesOpen = $state(false);

  const miiLoaded = $derived.by(() => {
    void residentsState.rev;
    return isSaveLoaded('mii') && isMiiSaveAvailable();
  });

  const stats = $derived.by(() => {
    void residentsState.rev;
    if (!miiLoaded) return null;
    return housingStats();
  });

  const unhousedList = $derived.by(() => {
    void residentsState.rev;
    if (!miiLoaded) return [];
    return unhousedMiis();
  });

  const emptyHousesList = $derived.by(() => {
    void residentsState.rev;
    if (!miiLoaded) return [];
    return emptyHouses();
  });

  const totalIssues = $derived(allIssues.total + emptyHousesList.length);

  let assignDialogOpen = $state(false);
  let assignMiiIndex = $state<number | null>(null);
  let assignMiiName = $state('');

  function openAssignDialog(miiIndex: number, name: string): void {
    assignMiiIndex = miiIndex;
    assignMiiName = name;
    assignDialogOpen = true;
  }

  function closeAssignDialog(): void {
    assignDialogOpen = false;
    assignMiiIndex = null;
  }

  function handleAssignPick(target: PickResult): void {
    const mii = assignMiiIndex;
    closeAssignDialog();
    if (mii == null) return;
    if (target.kind === 'unhoused') {
      if (removeFromHouse(mii)) showToast('info', $_('map.residents.removed'));
      return;
    }
    if (target.kind === 'mii') {
      if (swapResidents(mii, target.miiIndex)) showToast('info', $_('map.residents.swapped'));
      return;
    }
    const occupant = target.kind === 'slot' ? target : null;
    if (!occupant) return;
    const result = moveToHouseRoom(mii, occupant.mapId, occupant.roomIndex);
    if (result.ok) {
      showToast(
        'info',
        result.displaced != null ? $_('map.residents.swapped') : $_('map.residents.moved'),
      );
    } else {
      if (setHouseAssignment(mii, occupant.mapId, occupant.roomIndex)) {
        showToast('info', $_('map.residents.added'));
      }
    }
  }

  const SECTION_LABEL_CLASS = 'text-xs uppercase tracking-wider text-content-muted';

  function formatPercent(p: number): string {
    if (p <= 0) return '0%';
    if (p < 0.001) return '<0.1%';
    return `${(p * 100).toFixed(1)}%`;
  }

  function pickCoverage(hash: number): void {
    const row = coverage.find((r) => r.hash === hash);
    if (!row) return;
    if (row.cells.length > 0) snapToCells(row.cells);
    else snapToTile(row.centroid.x, row.centroid.y);
  }

  function snapOverlap(o: OverlapIssue): void {
    if (o.cells.length > 0) snapToCells(o.cells);
    else snapToTile(o.centroid.x, o.centroid.y);
  }

  function snapUnknownTile(t: UnknownTileIssue): void {
    if (t.cells.length > 0) snapToCells(t.cells);
    else snapToTile(t.centroid.x, t.centroid.y);
  }
</script>

<section class="flex flex-col border-t border-edge/40 bg-surface">
  <button
    type="button"
    class="flex h-10 w-full items-center justify-between px-3 text-left hover:bg-surface-muted"
    aria-expanded={open}
    onclick={onToggle}
  >
    <span class="text-sm font-bold text-content-strong">{$_('map.stats.title')}</span>
    <span class="flex items-center gap-2 text-[11px] text-content-muted">
      {#if totalIssues > 0}
        <span
          class="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700"
        >
          {$_('map.stats.issues_count', { values: { count: totalIssues } })}
        </span>
      {/if}
      <svg
        class={['h-3 w-3 transition-transform', open ? 'rotate-180' : '']}
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </span>
  </button>

  {#if open}
    <div class="grid max-h-[40vh] gap-4 overflow-y-auto p-3">
      <section class="grid gap-2">
        <span class={SECTION_LABEL_CLASS}>{$_('map.stats.tile_coverage')}</span>
        {#if coverage.length === 0}
          <p class="text-xs text-content-muted">{$_('map.stats.no_tiles')}</p>
        {:else}
          <ul class="grid gap-0.5">
            {#each coverage as row (row.hash)}
              {@const label = row.code
                ? tileLabelForHash(row.hash, $_)
                : $_('map.stats.unknown_hex', { values: { hex: hexU32(row.hash) } })}
              <li>
                <button
                  type="button"
                  class="grid w-full grid-cols-[1fr_64px] items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-surface-muted"
                  onclick={() => pickCoverage(row.hash)}
                  title={$_('map.stats.snap_to', { values: { target: label } })}
                >
                  <span class="grid min-w-0 gap-1">
                    <span class="truncate text-xs text-content">{label}</span>
                    <span class="block h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <span
                        class="block h-full"
                        style="width: {Math.max(
                          2,
                          row.percent * 100,
                        )}%; background-color: {row.color}"
                      ></span>
                    </span>
                  </span>
                  <span class="text-right font-mono text-[11px] text-content-muted tabular-nums">
                    {formatPercent(row.percent)}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="grid gap-2">
        <span class={SECTION_LABEL_CLASS}>{$_('map.toolbar.layer_objects')}</span>
        <ul class="grid gap-0.5">
          {#each counts.groups as g (g.group)}
            <li>
              <button
                type="button"
                class="flex h-6 w-full items-center justify-between rounded px-1.5 text-xs hover:bg-surface-muted"
                onclick={() => onPickGroup(g.group)}
                title={$_('map.stats.filter_library_by', {
                  values: { group: $_(`map.objects.group.${g.group}`) },
                })}
              >
                <span class="text-content">{$_(`map.objects.group.${g.group}`)}</span>
                <span class="font-mono text-[11px] text-content-muted tabular-nums">
                  {g.count}
                </span>
              </button>
            </li>
          {/each}
          <li
            class="flex h-6 items-center justify-between border-t border-edge/40 px-1.5 pt-1 text-xs text-content-muted"
          >
            <span>{$_('map.stats.free_slots')}</span>
            <span class="font-mono text-[11px] tabular-nums">
              {counts.free} <span class="text-content-faint">/ {counts.total}</span>
            </span>
          </li>
        </ul>
      </section>

      {#if stats}
        <section class="grid gap-2">
          <span class={SECTION_LABEL_CLASS}>{$_('map.residents.title')}</span>
          <ul class="grid gap-0.5">
            <li class="flex h-6 items-center justify-between rounded px-1.5 text-xs">
              <span class="text-content">{$_('map.stats.residents_total')}</span>
              <span class="font-mono text-[11px] text-content-muted tabular-nums"
                >{stats.total}</span
              >
            </li>
            <li class="flex h-6 items-center justify-between rounded px-1.5 text-xs">
              <span class="text-content">{$_('map.stats.residents_housed')}</span>
              <span class="font-mono text-[11px] text-content-muted tabular-nums"
                >{stats.housed}</span
              >
            </li>
            <li>
              <button
                type="button"
                class="flex h-6 w-full items-center justify-between rounded px-1.5 text-xs hover:bg-surface-muted disabled:cursor-default disabled:opacity-60"
                disabled={stats.unhoused === 0}
                onclick={() => (unhousedOpen = !unhousedOpen)}
                aria-expanded={unhousedOpen}
              >
                <span class="flex items-center gap-2">
                  {#if stats.unhoused > 0}
                    <span class="text-amber-500" aria-hidden="true">▲</span>
                  {/if}
                  <span class="text-content">{$_('map.residents.picker_unhoused_label')}</span>
                </span>
                <span
                  class={[
                    'rounded-full px-2 py-0.5 font-mono text-[10px]',
                    stats.unhoused > 0 ? 'bg-amber-500/15 text-amber-700' : 'text-content-faint',
                  ]}
                >
                  {stats.unhoused}
                </span>
              </button>
              {#if unhousedOpen && unhousedList.length > 0}
                <ul class="grid gap-0.5 pl-4">
                  {#each unhousedList as m (m.miiIndex)}
                    <li>
                      <button
                        type="button"
                        class="flex h-7 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                        onclick={() => openAssignDialog(m.miiIndex, m.name)}
                        title={$_('map.stats.residents_unhoused_hint')}
                      >
                        <span class="min-w-0 truncate text-xs font-bold text-content">
                          {m.name || $_('map.residents.unnamed')}
                        </span>
                        <span class="ml-2 shrink-0 font-mono text-[10px] text-content-faint">
                          #{m.miiIndex}
                        </span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else if unhousedOpen}
                <p class="px-1.5 py-1 text-[11px] italic text-content-muted">
                  {$_('map.stats.residents_unhoused_empty')}
                </p>
              {/if}
            </li>
          </ul>
        </section>
      {/if}

      <section class="grid gap-2">
        <span class={SECTION_LABEL_CLASS}>{$_('map.stats.issues_section')}</span>
        {#if totalIssues === 0}
          <p class="text-xs text-content-muted">{$_('map.stats.no_issues')}</p>
        {:else}
          <ul class="grid gap-1">
            {#if emptyHousesList.length > 0}
              <li>
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                  onclick={() => (emptyHousesOpen = !emptyHousesOpen)}
                  aria-expanded={emptyHousesOpen}
                >
                  <span class="flex items-center gap-2">
                    <span class="text-amber-500" aria-hidden="true">▲</span>
                    <span class="text-xs text-content">
                      {$_('map.stats.empty_houses_count', {
                        values: { count: emptyHousesList.length },
                      })}
                    </span>
                  </span>
                  <span
                    class="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-700"
                  >
                    {emptyHousesList.length}
                  </span>
                </button>
                {#if emptyHousesOpen}
                  <ul class="grid gap-0.5 pl-4">
                    {#each emptyHousesList as h (h.index)}
                      {@const label = mapDisplayLabel(h.mapId).label}
                      <li>
                        <button
                          type="button"
                          class="flex h-6 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                          onclick={() => snapToObject(h.index)}
                          title={$_('map.stats.empty_houses_hint')}
                        >
                          <span class="min-w-0 truncate text-xs text-content">{label}</span>
                          <span class="font-mono text-[11px] text-content-faint">
                            id {h.mapId}
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/if}

            {#if allIssues.oob.length > 0}
              <li>
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                  onclick={() => (oobOpen = !oobOpen)}
                  aria-expanded={oobOpen}
                >
                  <span class="flex items-center gap-2">
                    <span class="text-rose-500" aria-hidden="true">●</span>
                    <span class="text-xs text-content">
                      {$_('map.stats.oob_objects', {
                        values: { count: allIssues.oob.length },
                      })}
                    </span>
                  </span>
                  <span
                    class="rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] text-rose-700"
                  >
                    {allIssues.oob.length}
                  </span>
                </button>
                {#if oobOpen}
                  <ul class="grid gap-0.5 pl-4">
                    {#each allIssues.oob as i (i.id)}
                      <li>
                        <button
                          type="button"
                          class="flex h-6 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                          onclick={() => snapToObject(i.index)}
                          title={$_('map.stats.snap_to_slot', { values: { index: i.index } })}
                        >
                          <span class="font-mono text-[11px] text-content-muted">#{i.index}</span>
                          <span class="font-mono text-[11px] text-content-faint">
                            ({i.x}, {i.y})
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/if}

            {#if allIssues.overlaps.length > 0}
              <li>
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                  onclick={() => (overlapsOpen = !overlapsOpen)}
                  aria-expanded={overlapsOpen}
                >
                  <span class="flex items-center gap-2">
                    <span class="text-amber-500" aria-hidden="true">▲</span>
                    <span class="text-xs text-content">
                      {$_('map.stats.overlap_clusters', {
                        values: { count: allIssues.overlaps.length },
                      })}
                    </span>
                  </span>
                  <span
                    class="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-700"
                  >
                    {allIssues.overlaps.length}
                  </span>
                </button>
                {#if overlapsOpen}
                  <ul class="grid gap-0.5 pl-4">
                    {#each allIssues.overlaps as o (o.id)}
                      <li>
                        <button
                          type="button"
                          class="flex h-6 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                          onclick={() => snapOverlap(o)}
                          title={$_('map.stats.snap_cluster')}
                        >
                          <span class="font-mono text-[11px] text-content-muted">
                            ({o.centroid.x}, {o.centroid.y})
                          </span>
                          <span class="font-mono text-[11px] text-content-faint">
                            {$_('map.stats.cells_count', { values: { count: o.cells.length } })}
                            ·
                            {$_('map.stats.obj_count', { values: { count: o.indices.length } })}
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/if}

            {#if allIssues.unknownActors.length > 0}
              <li>
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                  onclick={() => (unknownActorsOpen = !unknownActorsOpen)}
                  aria-expanded={unknownActorsOpen}
                >
                  <span class="flex items-center gap-2">
                    <span class="text-amber-500" aria-hidden="true">▲</span>
                    <span class="text-xs text-content">
                      {$_('map.stats.unknown_actors', {
                        values: { count: allIssues.unknownActors.length },
                      })}
                    </span>
                  </span>
                  <span
                    class="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-700"
                  >
                    {allIssues.unknownActors.length}
                  </span>
                </button>
                {#if unknownActorsOpen}
                  <ul class="grid gap-0.5 pl-4">
                    {#each allIssues.unknownActors as i (i.id)}
                      <li>
                        <button
                          type="button"
                          class="flex h-6 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                          onclick={() => snapToObject(i.index)}
                          title={$_('map.stats.snap_to_slot', { values: { index: i.index } })}
                        >
                          <span class="font-mono text-[11px] text-content-muted">#{i.index}</span>
                          <span class="font-mono text-[11px] text-content-faint">
                            {hexU32(i.actor)}
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/if}

            {#if allIssues.unknownTiles.length > 0}
              <li>
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                  onclick={() => (unknownTilesOpen = !unknownTilesOpen)}
                  aria-expanded={unknownTilesOpen}
                >
                  <span class="flex items-center gap-2">
                    <span class="text-amber-500" aria-hidden="true">▲</span>
                    <span class="text-xs text-content">
                      {$_('map.stats.unknown_tile_hashes', {
                        values: { count: allIssues.unknownTiles.length },
                      })}
                    </span>
                  </span>
                  <span
                    class="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-700"
                  >
                    {allIssues.unknownTiles.length}
                  </span>
                </button>
                {#if unknownTilesOpen}
                  <ul class="grid gap-0.5 pl-4">
                    {#each allIssues.unknownTiles as t (t.id)}
                      <li>
                        <button
                          type="button"
                          class="flex h-6 w-full items-center justify-between rounded px-1.5 text-left hover:bg-surface-muted"
                          onclick={() => snapUnknownTile(t)}
                          title={$_('map.stats.snap_to', { values: { target: hexU32(t.hash) } })}
                        >
                          <span class="font-mono text-[11px] text-content-muted">
                            {hexU32(t.hash)}
                          </span>
                          <span class="font-mono text-[11px] text-content-faint">
                            ×{t.count}
                          </span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/if}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</section>

<HousePicker
  bind:open={assignDialogOpen}
  mode="destination"
  title={$_('map.stats.residents_unhoused_assign_title', {
    values: { name: assignMiiName || $_('map.residents.unnamed') },
  })}
  selfMiiIndex={assignMiiIndex}
  onPick={handleAssignPick}
  onCancel={closeAssignDialog}
/>
