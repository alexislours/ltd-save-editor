import { CHAR_INFO_EX } from './defs/charInfoEx';
import { CLOCK_SNAPSHOT } from './defs/clockSnapshot';
import { GIVEN_FLAG } from './defs/givenFlag';
import { GIVEN_UGC_FLAG } from './defs/givenUgcFlag';
import { NAME_SET_BIN } from './defs/nameSetBin';
import { sizeOf } from './decode';
import type { StructDef } from './types';

const BY_HASH = new Map<number, StructDef>([
  [0xa279320c, CLOCK_SNAPSHOT],
  [0xe0d319f5, CHAR_INFO_EX],
  [0x114eff89, CHAR_INFO_EX],
  [0x881ca27a, CHAR_INFO_EX],
  [0xcab805e6, CHAR_INFO_EX],
  [0xfe434951, GIVEN_FLAG],
  [0xc022c1ae, GIVEN_UGC_FLAG],
  [0xafa5024a, NAME_SET_BIN],
]);

export function structForHash(hash: number, byteLength: number): StructDef | null {
  const def = BY_HASH.get(hash >>> 0);
  if (!def) return null;
  if (sizeOf({ kind: 'struct', def }) > byteLength) return null;
  return def;
}
