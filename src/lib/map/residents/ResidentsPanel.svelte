<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { isSaveLoaded } from '$lib/saveFile/saveFile.svelte';
  import { showToast } from '$lib/toast/toast.svelte';
  import { roomCountForActor } from '$lib/map/actors/actors';
  import HousePicker, { type PickResult } from './HousePicker.svelte';
  import RoommateFriendshipDialog from './RoommateFriendshipDialog.svelte';
  import EmptyHouseDeleteDialog from './EmptyHouseDeleteDialog.svelte';
  import { applyImpactBump, computeMoveImpact, type MoveImpact } from './housingFriendship';
  import {
    deleteHouseByMapId,
    findHouseRowByMapId,
    getResident,
    isMiiSaveAvailable,
    moveToHouseRoom,
    removeFromHouse,
    residentsForHouse,
    residentsState,
    setHouseAssignment,
    setRoomIndex,
    swapResidents,
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

  type DialogContext =
    | { kind: 'move'; miiIndex: number; fromRoom: number }
    | { kind: 'add'; toRoom: number };

  let dialogOpen = $state(false);
  let dialogCtx = $state<DialogContext | null>(null);

  function openMoveDialog(miiIndex: number, fromRoom: number): void {
    dialogCtx = { kind: 'move', miiIndex, fromRoom };
    dialogOpen = true;
  }

  function openAddDialog(toRoom: number): void {
    dialogCtx = { kind: 'add', toRoom };
    dialogOpen = true;
  }

  function closeDialog(): void {
    dialogOpen = false;
    dialogCtx = null;
  }

  let pendingImpact = $state<MoveImpact | null>(null);
  let pendingAction = $state<(() => void) | null>(null);
  let friendshipOpen = $state(false);

  let emptyHouseQueue = $state<number[]>([]);
  let emptyHouseDialogOpen = $state(false);
  let emptyHouseDialogMapId = $state(-1);

  function dequeueEmptyHousePrompt(): void {
    while (emptyHouseQueue.length > 0) {
      const mapId = emptyHouseQueue[0];
      emptyHouseQueue = emptyHouseQueue.slice(1);
      if (residentsForHouse(mapId).length > 0) continue;
      if (!findHouseRowByMapId(mapId)) continue;
      emptyHouseDialogMapId = mapId;
      emptyHouseDialogOpen = true;
      return;
    }
    emptyHouseDialogMapId = -1;
  }

  function maybePromptForEmpty(mapIds: number[]): void {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const seen = new Set<number>();
    const queue: number[] = [];
    for (const id of mapIds) {
      if (id < 0 || seen.has(id)) continue;
      seen.add(id);
      if (residentsForHouse(id).length > 0) continue;
      if (!findHouseRowByMapId(id)) continue;
      queue.push(id);
    }
    if (queue.length === 0) return;
    emptyHouseQueue = [...emptyHouseQueue, ...queue];
    if (!emptyHouseDialogOpen) dequeueEmptyHousePrompt();
  }

  function confirmEmptyHouseDelete(): void {
    const mapId = emptyHouseDialogMapId;
    emptyHouseDialogMapId = -1;
    if (mapId >= 0) {
      if (deleteHouseByMapId(mapId)) {
        showToast('info', $_('map.residents.empty_house_delete.deleted'));
      }
    }
    dequeueEmptyHousePrompt();
  }

  function cancelEmptyHouseDelete(): void {
    emptyHouseQueue = [];
    emptyHouseDialogMapId = -1;
  }

  function runWithFriendshipGate(
    aMii: number,
    aDest: number,
    bMii: number | null,
    bDest: number | null,
    action: () => void,
  ): void {
    if (aDest < 0 && (bMii == null || bDest == null || bDest < 0)) {
      action();
      return;
    }
    const impact = computeMoveImpact(aMii, aDest, bMii, bDest);
    if (impact.conflicts.length === 0) {
      action();
      return;
    }
    pendingImpact = impact;
    pendingAction = action;
    friendshipOpen = true;
  }

  function confirmFriendshipBump(): void {
    const impact = pendingImpact;
    const action = pendingAction;
    pendingImpact = null;
    pendingAction = null;
    if (!impact || !action) return;
    const bumped = applyImpactBump(impact);
    if (bumped > 0) {
      showToast('info', $_('map.residents.friendship.bumped', { values: { count: bumped } }));
    }
    action();
  }

  function cancelFriendshipBump(): void {
    pendingImpact = null;
    pendingAction = null;
  }

  function handlePick(target: PickResult): void {
    const ctx = dialogCtx;
    closeDialog();
    if (!ctx) return;

    if (ctx.kind === 'move') {
      if (target.kind === 'unhoused') {
        if (removeFromHouse(ctx.miiIndex)) {
          showToast('info', $_('map.residents.removed'));
          maybePromptForEmpty([linkedMapId]);
        }
        return;
      }
      if (target.kind === 'mii') {
        const otherCurrent = getResident(target.miiIndex);
        const bDest = otherCurrent?.houseMapId ?? -1;
        runWithFriendshipGate(target.miiIndex, linkedMapId, ctx.miiIndex, bDest, () => {
          if (swapResidents(ctx.miiIndex, target.miiIndex)) {
            showToast('info', $_('map.residents.swapped'));
            maybePromptForEmpty([linkedMapId, bDest]);
          }
        });
        return;
      }
      if (target.kind === 'slot') {
        const occupant = residentsForHouse(target.mapId).find(
          (r) => r.roomIndex === target.roomIndex,
        );
        const bMii = occupant && occupant.miiIndex !== ctx.miiIndex ? occupant.miiIndex : null;
        const bDest = bMii != null ? linkedMapId : null;
        runWithFriendshipGate(ctx.miiIndex, target.mapId, bMii, bDest, () => {
          const result = moveToHouseRoom(ctx.miiIndex, target.mapId, target.roomIndex);
          if (result.ok) {
            showToast(
              'info',
              result.displaced != null ? $_('map.residents.swapped') : $_('map.residents.moved'),
            );
            maybePromptForEmpty([linkedMapId]);
          }
        });
      }
      return;
    }

    if (ctx.kind === 'add' && target.kind === 'mii') {
      const oldHouse = getResident(target.miiIndex)?.houseMapId ?? -1;
      runWithFriendshipGate(target.miiIndex, linkedMapId, null, null, () => {
        if (setHouseAssignment(target.miiIndex, linkedMapId, ctx.toRoom)) {
          showToast('info', $_('map.residents.added'));
          if (oldHouse !== linkedMapId) maybePromptForEmpty([oldHouse]);
        }
      });
    }
  }

  function onRemove(miiIndex: number): void {
    if (removeFromHouse(miiIndex)) {
      showToast('info', $_('map.residents.removed'));
      maybePromptForEmpty([linkedMapId]);
    }
  }

  function moveRoom(miiIndex: number, fromRoom: number, dir: -1 | 1): void {
    const target = fromRoom + dir;
    if (target < 0 || target >= roomCount) return;
    const occupant = residents.find((r) => r.roomIndex === target);
    if (occupant) {
      if (swapResidents(miiIndex, occupant.miiIndex)) {
        showToast('info', $_('map.residents.reordered'));
      }
    } else if (setRoomIndex(miiIndex, target)) {
      showToast('info', $_('map.residents.reordered'));
    }
  }

  function fixOverflowRoom(miiIndex: number): void {
    let target = 0;
    const used = new Set(residents.filter((r) => r.miiIndex !== miiIndex).map((r) => r.roomIndex));
    while (used.has(target)) target++;
    if (setRoomIndex(miiIndex, target)) {
      showToast('info', $_('map.residents.reordered'));
    }
  }
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
                onclick={() => moveRoom(slot.resident!.miiIndex, slot.room, -1)}
                title={$_('map.residents.move_up_hint')}
                aria-label={$_('map.residents.move_up')}
              >
                ↑
              </button>
              <button
                type="button"
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface text-content ring-1 ring-edge/60 hover:bg-surface-sunken disabled:opacity-30"
                disabled={slot.room >= roomCount - 1}
                onclick={() => moveRoom(slot.resident!.miiIndex, slot.room, 1)}
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
                onclick={() => openMoveDialog(slot.resident!.miiIndex, slot.room)}
                title={$_('map.residents.move_hint')}
              >
                {$_('map.residents.move')}
              </button>
              {#if overflow}
                <button
                  type="button"
                  class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
                  onclick={() => fixOverflowRoom(slot.resident!.miiIndex)}
                  title={$_('map.residents.fix_overflow_hint')}
                >
                  {$_('map.residents.fix_overflow')}
                </button>
              {/if}
              <button
                type="button"
                class="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-danger ring-1 ring-edge/60 hover:bg-surface-sunken"
                onclick={() => onRemove(slot.resident!.miiIndex)}
                title={$_('map.residents.remove_hint')}
              >
                {$_('map.residents.remove')}
              </button>
            {:else}
              <button
                type="button"
                class="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow hover:bg-orange-600"
                onclick={() => openAddDialog(slot.room)}
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
  bind:open={friendshipOpen}
  impact={pendingImpact}
  onConfirm={confirmFriendshipBump}
  onCancel={cancelFriendshipBump}
/>

<EmptyHouseDeleteDialog
  bind:open={emptyHouseDialogOpen}
  mapId={emptyHouseDialogMapId}
  onConfirm={confirmEmptyHouseDelete}
  onCancel={cancelEmptyHouseDelete}
/>

<HousePicker
  bind:open={dialogOpen}
  mode={dialogCtx?.kind === 'add' ? 'resident' : 'destination'}
  title={dialogCtx?.kind === 'add'
    ? $_('map.residents.add_title', {
        values: {
          house: mapDisplayLabel(linkedMapId).label,
          room: dialogCtx.toRoom,
        },
      })
    : $_('map.residents.move_title')}
  selfMiiIndex={dialogCtx?.kind === 'move' ? dialogCtx.miiIndex : null}
  currentMapId={dialogCtx?.kind === 'move' ? linkedMapId : undefined}
  currentRoomIndex={dialogCtx?.kind === 'move' ? dialogCtx.fromRoom : undefined}
  targetMapId={dialogCtx?.kind === 'add' ? linkedMapId : undefined}
  targetRoomIndex={dialogCtx?.kind === 'add' ? dialogCtx.toRoom : undefined}
  onPick={handlePick}
  onCancel={closeDialog}
/>
