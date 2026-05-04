import { track } from '$lib/analytics';
import { redirectIfNeeded } from '$lib/bulk/bulkLoader.svelte';
import { restoreSaveFromDecoded, SAVE_KINDS, type SaveKind } from '$lib/saveFile/saveFile.svelte';
import {
  clearAllSessions,
  deleteSession,
  getAllSessions,
  type StoredSession,
} from '$lib/session/sessionStore';
import {
  clearSidecar,
  restorePersistedSidecars,
  type SidecarRestoreSummary,
} from '$lib/shareMii/sidecar/sidecarStore.svelte';

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

let bootScanStarted = false;

export async function bootRestoreScan(): Promise<void> {
  if (bootScanStarted) return;
  bootScanStarted = true;
  const [sidecar, sessions] = await Promise.all([restorePersistedSidecars(), getAllSessions()]);
  state.sidecar = sidecar;
  if (sessions.length === 0 && !sidecar) {
    state.loaded = true;
    return;
  }
  state.sessions = sessions.sort((a, b) => SAVE_KINDS.indexOf(a.kind) - SAVE_KINDS.indexOf(b.kind));
  state.open = true;
  state.loaded = true;
  track('restore_prompted', {
    count: sessions.length,
    sidecar_count: sidecar?.count ?? 0,
  });
}

export function confirmRestore(): void {
  const loaded: SaveKind[] = [];
  for (const session of state.sessions) {
    try {
      restoreSaveFromDecoded(session.kind, {
        name: session.name,
        size: session.size,
        lastModified: session.lastModified,
        decoded: session.decoded,
      });
      loaded.push(session.kind);
    } catch {
      track('restore_failed', { kind: session.kind });
      void deleteSession(session.kind);
    }
  }
  track('restore_accepted', {
    count: loaded.length,
    sidecar_count: state.sidecar?.count ?? 0,
  });
  state.open = false;
  state.sessions = [];
  state.sidecar = null;
  redirectIfNeeded(loaded);
}

export function dismissRestore(): void {
  const count = state.sessions.length;
  const sidecarCount = state.sidecar?.count ?? 0;
  state.open = false;
  state.sessions = [];
  state.sidecar = null;
  clearSidecar();
  void clearAllSessions();
  track('restore_dismissed', { count, sidecar_count: sidecarCount });
}
