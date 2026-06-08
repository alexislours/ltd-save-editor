import type { Entry } from '../types.js';

/**
 * One slot in a {@link DecodedSave}'s plan, preserving the original entry order.
 * `known` references a decoded value by hash; `unknown` indexes into the
 * passed-through `unknowns` list.
 */
export type PlanItem = { kind: 'known'; hash: number } | { kind: 'unknown'; index: number };

/** A schema-decoded save: known values keyed by hash, untouched unknown entries, the file version, and the order-preserving plan. */
export type DecodedSave = {
  /** Decoded values keyed by leaf hash. */
  values: Record<number, unknown>;
  /** Entries with no matching schema leaf, kept verbatim for re-encoding. */
  unknowns: Entry[];
  /** Format version carried over from the source file. */
  version: number;
  /** Original entry order, used by {@link encode} to round-trip the file. */
  plan: PlanItem[];
};
