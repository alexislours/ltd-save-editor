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
}

export function confirmClearAll(): void {
  modal.open = false;
  clearAllSaves();
}

export function cancelClearAll(): void {
  modal.open = false;
}
