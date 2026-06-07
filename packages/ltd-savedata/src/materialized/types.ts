import type { Entry } from '../types.js';

export type PlanItem = { kind: 'known'; hash: number } | { kind: 'unknown'; index: number };

export type DecodedSave = {
  values: Record<number, unknown>;
  unknowns: Entry[];
  version: number;
  plan: PlanItem[];
};
