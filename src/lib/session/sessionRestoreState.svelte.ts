import type { StoredSession } from '$lib/session/sessionStore';
import type { SidecarRestoreSummary } from '$lib/shareMii/sidecar/sidecarStore.svelte';

type ModalState = {
  open: boolean;
  sessions: StoredSession[];
  sidecar: SidecarRestoreSummary | null;
  loaded: boolean;
};

const state = $state<ModalState>({
  open: false,
  sessions: [],
  sidecar: null,
  loaded: false,
});

export const restoreModal = state;
