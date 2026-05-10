import type { SaveKind } from '$lib/saveFile/types';

const modal = $state<{ open: boolean; items: SaveKind[] }>({
  open: false,
  items: [],
});

export const clearAllModal = modal;
