import { track } from './analytics';
import { clearAllSaves, getSave, SAVE_KINDS, type SaveKind } from './saveFile.svelte';

const modal = $state<{ open: boolean; items: SaveKind[] }>({
  open: false,
  items: [],
});

export const clearAllModal = modal;

export function requestClearAll(): void {
  const items = SAVE_KINDS.filter((k) => getSave(k) != null);
  if (items.length === 0) return;
  modal.items = items;
  modal.open = true;
  track('clear_all_requested', { count: items.length });
}

export function confirmClearAll(): void {
  const count = modal.items.length;
  modal.open = false;
  clearAllSaves();
  track('clear_all_confirmed', { count });
}

export function cancelClearAll(): void {
  const count = modal.items.length;
  modal.open = false;
  track('clear_all_cancelled', { count });
}
