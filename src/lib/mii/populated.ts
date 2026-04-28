import { arrGetString, arrayCount, binaryArrayElements } from '../sav/codec';
import { DataType } from '../sav/dataType';
import { murmur3_x86_32 } from '../sav/hash';
import type { Entry } from '../sav/types';
import { NAME_FIELD_HASH } from './miiFields';

const CHAR_INFO_EX_HASH = murmur3_x86_32('Mii.CharInfoEx') >>> 0;

export function populatedMiiIndices(byHash: Map<number, Entry>): number[] {
  const nameEntry = byHash.get(NAME_FIELD_HASH);
  if (!nameEntry) return [];
  const count = arrayCount(nameEntry);
  const charInfoEntry = byHash.get(CHAR_INFO_EX_HASH);
  if (charInfoEntry && charInfoEntry.type === DataType.BinaryArray) {
    const elements = binaryArrayElements(charInfoEntry);
    const out: number[] = [];
    const limit = Math.min(count, elements.length);
    for (let i = 0; i < limit; i++) {
      const bytes = elements[i].bytes;
      for (let b = 0; b < bytes.length; b++) {
        if (bytes[b] !== 0) {
          out.push(i);
          break;
        }
      }
    }
    return out;
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    try {
      if (arrGetString(nameEntry, i).length > 0) out.push(i);
    } catch {
      /* skip */
    }
  }
  return out;
}
