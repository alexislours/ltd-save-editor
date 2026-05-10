import { track } from '$lib/analytics';
import { redirectIfNeeded } from '$lib/bulk/bulkLoader.svelte';
import { restoreSaveFromDecoded } from '$lib/saveFile/saveFile.svelte';
import type { SaveKind } from '$lib/saveFile/types';
import { restoreModal as state } from '$lib/session/sessionRestoreState.svelte';
import { clearAllSessions, deleteSession } from '$lib/session/sessionStore';
import { clearSidecar } from '$lib/shareMii/sidecar/sidecarStore.svelte';

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
