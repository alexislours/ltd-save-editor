import { track } from '../analytics';
import { createDirtyTracker } from '../sav/dirty';
import { downloadBytes } from '../sav/download';
import type { Entry, SavFile } from '../sav/types';
import { getSave, getSaveBytes } from '../saveFile.svelte';
import { schedulePersist } from '../sessionPersist';

type State = {
  parsed: SavFile | null;
  error: string | null;
  parseRev: number;
  genericDirty: boolean;
  genericTick: number;
};

const state = $state<State>({
  parsed: null,
  error: null,
  parseRev: 0,
  genericDirty: false,
  genericTick: 0,
});

export const mapSave = state;

const tracker = createDirtyTracker({ lazy: true });
let seenLoadId = -1;

export function scheduleMapPersist(): void {
  schedulePersist('map');
}

export function markDirty(entry: Entry): void {
  state.genericDirty = tracker.markDirty(entry);
  state.genericTick = (state.genericTick + 1) | 0;
  scheduleMapPersist();
}

export function ensureParsed(): SavFile | null {
  const save = getSave('map');
  if (!save) {
    if (state.parsed || state.error) {
      state.parsed = null;
      state.error = null;
      state.parseRev = (state.parseRev + 1) | 0;
      tracker.reset();
      state.genericDirty = false;
      seenLoadId = -1;
    }
    return null;
  }
  if (
    save.loadId === seenLoadId &&
    state.parsed === save.parsed &&
    state.error === save.parseError
  ) {
    return state.parsed;
  }
  state.parsed = save.parsed;
  state.error = save.parseError;
  state.parseRev = (state.parseRev + 1) | 0;
  tracker.reset();
  state.genericDirty = false;
  seenLoadId = save.loadId;
  if (save.parseError) track('parse_failed', { kind: 'map' });
  return state.parsed;
}

export function downloadMapSav(defaultName = 'Map.sav'): void {
  const bytes = getSaveBytes('map');
  if (!bytes) return;
  const save = getSave('map');
  downloadBytes(bytes, save?.name ?? defaultName);
  track('export', { mode: 'single', kinds: 'map', kind_count: 1 });
}
