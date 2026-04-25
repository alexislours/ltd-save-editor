import { track } from '../analytics';
import { getSave, type SaveKind, expectedFileName } from '../saveFile.svelte';
import { createDirtyTracker } from './dirty';
import { downloadBytes } from './download';
import { parseSav } from './parse';
import type { Entry, SavFile } from './types';
import { writeSav } from './write';

export type SaveEditorState = {
  parsed: SavFile | null;
  error: string | null;
  parsedFrom: Uint8Array | null;
  dirty: boolean;
  /** Bumped on every parse and every markDirty - read in `$derived` to react to edits. */
  tick: number;
};

export type SaveEditor = {
  readonly state: SaveEditorState;
  syncFromSave: () => void;
  markDirty: (entry: Entry) => void;
  downloadModified: () => void;
};

/**
 * Backing logic for a per-{@link SaveKind} editor: parses the underlying bytes,
 * tracks per-entry dirtiness via {@link createDirtyTracker}, and exposes a
 * single download path. The returned `state` is reactive ($state), so callers
 * can read fields like `state.parsed` directly.
 */
export function createSaveEditor(kind: SaveKind): SaveEditor {
  const state = $state<SaveEditorState>({
    parsed: null,
    error: null,
    parsedFrom: null,
    dirty: false,
    tick: 0,
  });
  const tracker = createDirtyTracker();

  function clear(): void {
    state.parsed = null;
    state.error = null;
    state.parsedFrom = null;
    state.dirty = false;
    state.tick++;
    tracker.reset();
  }

  function syncFromSave(): void {
    const save = getSave(kind);
    if (!save) {
      if (state.parsed || state.error) clear();
      return;
    }
    if (state.parsedFrom === save.bytes) return;
    try {
      const parsed = parseSav(save.bytes);
      state.parsed = parsed;
      state.error = null;
      state.parsedFrom = save.bytes;
      state.dirty = false;
      state.tick++;
      tracker.reset();
      tracker.registerAll(parsed.entries);
    } catch (e) {
      state.parsed = null;
      state.error = e instanceof Error ? e.message : String(e);
      state.parsedFrom = save.bytes;
      state.dirty = false;
      state.tick++;
      tracker.reset();
      track('save_parse_failed', { kind });
    }
  }

  function markDirty(entry: Entry): void {
    state.dirty = tracker.markDirty(entry);
    state.tick++;
  }

  function downloadModified(): void {
    if (!state.parsed) return;
    const bytes = writeSav(state.parsed);
    const save = getSave(kind);
    downloadBytes(bytes, save?.name ?? expectedFileName[kind]);
    track('save_exported', { kind });
  }

  return { state, syncFromSave, markDirty, downloadModified };
}
