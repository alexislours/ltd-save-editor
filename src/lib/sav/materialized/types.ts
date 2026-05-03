import type { Entry } from '../types';

export type RawEntries = Entry[];

export type DecodedSave = {
  values: Record<string, unknown>;
  unknowns: Entry[];
  version: number;
};

export const PLAN: unique symbol = Symbol('@materialized/plan');

export type PlanItem = { kind: 'known'; path: string } | { kind: 'unknown'; index: number };

export type WithPlan = { [PLAN]?: ReadonlyArray<PlanItem> };

export type { Leaf, SchemaLeaf, ValueOf, ElementOf } from '../schema/leaf';
