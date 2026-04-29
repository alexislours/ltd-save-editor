import { track } from '../analytics';
import { getSave, getSaveBytes, type SaveKind, expectedFileName } from '../saveFile.svelte';
import { schedulePersist } from '../sessionPersist';
import { createDirtyTracker } from './dirty';
import { downloadBytes } from './download';
import type { Entry, SavFile } from './types';

export type SaveEditorState = {
  parsed: SavFile | null;
  error: string | null;
  dirty: boolean;
  /** Bumped on every parse and every markDirty - read in `$derived` to react to edits. */
  tick: number;
  loadId: number;
};

export type SaveEditor = {
  readonly state: SaveEditorState;
  syncFromSave: () => void;
  markDirty: (entry: Entry) => void;
  downloadModified: () => void;
};

/**
 * Backing logic for a per-{@link SaveKind} editor. The parsed `SavFile` lives in
 * `saveFile.svelte.ts` (single source of truth). The editor mirrors the loaded
 * save's parsed/error fields and tracks per-entry dirtiness via
 * {@link createDirtyTracker}. Mutations to entry payloads are reflected
 * immediately in `getSave(kind).parsed.entries` since the editor and any other
 * caller (e.g. ShareMii) share the same SavFile reference.
 */
export function createSaveEditor(kind: SaveKind): SaveEditor {
  const state = $state<SaveEditorState>({
    parsed: null,
    error: null,
    dirty: false,
    tick: 0,
    loadId: 0,
  });
  const tracker = createDirtyTracker();
  let seenLoadId = -1;

  function clear(): void {
    state.parsed = null;
    state.error = null;
    state.dirty = false;
    state.tick++;
    state.loadId = 0;
    tracker.reset();
    seenLoadId = -1;
  }

  function syncFromSave(): void {
    const save = getSave(kind);
    if (!save) {
      if (state.parsed || state.error) clear();
      return;
    }
    if (
      save.loadId === seenLoadId &&
      state.parsed === save.parsed &&
      state.error === save.parseError
    ) {
      return;
    }
    state.parsed = save.parsed;
    state.error = save.parseError;
    state.dirty = false;
    state.tick++;
    state.loadId = save.loadId;
    tracker.reset();
    if (save.parsed) tracker.registerAll(save.parsed.entries);
    if (save.parseError) track('parse_failed', { kind });
    seenLoadId = save.loadId;
  }

  function markDirty(entry: Entry): void {
    state.dirty = tracker.markDirty(entry);
    state.tick++;
    schedulePersist(kind);
  }

  function downloadModified(): void {
    const bytes = getSaveBytes(kind);
    if (!bytes) return;
    const save = getSave(kind);
    downloadBytes(bytes, save?.name ?? expectedFileName[kind]);
    track('export', { mode: 'single', kinds: kind, kind_count: 1 });
  }

  return { state, syncFromSave, markDirty, downloadModified };
}
