<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { knownMapEntries, mapDisplayLabel } from '../tiles/mapNameRegistry';
  import {
    allIslandMiis,
    residentsForHouse,
    residentsState,
    roomCountForHouse,
    type IslandMii,
    type Resident,
  } from './residents.svelte';

  type SlotPick = { kind: 'slot'; mapId: number; roomIndex: number };
  type MiiPick = { kind: 'mii'; miiIndex: number };
  type UnhousedPick = { kind: 'unhoused' };
  export type PickResult = SlotPick | MiiPick | UnhousedPick;

  type Props = {
    open: boolean;
    mode: 'destination' | 'resident';
    title: string;
    selfMiiIndex?: number | null;
    currentMapId?: number;
    currentRoomIndex?: number;
    targetMapId?: number;
    targetRoomIndex?: number;
    onPick: (target: PickResult) => void;
    onCancel: () => void;
  };
  let {
    open = $bindable(),
    mode,
    title,
    selfMiiIndex = null,
    currentMapId,
    currentRoomIndex,
    targetMapId,
    targetRoomIndex,
    onPick,
    onCancel,
  }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let query = $state('');

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      query = '';
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function close(): void {
    open = false;
    onCancel();
  }

  function pick(target: PickResult): void {
    open = false;
    onPick(target);
  }

  type HouseGroup = {
    mapId: number;
    label: string;
    rooms: Array<{ index: number; resident: Resident | null }>;
  };

  const houseGroups = $derived.by<HouseGroup[]>(() => {
    void residentsState.rev;
    const entries = knownMapEntries();
    const groups: HouseGroup[] = [];
    for (const e of entries) {
      const residents = residentsForHouse(e.id);
      const declared = roomCountForHouse(e.id);
      let observedMax = -1;
      for (const r of residents) if (r.roomIndex > observedMax) observedMax = r.roomIndex;
      const count = Math.max(declared, observedMax + 1);
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const byRoom = new Map<number, Resident>();
      for (const r of residents) {
        if (!byRoom.has(r.roomIndex)) byRoom.set(r.roomIndex, r);
      }
      const rooms: HouseGroup['rooms'] = [];
      for (let i = 0; i < count; i++) {
        rooms.push({ index: i, resident: byRoom.get(i) ?? null });
      }
      groups.push({
        mapId: e.id,
        label: mapDisplayLabel(e.id).label,
        rooms,
      });
    }
    return groups;
  });

  const filteredHouseGroups = $derived.by<HouseGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return houseGroups;
    return houseGroups.filter((g) => {
      if (g.label.toLowerCase().includes(q)) return true;
      return g.rooms.some((r) => r.resident && r.resident.name.toLowerCase().includes(q));
    });
  });

  const islandMiis = $derived.by<IslandMii[]>(() => {
    void residentsState.rev;
    return allIslandMiis();
  });

  const filteredUnhoused = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return islandMiis.filter((m) => {
      if (m.housed) return false;
      if (selfMiiIndex != null && m.miiIndex === selfMiiIndex) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const filteredAllMiis = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return islandMiis
      .filter((m) => {
        if (selfMiiIndex != null && m.miiIndex === selfMiiIndex) return false;
        if (q) {
          const houseLabel = mapDisplayLabel(m.houseMapId).label.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            String(m.miiIndex).includes(q) ||
            houseLabel.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.housed !== b.housed) return a.housed ? -1 : 1;
        if (a.houseMapId !== b.houseMapId) return a.houseMapId - b.houseMapId;
        return a.roomIndex - b.roomIndex || a.miiIndex - b.miiIndex;
      });
  });

  function isCurrent(mapId: number, roomIndex: number): boolean {
    return currentMapId === mapId && currentRoomIndex === roomIndex;
  }

  function isTarget(mapId: number, roomIndex: number): boolean {
    return targetMapId === mapId && targetRoomIndex === roomIndex;
  }
</script>

<dialog
  bind:this={dialog}
  onclose={close}
  class="m-auto w-[min(36rem,calc(100vw_-_2rem))] max-h-[80vh] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div
    class="flex items-center justify-between border-b border-edge/40 bg-surface-muted/80 px-5 py-3"
  >
    <h2 class="text-base font-bold text-content-strong">{title}</h2>
    <button
      type="button"
      class="rounded-full px-2 py-0.5 text-xs text-content-muted hover:bg-surface-sunken"
      onclick={close}
    >
      ✕
    </button>
  </div>

  <div class="px-5 py-3">
    <input
      type="search"
      placeholder={$_('map.residents.picker_search')}
      bind:value={query}
      class="w-full rounded-lg border border-edge/60 bg-surface px-3 py-1.5 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
    />
  </div>

  <div class="grid max-h-[55vh] gap-4 overflow-y-auto px-5 pb-3">
    {#if mode === 'destination'}
      {#each filteredHouseGroups as g (g.mapId)}
        <section class="grid gap-1.5">
          <header class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-content-muted">
              {g.label}
            </span>
            <span class="font-mono text-[10px] text-content-faint">id {g.mapId}</span>
          </header>
          {#if g.rooms.length === 0}
            <p class="text-xs italic text-content-muted">
              {$_('map.residents.no_rooms')}
            </p>
          {:else}
            <ul class="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {#each g.rooms as r (r.index)}
                {@const current = isCurrent(g.mapId, r.index)}
                <li>
                  <button
                    type="button"
                    class={[
                      'flex h-12 w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs ring-1 transition-colors',
                      current
                        ? 'bg-orange-500/10 ring-orange-500'
                        : 'bg-surface-muted ring-edge/40 hover:bg-surface-sunken',
                    ]}
                    disabled={current}
                    onclick={() => pick({ kind: 'slot', mapId: g.mapId, roomIndex: r.index })}
                    title={current ? $_('map.residents.picker_current_slot') : ''}
                  >
                    <span
                      class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-content-strong ring-1 ring-edge/40"
                    >
                      {r.index}
                    </span>
                    <span class="min-w-0 flex-1 truncate">
                      {#if r.resident}
                        <span class="block truncate font-bold">
                          {r.resident.name || $_('map.residents.unnamed')}
                        </span>
                        <span class="block text-[10px] text-content-muted">
                          {$_('map.residents.picker_swap_with')}
                        </span>
                      {:else}
                        <span class="block italic text-content-muted">
                          {$_('map.residents.empty_room')}
                        </span>
                      {/if}
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}

      <section class="grid gap-1.5 border-t border-edge/40 pt-3">
        <span class="text-xs font-bold uppercase tracking-wider text-content-muted">
          {$_('map.residents.picker_unhoused_section')}
        </span>
        <button
          type="button"
          class="rounded-lg bg-surface-muted px-3 py-2 text-left text-xs ring-1 ring-edge/40 hover:bg-surface-sunken"
          onclick={() => pick({ kind: 'unhoused' })}
          title={$_('map.residents.picker_make_unhoused_hint')}
        >
          {$_('map.residents.picker_make_unhoused')}
        </button>
        {#if filteredUnhoused.length > 0}
          <ul class="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {#each filteredUnhoused as m (m.miiIndex)}
              <li>
                <button
                  type="button"
                  class="flex h-10 w-full items-center gap-1.5 rounded-lg bg-surface-muted px-2 py-1 text-left text-xs ring-1 ring-edge/40 hover:bg-surface-sunken"
                  onclick={() => pick({ kind: 'mii', miiIndex: m.miiIndex })}
                >
                  <span class="min-w-0 flex-1 truncate">
                    <span class="block truncate font-bold">
                      {m.name || $_('map.residents.unnamed')}
                    </span>
                    <span class="block text-[10px] text-content-muted">
                      {$_('map.residents.picker_swap_with')}
                    </span>
                  </span>
                  <span class="font-mono text-[10px] text-content-faint">#{m.miiIndex}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else}
      <section class="grid gap-1.5">
        <span class="text-xs font-bold uppercase tracking-wider text-content-muted">
          {$_('map.residents.picker_islanders')}
        </span>
        {#if filteredAllMiis.length === 0}
          <p class="text-xs italic text-content-muted">
            {$_('map.inspector.find.no_matches')}
          </p>
        {:else}
          <ul class="grid gap-1">
            {#each filteredAllMiis as m (m.miiIndex)}
              {@const inTarget = isTarget(m.houseMapId, m.roomIndex)}
              {@const houseLabel = m.housed ? mapDisplayLabel(m.houseMapId).label : null}
              <li>
                <button
                  type="button"
                  class={[
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ring-1 transition-colors',
                    inTarget
                      ? 'bg-orange-500/10 ring-orange-500'
                      : 'bg-surface-muted ring-edge/40 hover:bg-surface-sunken',
                  ]}
                  disabled={inTarget}
                  onclick={() => pick({ kind: 'mii', miiIndex: m.miiIndex })}
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-bold text-content-strong">
                      {m.name || $_('map.residents.unnamed')}
                    </span>
                    <span class="block truncate text-[11px] text-content-muted">
                      {#if m.housed}
                        {$_('map.residents.picker_at_room', {
                          values: { house: houseLabel, room: m.roomIndex },
                        })}
                      {:else}
                        {$_('map.residents.picker_unhoused_label')}
                      {/if}
                    </span>
                  </span>
                  <span class="font-mono text-[10px] text-content-faint">#{m.miiIndex}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </div>

  <div class="flex justify-end gap-2 border-t border-edge/40 bg-surface-muted/40 px-5 py-3">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={close}>
      {$_('map.common.cancel')}
    </button>
  </div>
</dialog>
