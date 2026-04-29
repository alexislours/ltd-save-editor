import { zipSync } from 'fflate';
import { track } from './analytics';
import { downloadBytes } from './sav/download';
import {
  expectedFileName,
  getSave,
  getSaveBytes,
  SAVE_KINDS,
  type SaveKind,
} from './saveFile.svelte';
import { getSidecarStore } from './shareMii/sidecarStore.svelte';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function timestamp(): string {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `${date}_${time}`;
}

export function loadedKinds(): SaveKind[] {
  return SAVE_KINDS.filter((k) => getSave(k) != null);
}

export function exportAllSaves(): number {
  const kinds = loadedKinds();
  const sidecar = getSidecarStore();
  if (kinds.length === 0 && sidecar.files.size === 0) return 0;

  const entries: Record<string, Uint8Array> = {};
  for (const kind of kinds) {
    const bytes = getSaveBytes(kind);
    if (bytes) entries[expectedFileName[kind]] = bytes;
  }
  for (const [name, bytes] of sidecar.files) {
    entries[`Ugc/${name}`] = bytes;
  }

  const zipped = zipSync(entries, { level: 6 });
  downloadBytes(zipped, `LTD-save-${timestamp()}.zip`);
  track('export', { mode: 'bulk', kinds: kinds.join(','), kind_count: kinds.length });
  return kinds.length;
}
