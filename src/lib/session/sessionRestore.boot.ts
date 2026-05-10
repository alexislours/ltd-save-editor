import { track } from '$lib/analytics';
import { SAVE_KINDS } from '$lib/saveFile/types';
import { restoreModal as state } from '$lib/session/sessionRestoreState.svelte';
import { getAllSessions } from '$lib/session/sessionStore';
import { restorePersistedSidecars } from '$lib/shareMii/sidecar/sidecarStore.svelte';

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
  state.loaded = true;
  if (typeof localStorage !== 'undefined' && localStorage.getItem('dev-auto-restore')) {
    const { confirmRestore } = await import('$lib/session/sessionRestore.svelte');
    confirmRestore();
    return;
  }
  state.open = true;
  track('restore_prompted', {
    count: sessions.length,
    sidecar_count: sidecar?.count ?? 0,
  });
}
