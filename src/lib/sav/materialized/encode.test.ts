import { describe, expect, it } from 'vitest';
import { PLAYER_SCHEMA } from '$lib/sav/schema';
import { encode } from './encode';
import type { DecodedSave } from './types';

describe('encode', () => {
  it('encodes an empty plan to an empty entries list', () => {
    const handBuilt: DecodedSave = {
      values: {} as never,
      unknowns: [],
      version: 7,
      plan: [],
    };
    const result = encode(PLAYER_SCHEMA, handBuilt);
    expect(result).toEqual({ version: 7, entries: [] });
  });
});
