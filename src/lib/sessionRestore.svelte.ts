import { track } from './analytics';
import { SAVE_KINDS, setSaveFromBytes, type SaveKind } from './saveFile.svelte';
import { clearAllSessions, getAllSessions, type StoredSession } from './sessionStore';
import {
  clearSidecar,
  restorePersistedSidecars,
  type SidecarRestoreSummary,
} from './shareMii/sidecarStore.svelte';

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
    setSaveFromBytes(
      session.kind,
      { name: session.name, bytes: session.bytes, lastModified: session.lastModified },
      { persist: false },
    );
    loaded.push(session.kind);
  }
  track('restore_accepted', {
    count: loaded.length,
    sidecar_count: state.sidecar?.count ?? 0,
  });
  state.open = false;
  state.sessions = [];
  state.sidecar = null;
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
