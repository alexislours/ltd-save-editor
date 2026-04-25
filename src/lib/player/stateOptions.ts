import { murmur3_x86_32 } from '../sav/hash';

const STATE_NAMES = ['Lock', 'New', 'Arrived', 'Opened', 'Obtained'] as const;

export type StateName = (typeof STATE_NAMES)[number];

export type StateOption = { name: StateName; hash: number };

export const STATE_OPTIONS: readonly StateOption[] = STATE_NAMES.map((name) => ({
  name,
  hash: murmur3_x86_32(name) >>> 0,
}));

const NAME_BY_HASH = new Map(STATE_OPTIONS.map((o) => [o.hash, o.name]));

export function stateNameForHash(hash: number): StateName | null {
  return NAME_BY_HASH.get(hash >>> 0) ?? null;
}

export const OBTAINED_HASH = murmur3_x86_32('Obtained') >>> 0;
