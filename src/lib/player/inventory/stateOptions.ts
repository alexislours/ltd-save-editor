import { murmur3_x86_32 } from '$lib/sav/hash';

const STATE_NAMES = ['Lock', 'New', 'Arrived', 'Opened', 'Obtained'] as const;

type StateName = (typeof STATE_NAMES)[number];

type StateOption = { name: StateName; hash: number };

export const STATE_OPTIONS: readonly StateOption[] = STATE_NAMES.map((name) => ({
  name,
  hash: murmur3_x86_32(name) >>> 0,
}));

export const OBTAINED_HASH = murmur3_x86_32('Obtained') >>> 0;
