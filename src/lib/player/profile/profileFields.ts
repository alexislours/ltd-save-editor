import { format } from 'svelte-i18n';
import { get } from 'svelte/store';
import { player } from '$lib/sav/schema';
import type { PlayerAccessor } from '$lib/player/playerEditor.svelte';

export type Swatch = { value: number; color: string; label: string };

export const HAND_COLORS: readonly string[] = [
  '#f6d9bd',
  '#ecc19d',
  '#d2a07a',
  '#b07a54',
  '#825533',
  '#5a391c',
];

export const ISLAND_SIZE_VALUES = [1, 2, 3, 4] as const;

const MAX_MONEY_CENTS = 99_999_999;

export function writeNonNegativeInt(
  raw: string,
  commit: (v: number) => string | null,
): string | null {
  const trimmed = raw.replace(/[,\s]/g, '');
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return get(format)('player.errors.non_negative_integer');
  return commit(Math.trunc(n));
}

export function writeNonNegativeBigInt(
  raw: string,
  commit: (v: bigint) => string | null,
): string | null {
  const trimmed = raw.replace(/[,\s]/g, '');
  try {
    const n = BigInt(trimmed);
    if (n < 0n) return get(format)('player.errors.non_negative_integer');
    return commit(n);
  } catch {
    return get(format)('player.errors.invalid_number');
  }
}

export function writeMoney(raw: string, commit: (v: number) => string | null): string | null {
  const t = get(format);
  const cleaned = raw.replace(/\s/g, '').replace(/,/g, '.');
  const lastDot = cleaned.lastIndexOf('.');
  let intPart: string;
  let fracPart = '';
  if (lastDot >= 0) {
    intPart = cleaned.slice(0, lastDot).replace(/\./g, '');
    fracPart = cleaned.slice(lastDot + 1);
  } else {
    intPart = cleaned.replace(/\./g, '');
  }
  if (intPart === '' && fracPart === '') return t('player.errors.number');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) {
    return t('player.errors.non_negative_number');
  }
  const cents = (fracPart + '00').slice(0, 2);
  const totalStr = (intPart || '0') + cents;
  const total = Number(totalStr);
  if (!Number.isFinite(total) || total < 0) return t('player.errors.non_negative_number');
  if (total > MAX_MONEY_CENTS) return t('player.errors.money_max');
  return commit(total);
}

export function writeHexUint32(raw: string, commit: (v: number) => string | null): string | null {
  const trimmed = raw.trim().replace(/^0x/i, '');
  if (trimmed === '' || !/^[0-9a-fA-F]+$/.test(trimmed)) {
    return get(format)('player.errors.invalid_number');
  }
  const n = Number.parseInt(trimmed, 16);
  if (!Number.isFinite(n) || n < 0 || n > 0xffff_ffff) {
    return get(format)('player.errors.invalid_number');
  }
  return commit(n >>> 0);
}

export function formatMoney(v: number | null): string {
  if (v == null) return '';
  if (!Number.isFinite(v)) return '';
  return (v / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPlayTime(seconds: bigint | null): string {
  if (seconds == null) return '';
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h.toLocaleString('en-US')}h ${m}m`;
}

export function profileHasAnyContent(acc: PlayerAccessor | null): boolean {
  if (!acc) return false;
  return (
    acc.has(player.Player.Name) ||
    acc.has(player.Player.IslandName) ||
    acc.has(player.Player.Money) ||
    acc.has(player.Player.PlayTime) ||
    acc.has(player.Player.SkinColorIndex) ||
    acc.has(player.Liberation.FountainLevel) ||
    acc.has(player.Liberation.LiberateRightStock) ||
    acc.has(player.Player.UnlockMapLevel) ||
    (acc.has(player.Player.BirthDay.BirthDay_Day) &&
      acc.has(player.Player.BirthDay.BirthDay_Month) &&
      acc.has(player.Player.BirthDay.BirthDay_Year))
  );
}
