import type { Entry } from '../types';

export type RawEntries = Entry[];

export type PlanItem = { kind: 'known'; path: string } | { kind: 'unknown'; index: number };

export type DecodedSave = {
  values: Record<string, unknown>;
  unknowns: Entry[];
  version: number;
  plan: PlanItem[];
};

export type { Leaf, SchemaLeaf, ValueOf, ElementOf } from '../schema/leaf';
