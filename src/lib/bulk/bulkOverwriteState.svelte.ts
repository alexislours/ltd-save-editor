import type { SaveKind } from '$lib/saveFile/types';

const modal = $state<{ open: boolean; conflicts: SaveKind[] }>({
  open: false,
  conflicts: [],
});

export const overwriteModal = modal;
