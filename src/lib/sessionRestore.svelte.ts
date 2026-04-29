import { track } from './analytics';
import { getPath, navigate } from './navigation.svelte';
import { SAVE_KINDS, setSaveFromBytes, type SaveKind } from './saveFile.svelte';
import { clearAllSessions, getAllSessions, type StoredSession } from './sessionStore';

type ModalState = {
  open: boolean;
  sessions: StoredSession[];
  loaded: boolean;
};

const state = $state<ModalState>({
  open: false,
  sessions: [],
  loaded: false,
});

export const restoreModal = state;

let bootScanStarted = false;

export async function bootRestoreScan(): Promise<void> {
  if (bootScanStarted) return;
  bootScanStarted = true;
  const sessions = await getAllSessions();
  if (sessions.length === 0) {
    state.loaded = true;
    return;
  }
  state.sessions = sessions.sort((a, b) => SAVE_KINDS.indexOf(a.kind) - SAVE_KINDS.indexOf(b.kind));
  state.open = true;
  state.loaded = true;
  track('session_restore_prompted', { count: sessions.length });
}

function redirectIfNeeded(loaded: SaveKind[]): void {
  if (loaded.length === 0) return;
  const path = getPath();
  const currentKind = SAVE_KINDS.find((k) => path === `/${k}`);
  if (currentKind && loaded.includes(currentKind)) return;
  const target = SAVE_KINDS.find((k) => loaded.includes(k));
  if (target) navigate(`/${target}`);
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
  track('session_restored', { count: loaded.length });
  state.open = false;
  state.sessions = [];
  redirectIfNeeded(loaded);
}

export function dismissRestore(): void {
  const count = state.sessions.length;
  state.open = false;
  state.sessions = [];
  void clearAllSessions();
  track('session_restore_dismissed', { count });
}
