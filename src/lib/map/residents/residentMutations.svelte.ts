import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { showToast } from '$lib/toast/toast.svelte';
import type { PickResult } from './HousePicker.svelte';
import { applyImpactBump, computeMoveImpact, type MoveImpact } from './housingFriendship';
import {
  deleteHouseByMapId,
  findHouseRowByMapId,
  getResident,
  moveToHouseRoom,
  removeFromHouse,
  residentsForHouse,
  setHouseAssignment,
  setRoomIndex,
  swapResidents,
  type Resident,
} from './residents.svelte';

export type DialogContext =
  | { kind: 'move'; miiIndex: number; fromMapId: number; fromRoom: number }
  | { kind: 'add'; toMapId: number; toRoom: number }
  | { kind: 'assign'; miiIndex: number };

type FormatValues = Record<string, string | number | boolean | Date | null>;

function t(key: string, opts?: { values?: FormatValues }): string {
  return get(_)(key, opts);
}

export class ResidentMutations {
  dialogOpen = $state(false);
  dialogCtx = $state<DialogContext | null>(null);

  pendingImpact = $state<MoveImpact | null>(null);
  friendshipOpen = $state(false);

  emptyHouseQueue = $state<number[]>([]);
  emptyHouseDialogOpen = $state(false);
  emptyHouseDialogMapId = $state(-1);

  #pendingAction: (() => void) | null = null;

  openMoveDialog(miiIndex: number, fromMapId: number, fromRoom: number): void {
    this.dialogCtx = { kind: 'move', miiIndex, fromMapId, fromRoom };
    this.dialogOpen = true;
  }

  openAddDialog(toMapId: number, toRoom: number): void {
    this.dialogCtx = { kind: 'add', toMapId, toRoom };
    this.dialogOpen = true;
  }

  openAssignDialog(miiIndex: number): void {
    this.dialogCtx = { kind: 'assign', miiIndex };
    this.dialogOpen = true;
  }

  closeDialog(): void {
    this.dialogOpen = false;
    this.dialogCtx = null;
  }

  #dequeueEmptyHousePrompt(): void {
    while (this.emptyHouseQueue.length > 0) {
      const mapId = this.emptyHouseQueue[0];
      this.emptyHouseQueue = this.emptyHouseQueue.slice(1);
      if (residentsForHouse(mapId).length > 0) continue;
      if (!findHouseRowByMapId(mapId)) continue;
      this.emptyHouseDialogMapId = mapId;
      this.emptyHouseDialogOpen = true;
      return;
    }
    this.emptyHouseDialogMapId = -1;
  }

  #maybePromptForEmpty(mapIds: Array<number | null | undefined>): void {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const seen = new Set<number>();
    const queue: number[] = [];
    for (const id of mapIds) {
      if (id == null || id < 0 || seen.has(id)) continue;
      seen.add(id);
      if (residentsForHouse(id).length > 0) continue;
      if (!findHouseRowByMapId(id)) continue;
      queue.push(id);
    }
    if (queue.length === 0) return;
    this.emptyHouseQueue = [...this.emptyHouseQueue, ...queue];
    if (!this.emptyHouseDialogOpen) this.#dequeueEmptyHousePrompt();
  }

  confirmEmptyHouseDelete(): void {
    const mapId = this.emptyHouseDialogMapId;
    this.emptyHouseDialogMapId = -1;
    if (mapId >= 0 && deleteHouseByMapId(mapId)) {
      showToast('info', t('map.residents.empty_house_delete.deleted'));
    }
    this.#dequeueEmptyHousePrompt();
  }

  cancelEmptyHouseDelete(): void {
    this.emptyHouseQueue = [];
    this.emptyHouseDialogMapId = -1;
  }

  #runWithFriendshipGate(
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
    this.pendingImpact = impact;
    this.#pendingAction = action;
    this.friendshipOpen = true;
  }

  confirmFriendshipBump(): void {
    const impact = this.pendingImpact;
    const action = this.#pendingAction;
    this.pendingImpact = null;
    this.#pendingAction = null;
    if (!impact || !action) return;
    const bumped = applyImpactBump(impact);
    if (bumped > 0) {
      showToast('info', t('map.residents.friendship.bumped', { values: { count: bumped } }));
    }
    action();
  }

  cancelFriendshipBump(): void {
    this.pendingImpact = null;
    this.#pendingAction = null;
  }

  handlePick(target: PickResult): void {
    const ctx = this.dialogCtx;
    this.closeDialog();
    if (!ctx) return;

    if (ctx.kind === 'move' || ctx.kind === 'assign') {
      const movingIndex = ctx.miiIndex;
      const fromMapId = ctx.kind === 'move' ? ctx.fromMapId : -1;

      if (target.kind === 'unhoused') {
        if (removeFromHouse(movingIndex)) {
          showToast('info', t('map.residents.removed'));
          this.#maybePromptForEmpty([fromMapId]);
        }
        return;
      }
      if (target.kind === 'mii') {
        const otherHouse = getResident(target.miiIndex)?.houseMapId ?? -1;
        this.#runWithFriendshipGate(target.miiIndex, fromMapId, movingIndex, otherHouse, () => {
          if (swapResidents(movingIndex, target.miiIndex)) {
            showToast('info', t('map.residents.swapped'));
            this.#maybePromptForEmpty([fromMapId, otherHouse]);
          }
        });
        return;
      }
      if (target.kind === 'slot') {
        const occupant = residentsForHouse(target.mapId).find(
          (r) => r.roomIndex === target.roomIndex,
        );
        const bMii = occupant && occupant.miiIndex !== movingIndex ? occupant.miiIndex : null;
        const bDest = bMii != null ? fromMapId : null;
        this.#runWithFriendshipGate(movingIndex, target.mapId, bMii, bDest, () => {
          const result = moveToHouseRoom(movingIndex, target.mapId, target.roomIndex);
          if (result.ok) {
            showToast(
              'info',
              result.displaced != null ? t('map.residents.swapped') : t('map.residents.moved'),
            );
            this.#maybePromptForEmpty([fromMapId]);
          }
        });
      }
      return;
    }

    if (ctx.kind === 'add' && target.kind === 'mii') {
      const oldHouse = getResident(target.miiIndex)?.houseMapId ?? -1;
      this.#runWithFriendshipGate(target.miiIndex, ctx.toMapId, null, null, () => {
        if (setHouseAssignment(target.miiIndex, ctx.toMapId, ctx.toRoom)) {
          showToast('info', t('map.residents.added'));
          if (oldHouse !== ctx.toMapId) this.#maybePromptForEmpty([oldHouse]);
        }
      });
    }
  }

  remove(miiIndex: number, fromMapId: number): void {
    if (removeFromHouse(miiIndex)) {
      showToast('info', t('map.residents.removed'));
      this.#maybePromptForEmpty([fromMapId]);
    }
  }

  moveRoom(
    residents: readonly Resident[],
    roomCount: number,
    miiIndex: number,
    fromRoom: number,
    dir: -1 | 1,
  ): void {
    const target = fromRoom + dir;
    if (target < 0 || target >= roomCount) return;
    const occupant = residents.find((r) => r.roomIndex === target);
    if (occupant) {
      if (swapResidents(miiIndex, occupant.miiIndex)) {
        showToast('info', t('map.residents.reordered'));
      }
    } else if (setRoomIndex(miiIndex, target)) {
      showToast('info', t('map.residents.reordered'));
    }
  }

  fixOverflowRoom(residents: readonly Resident[], miiIndex: number): void {
    let target = 0;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const used = new Set(residents.filter((r) => r.miiIndex !== miiIndex).map((r) => r.roomIndex));
    while (used.has(target)) target++;
    if (setRoomIndex(miiIndex, target)) {
      showToast('info', t('map.residents.reordered'));
    }
  }
}

export function createResidentMutations(): ResidentMutations {
  return new ResidentMutations();
}
