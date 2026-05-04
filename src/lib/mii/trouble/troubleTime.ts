import type { Trouble } from '$lib/sav/lists/troubleList.svelte';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { TROUBLE_FIELDS } from './troubleFields';

export function toDateInputValue(seconds: bigint): string {
  if (seconds === 0n) return '';
  const d = new Date(Number(seconds) * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

export function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export function parseDateInput(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0n;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  return BigInt(Math.floor(ms / 1000));
}

export function applyDefaultSchedule(
  mii: MiiAccessor | null,
  selectedIndex: number | null,
  t: Trouble | null,
): void {
  if (!t || !mii || selectedIndex == null) return;
  const now = nowSeconds();
  if (mii.has(TROUBLE_FIELDS.nextGameTime.leaf)) {
    mii.setElement(TROUBLE_FIELDS.nextGameTime.leaf, selectedIndex, now);
  }
  if (mii.has(TROUBLE_FIELDS.endGameTime.leaf)) {
    mii.setElement(
      TROUBLE_FIELDS.endGameTime.leaf,
      selectedIndex,
      t.endMinute > 0 ? now + BigInt(t.endMinute * 60) : 0n,
    );
  }
}
