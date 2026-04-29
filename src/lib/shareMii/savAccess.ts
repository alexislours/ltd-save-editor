import type { Entry, SavFile } from '../sav/types';
import { ShareMiiError } from './errors';

export function findEntry(savFile: SavFile, hash: number, label?: string): Entry {
  const e = savFile.entries.find((x) => x.hash === hash);
  if (!e) {
    throw new ShareMiiError('save_format_error', {
      label: label ?? `0x${hash.toString(16)}`,
    });
  }
  return e;
}

export function entryPayload(savFile: SavFile, hash: number, label?: string): Uint8Array {
  const e = findEntry(savFile, hash, label);
  if (!e.payload) {
    throw new ShareMiiError('save_format_error', {
      label: label ?? `0x${hash.toString(16)}`,
    });
  }
  return e.payload;
}
