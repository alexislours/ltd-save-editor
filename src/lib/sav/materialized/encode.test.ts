import { describe, expect, it } from 'vitest';
import { PLAYER_SCHEMA } from '../schema';
import { encode } from './encode';
import { PLAN, type DecodedSave, type PlanItem } from './types';

describe('encode', () => {
  it('throws when DecodedSave is missing PLAN', () => {
    const handBuilt = {
      values: {} as never,
      unknowns: [],
      version: 1,
    } as DecodedSave;
    expect(() => encode(PLAYER_SCHEMA, handBuilt)).toThrow(/missing PLAN/);
  });

  it('encodes an empty PLAN to an empty entries list', () => {
    const handBuilt: DecodedSave = {
      values: {} as never,
      unknowns: [],
      version: 7,
    };
    Object.defineProperty(handBuilt, PLAN, {
      value: [] as ReadonlyArray<PlanItem>,
      enumerable: false,
    });
    const result = encode(PLAYER_SCHEMA, handBuilt);
    expect(result).toEqual({ version: 7, entries: [] });
  });
});
