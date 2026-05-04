import type { Entry } from '../types';

export type RawEntries = Entry[];

export type PlanItem = { kind: 'known'; hash: number } | { kind: 'unknown'; index: number };

export type DecodedSave = {
  values: Record<number, unknown>;
  unknowns: Entry[];
  version: number;
  plan: PlanItem[];
};

export type { Leaf, SchemaLeaf, ValueOf, ElementOf } from '../schema/leaf';
