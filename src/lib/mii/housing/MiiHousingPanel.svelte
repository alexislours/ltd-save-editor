<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { isSaveLoaded } from '$lib/saveFile/saveFile.svelte';
  import HousePicker from '$lib/map/residents/HousePicker.svelte';
  import RoommateFriendshipDialog from '$lib/map/residents/RoommateFriendshipDialog.svelte';
  import EmptyHouseDeleteDialog from '$lib/map/residents/EmptyHouseDeleteDialog.svelte';
  import { createResidentMutations } from '$lib/map/residents/residentMutations.svelte';
  import {
    allHouses,
    isMiiSaveAvailable,
    residentsState,
    syncResidents,
    unhousedMiis,
    type HouseSummary,
    type Resident,
  } from '$lib/map/residents/residents.svelte';
  import { mapDisplayLabel } from '$lib/map/tiles/mapNameRegistry';
  import { syncFromSave as syncFloorFromSave } from '$lib/map/state/mapEditor.svelte';
  import { syncFromSave as syncObjectsFromSave } from '$lib/map/state/mapObjectsEditor.svelte';

  const mapLoaded = $derived(isSaveLoaded('map'));

  $effect(() => {
    if (!mapLoaded) return;
    syncFloorFromSave();
    syncObjectsFromSave();
    syncResidents();
  });

  const miiAvailable = $derived.by(() => {
    void residentsState.rev;
    return isMiiSaveAvailable();
  });

  const houses = $derived.by<HouseSummary[]>(() => {
    void residentsState.rev;
    if (!mapLoaded || !miiAvailable) return [];
    return allHouses();
  });

  const unhoused = $derived.by(() => {
    void residentsState.rev;
    if (!mapLoaded || !miiAvailable) return [];
    return unhousedMiis();
  });

  const mut = createResidentMutations();

  type Slot = { room: number; resident: Resident | null; overflow: boolean };

  function buildSlots(h: HouseSummary): Slot[] {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const byRoom = new Map<number, Resident>();
    const overflow: Resident[] = [];
    for (const r of h.residents) {
      if (r.roomIndex >= 0 && r.roomIndex < h.roomCount && !byRoom.has(r.roomIndex)) {
        byRoom.set(r.roomIndex, r);
      } else {
        overflow.push(r);
      }
    }
    const out: Slot[] = [];
    for (let i = 0; i < h.roomCount; i++) {
      out.push({ room: i, resident: byRoom.get(i) ?? null, overflow: false });
    }
    for (const r of overflow) {
      out.push({ room: r.roomIndex, resident: r, overflow: true });
    }
    return out;
  }

  const SECTION_LABEL_CLASS =
    'text-[11px] font-semibold uppercase tracking-wider text-content-muted';

  const dialogTitle = $derived.by(() => {
    const ctx = mut.dialogCtx;
    if (!ctx) return '';
    if (ctx.kind === 'add') {
      return $_('map.residents.add_title', {
        values: { house: mapDisplayLabel(ctx.toMapId).label, room: ctx.toRoom },
      });
    }
    return $_('map.residents.move_title');
  });
</script>

<section class="grid gap-4">
  <header class="grid gap-1">
    <h3 class="text-base font-bold text-content-strong">{$_('mii.housing.title')}</h3>
    <p class="text-xs text-content-muted">{$_('mii.housing.intro')}</p>
  </header>

  {#if !mapLoaded}
    <div class="rounded-lg bg-surface-muted p-3 text-sm text-content-muted ring-1 ring-edge/40">
      {$_('mii.housing.map_not_loaded')}
    </div>
  {:else if !isSaveLoaded('mii')}
    <div class="rounded-lg bg-surface-muted p-3 text-sm text-content-muted ring-1 ring-edge/40">
      {$_('map.residents.mii_not_loaded')}
    </div>
  {:else if !miiAvailable}
    <div class="rounded-lg bg-surface-muted p-3 text-sm text-content-muted ring-1 ring-edge/40">
      {$_('map.residents.mii_unavailable')}
    </div>
  {:else if houses.length === 0}
    <div class="rounded-lg bg-surface-muted p-3 text-sm text-content-muted ring-1 ring-edge/40">
      {$_('mii.housing.no_houses')}
    </div>
  {:else}
    <ul class="grid gap-3">
      {#each houses as h (h.mapId)}
        {@const slots = buildSlots(h)}
        {@const label = mapDisplayLabel(h.mapId).label}
        <li class="grid gap-2 rounded-xl bg-surface p-3 shadow-sm ring-1 ring-edge/60">
          <header class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-content-strong">{label}</p>
              <p class="text-[10px] font-mono text-content-faint">id {h.mapId}</p>
            </div>
            <span
              class="shrink-0 text-[10px] font-bold uppercase tracking-wider text-content-muted"
            >
              {$_('mii.housing.rooms_filled', {
                values: { filled: h.residents.length, total: h.roomCount },
              })}
            </span>
          </header>

          <ul class="grid gap-1.5">
            {#each slots as slot, i (i)}
              <li
                class={[
                  'flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-2 py-1.5 ring-1 ring-edge/40',
                  slot.overflow ? 'ring-amber-500/60' : '',
                ]}
              >
                <span
                  class={[
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1',
                    slot.overflow
                      ? 'bg-amber-500/15 text-amber-700 ring-amber-500/40'
                      : 'bg-surface text-content-strong ring-edge/40',
                  ]}
                  title={$_('map.residents.room_short', { values: { index: slot.room } })}
                >
                  {slot.room}
                </span>

                <div class="flex min-w-0 flex-1 items-center gap-2">
                  {#if slot.resident}
                    <span class="min-w-0 flex-1 truncate text-sm font-bold text-content-strong">
                      {slot.resident.name || $_('map.residents.unnamed')}
                    </span>
                    <span class="font-mono text-[10px] text-content-faint">
                      #{slot.resident.miiIndex}
                    </span>
                  {:else}
                    <span class="flex-1 text-xs italic text-content-muted">
                      {$_('map.residents.empty_room')}
                    </span>
                  {/if}
                </div>

                <div class="flex shrink-0 flex-wrap items-center gap-1">
                  {#if slot.resident && !slot.overflow}
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface text-content ring-1 ring-edge/60 hover:bg-surface-sunken disabled:opacity-30"
                      disabled={slot.room === 0}
                      onclick={() =>
                        mut.moveRoom(
                          h.residents,
                          h.roomCount,
                          slot.resident!.miiIndex,
                          slot.room,
                          -1,
                        )}
                      title={$_('map.residents.move_up_hint')}
                      aria-label={$_('map.residents.move_up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface text-content ring-1 ring-edge/60 hover:bg-surface-sunken disabled:opacity-30"
                      disabled={slot.room >= h.roomCount - 1}
                      onclick={() =>
                        mut.moveRoom(
                          h.residents,
                          h.roomCount,
                          slot.resident!.miiIndex,
                          slot.room,
                          1,
                        )}
                      title={$_('map.residents.move_down_hint')}
                      aria-label={$_('map.residents.move_down')}
                    >
                      ↓
                    </button>
                  {/if}

                  {#if slot.resident}
                    <button
                      type="button"
                      class="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-content ring-1 ring-edge/60 hover:bg-surface-sunken"
                      onclick={() =>
                        mut.openMoveDialog(slot.resident!.miiIndex, h.mapId, slot.room)}
                      title={$_('map.residents.move_hint')}
                    >
                      {$_('map.residents.move')}
                    </button>
                    {#if slot.overflow}
                      <button
                        type="button"
                        class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                        onclick={() => mut.fixOverflowRoom(h.residents, slot.resident!.miiIndex)}
                        title={$_('map.residents.fix_overflow_hint')}
                      >
                        {$_('map.residents.fix_overflow')}
                      </button>
                    {/if}
                    <button
                      type="button"
                      class="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-danger ring-1 ring-edge/60 hover:bg-surface-sunken"
                      onclick={() => mut.remove(slot.resident!.miiIndex, h.mapId)}
                      title={$_('map.residents.remove_hint')}
                    >
                      {$_('map.residents.remove')}
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-orange-600"
                      onclick={() => mut.openAddDialog(h.mapId, slot.room)}
                      title={$_('map.residents.add_hint')}
                    >
                      + {$_('map.residents.add')}
                    </button>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>

    <section class="grid gap-2">
      <span class={SECTION_LABEL_CLASS}>
        {$_('mii.housing.unhoused_section', { values: { count: unhoused.length } })}
      </span>
      {#if unhoused.length === 0}
        <p
          class="rounded-lg bg-surface-muted p-3 text-xs italic text-content-muted ring-1 ring-edge/40"
        >
          {$_('mii.housing.unhoused_empty')}
        </p>
      {:else}
        <ul class="grid gap-1.5 sm:grid-cols-2">
          {#each unhoused as m (m.miiIndex)}
            <li
              class="flex items-center gap-2 rounded-lg bg-surface-muted px-2 py-1.5 ring-1 ring-edge/40"
            >
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <span class="min-w-0 flex-1 truncate text-sm font-bold text-content-strong">
                  {m.name || $_('map.residents.unnamed')}
                </span>
                <span class="font-mono text-[10px] text-content-faint">#{m.miiIndex}</span>
              </div>
              <button
                type="button"
                class="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-orange-600"
                onclick={() => mut.openAssignDialog(m.miiIndex)}
                title={$_('mii.housing.assign_hint')}
              >
                {$_('mii.housing.assign')}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</section>

<RoommateFriendshipDialog
  bind:open={mut.friendshipOpen}
  impact={mut.pendingImpact}
  onConfirm={() => mut.confirmFriendshipBump()}
  onCancel={() => mut.cancelFriendshipBump()}
/>

<EmptyHouseDeleteDialog
  bind:open={mut.emptyHouseDialogOpen}
  mapId={mut.emptyHouseDialogMapId}
  onConfirm={() => mut.confirmEmptyHouseDelete()}
  onCancel={() => mut.cancelEmptyHouseDelete()}
/>

<HousePicker
  bind:open={mut.dialogOpen}
  mode={mut.dialogCtx?.kind === 'add' ? 'resident' : 'destination'}
  title={dialogTitle}
  selfMiiIndex={mut.dialogCtx?.kind === 'move' || mut.dialogCtx?.kind === 'assign'
    ? mut.dialogCtx.miiIndex
    : null}
  currentMapId={mut.dialogCtx?.kind === 'move' ? mut.dialogCtx.fromMapId : undefined}
  currentRoomIndex={mut.dialogCtx?.kind === 'move' ? mut.dialogCtx.fromRoom : undefined}
  targetMapId={mut.dialogCtx?.kind === 'add' ? mut.dialogCtx.toMapId : undefined}
  targetRoomIndex={mut.dialogCtx?.kind === 'add' ? mut.dialogCtx.toRoom : undefined}
  onPick={(target) => mut.handlePick(target)}
  onCancel={() => mut.closeDialog()}
/>
