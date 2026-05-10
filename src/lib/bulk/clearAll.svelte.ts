import { track } from '$lib/analytics';
import { clearAllModal } from '$lib/bulk/clearAllState.svelte';
import { clearAllSaves, getSave } from '$lib/saveFile/saveFile.svelte';
import { SAVE_KINDS } from '$lib/saveFile/types';

export function requestClearAll(): void {
  const items = SAVE_KINDS.filter((k) => getSave(k) != null);
  if (items.length === 0) return;
  clearAllModal.items = items;
  clearAllModal.open = true;
  track('clear_all_requested', { count: items.length });
}

export function confirmClearAll(): void {
  const count = clearAllModal.items.length;
  clearAllModal.open = false;
  clearAllSaves();
  track('clear_all_confirmed', { count });
}

export function cancelClearAll(): void {
  const count = clearAllModal.items.length;
  clearAllModal.open = false;
  track('clear_all_cancelled', { count });
}
