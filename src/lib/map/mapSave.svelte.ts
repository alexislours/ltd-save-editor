import { track } from '../analytics';
import { createDirtyTracker } from '../sav/dirty';
import { downloadBytes } from '../sav/download';
import { parseSav } from '../sav/parse';
import type { Entry, SavFile } from '../sav/types';
import { writeSav } from '../sav/write';
import { getSave } from '../saveFile.svelte';

type State = {
  parsed: SavFile | null;
  parsedFrom: Uint8Array | null;
  error: string | null;
  parseRev: number;
  genericDirty: boolean;
  genericTick: number;
};

const state = $state<State>({
  parsed: null,
  parsedFrom: null,
  error: null,
  parseRev: 0,
  genericDirty: false,
  genericTick: 0,
});

export const mapSave = state;

const tracker = createDirtyTracker({ lazy: true });

export function markDirty(entry: Entry): void {
  state.genericDirty = tracker.markDirty(entry);
  state.genericTick = (state.genericTick + 1) | 0;
}

export function ensureParsed(): SavFile | null {
  const save = getSave('map');
  if (!save) {
    if (state.parsed || state.error) {
      state.parsed = null;
      state.parsedFrom = null;
      state.error = null;
      state.parseRev = (state.parseRev + 1) | 0;
      tracker.reset();
      state.genericDirty = false;
    }
    return null;
  }
  if (state.parsedFrom === save.bytes && state.parsed) return state.parsed;

  try {
    state.parsed = parseSav(save.bytes);
    state.parsedFrom = save.bytes;
    state.error = null;
    state.parseRev = (state.parseRev + 1) | 0;
    tracker.reset();
    state.genericDirty = false;
    return state.parsed;
  } catch (e) {
    state.parsed = null;
    state.parsedFrom = save.bytes;
    state.error = e instanceof Error ? e.message : String(e);
    state.parseRev = (state.parseRev + 1) | 0;
    tracker.reset();
    state.genericDirty = false;
    track('save_parse_failed', { kind: 'map' });
    return null;
  }
}

export function downloadMapSav(defaultName = 'Map.sav'): void {
  if (!state.parsed) return;
  const bytes = writeSav(state.parsed);
  const save = getSave('map');
  downloadBytes(bytes, save?.name ?? defaultName);
  track('save_exported', { kind: 'map' });
}
