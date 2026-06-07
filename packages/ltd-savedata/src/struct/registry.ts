import { CHAR_INFO_EX } from './defs/charInfoEx.js';
import { CLOCK_SNAPSHOT } from './defs/clockSnapshot.js';
import { GIVEN_FLAG } from './defs/givenFlag.js';
import { GIVEN_UGC_FLAG } from './defs/givenUgcFlag.js';
import { NAME_SET_BIN } from './defs/nameSetBin.js';
import { durationSeconds, epochSeconds } from './codecs.js';
import { sizeOf } from './decode.js';
import { DURATION_LEAF_HASHES, TIME_LEAF_HASHES } from './timeLeaves.js';
import type { Codec, StructDef } from './types.js';

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

const CODEC_BY_HASH = new Map<number, Codec>([
  ...TIME_LEAF_HASHES.map((h): [number, Codec] => [h, epochSeconds]),
  ...DURATION_LEAF_HASHES.map((h): [number, Codec] => [h, durationSeconds]),
]);

export function codecForHash(hash: number): Codec | null {
  return CODEC_BY_HASH.get(hash >>> 0) ?? null;
}
