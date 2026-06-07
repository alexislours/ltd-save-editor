import type { DataType } from './dataType.js';

export type Entry = {
  hash: number;
  type: DataType;
  inlineRaw?: number;
  payload?: Uint8Array | null;
};

export type SavFile = {
  version: number;
  entries: Entry[];
};
