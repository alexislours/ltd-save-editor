<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { isSaveLoaded } from '$lib/saveFile/saveFile.svelte';
  import { roomCountForActor } from '$lib/map/actors/actors';
  import HousePicker from './HousePicker.svelte';
  import RoommateFriendshipDialog from './RoommateFriendshipDialog.svelte';
  import EmptyHouseDeleteDialog from './EmptyHouseDeleteDialog.svelte';
  import { createResidentMutations } from './residentMutations.svelte';
  import {
    isMiiSaveAvailable,
    residentsForHouse,
    residentsState,
    type Resident,
  } from './residents.svelte';
  import { mapDisplayLabel } from '../tiles/mapNameRegistry';

  type Props = {
    actorHash: number;
    linkedMapId: number;
  };
  let { actorHash, linkedMapId }: Props = $props();

  const SECTION_LABEL_CLASS =
    'text-[11px] font-semibold uppercase tracking-wider text-content-muted';

  const miiLoaded = $derived.by(() => {
    void residentsState.rev;
    return isSaveLoaded('mii') && isMiiSaveAvailable();
  });

  const declaredRooms = $derived(roomCountForActor(actorHash));

  const residents = $derived.by(() => {
    void residentsState.rev;
    if (!miiLoaded) return [];
    if (linkedMapId < 0) return [];
    return residentsForHouse(linkedMapId);
  });

  const observedMaxRoom = $derived.by(() => {
    let m = -1;
    for (const r of residents) if (r.roomIndex > m) m = r.roomIndex;
    return m;
  });

  const roomCount = $derived(Math.max(declaredRooms, observedMaxRoom + 1));

  type Slot = { room: number; resident: Resident | null };
  const slots = $derived.by<Slot[]>(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const byRoom = new Map<number, Resident>();
    const overflow: Resident[] = [];
    for (const r of residents) {
      if (r.roomIndex >= 0 && r.roomIndex < roomCount && !byRoom.has(r.roomIndex)) {
        byRoom.set(r.roomIndex, r);
      } else {
        overflow.push(r);
      }
    }
    const out: Slot[] = [];
    for (let i = 0; i < roomCount; i++) {
      out.push({ room: i, resident: byRoom.get(i) ?? null });
    }
    for (const r of overflow) out.push({ room: r.roomIndex, resident: r });
    return out;
  });

  const mut = createResidentMutations();

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

<section class="grid gap-2">
  <span class={SECTION_LABEL_CLASS}>{$_('map.residents.title')}</span>

  {#if !isSaveLoaded('mii')}
    <div class="rounded-lg bg-surface-muted p-3 text-xs text-content-muted ring-1 ring-edge/40">
      {$_('map.residents.mii_not_loaded')}
    </div>
  {:else if !miiLoaded}
    <div class="rounded-lg bg-surface-muted p-3 text-xs text-content-muted ring-1 ring-edge/40">
      {$_('map.residents.mii_unavailable')}
    </div>
  {:else if linkedMapId < 0}
    <div class="rounded-lg bg-surface-muted p-3 text-xs text-content-muted ring-1 ring-edge/40">
      {$_('map.residents.no_link')}
    </div>
  {:else if roomCount === 0}
    <div class="rounded-lg bg-surface-muted p-3 text-xs text-content-muted ring-1 ring-edge/40">
      {$_('map.residents.no_rooms')}
    </div>
  {:else}
    <p class="text-xs text-content-muted">
      {$_('map.residents.house_label', {
        values: { name: mapDisplayLabel(linkedMapId).label, id: linkedMapId },
      })}
    </p>
    <ul class="grid gap-1.5">
      {#each slots as slot, i (i)}
        {@const overflow = slot.room >= roomCount}
        <li
          class={[
            'flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-2 py-1.5 ring-1 ring-edge/40',
            overflow ? 'ring-amber-500/60' : '',
          ]}
        >
          <span
            class={[
              'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1',
              overflow
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
              <span class="font-mono text-[10px] text-content-faint">#{slot.resident.miiIndex}</span
              >
            {:else}
              <span class="flex-1 text-xs italic text-content-muted">
                {$_('map.residents.empty_room')}
              </span>
            {/if}
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-1">
            {#if slot.resident && !overflow}
              <button
                type="button"
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface text-content ring-1 ring-edge/60 hover:bg-surface-sunken disabled:opacity-30"
                disabled={slot.room === 0}
                onclick={() =>
                  mut.moveRoom(residents, roomCount, slot.resident!.miiIndex, slot.room, -1)}
                title={$_('map.residents.move_up_hint')}
                aria-label={$_('map.residents.move_up')}
              >
                ↑
              </button>
              <button
                type="button"
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface text-content ring-1 ring-edge/60 hover:bg-surface-sunken disabled:opacity-30"
                disabled={slot.room >= roomCount - 1}
                onclick={() =>
                  mut.moveRoom(residents, roomCount, slot.resident!.miiIndex, slot.room, 1)}
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
                onclick={() => mut.openMoveDialog(slot.resident!.miiIndex, linkedMapId, slot.room)}
                title={$_('map.residents.move_hint')}
              >
                {$_('map.residents.move')}
              </button>
              {#if overflow}
                <button
                  type="button"
                  class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                  onclick={() => mut.fixOverflowRoom(residents, slot.resident!.miiIndex)}
                  title={$_('map.residents.fix_overflow_hint')}
                >
                  {$_('map.residents.fix_overflow')}
                </button>
              {/if}
              <button
                type="button"
                class="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-danger ring-1 ring-edge/60 hover:bg-surface-sunken"
                onclick={() => mut.remove(slot.resident!.miiIndex, linkedMapId)}
                title={$_('map.residents.remove_hint')}
              >
                {$_('map.residents.remove')}
              </button>
            {:else}
              <button
                type="button"
                class="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-orange-600"
                onclick={() => mut.openAddDialog(linkedMapId, slot.room)}
                title={$_('map.residents.add_hint')}
              >
                + {$_('map.residents.add')}
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
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
