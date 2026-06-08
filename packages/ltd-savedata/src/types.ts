import type { DataType } from './dataType.js';

/**
 * A single key/value record in a `.sav` file, identified by the murmur3 hash of
 * its field path.
 *
 * Inline types ({@link isInline}) store their value in `inlineRaw`; all other
 * types store a heap `payload` (or `null` for an absent {@link DataType.Bool64bitKey}).
 */
export type Entry = {
  /** murmur3_x86_32 hash of the field's path name. */
  hash: number;
  /** Wire type that determines how the value is stored and decoded. */
  type: DataType;
  /** Raw 32-bit value for inline types; ignored for heap types. */
  inlineRaw?: number;
  /** Heap bytes for non-inline types, or `null` for an absent value. */
  payload?: Uint8Array | null;
};

/** A parsed `.sav` file: its format version and the list of decoded {@link Entry} records. */
export type SavFile = {
  /** Format version read from the file header. */
  version: number;
  /** Every key/value record, in file order. */
  entries: Entry[];
};
