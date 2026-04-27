import { zipSync } from 'fflate';
import { track } from './analytics';
import { mapSave } from './map/mapSave.svelte';
import { miiState } from './mii/miiEditor.svelte';
import { playerState } from './playerEditor.svelte';
import { downloadBytes } from './sav/download';
import { writeSav } from './sav/write';
import { expectedFileName, getSave, SAVE_KINDS, type SaveKind } from './saveFile.svelte';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function timestamp(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `${date}_${time}`;
}

function bytesForKind(kind: SaveKind): Uint8Array | null {
  const save = getSave(kind);
  if (!save) return null;
  const parsed =
    kind === 'player' ? playerState.parsed : kind === 'mii' ? miiState.parsed : mapSave.parsed;
  return parsed ? writeSav(parsed) : save.bytes;
}

export function loadedKinds(): SaveKind[] {
  return SAVE_KINDS.filter((k) => getSave(k) != null);
}

export function exportAllSaves(): number {
  const kinds = loadedKinds();
  if (kinds.length === 0) return 0;

  const entries: Record<string, Uint8Array> = {};
  for (const kind of kinds) {
    const bytes = bytesForKind(kind);
    if (bytes) entries[expectedFileName[kind]] = bytes;
  }

  const zipped = zipSync(entries, { level: 6 });
  downloadBytes(zipped, `LTD-save-${timestamp()}.zip`);
  track('bulk_export', { count: kinds.length });
  return kinds.length;
}
