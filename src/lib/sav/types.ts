import type { DataType } from './dataType';

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
