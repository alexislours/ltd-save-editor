import { describe, expect, it } from 'vitest';
import { DataType } from '../dataType.js';
import { DURATION_LEAF_PATHS, expandLeaves, TIME_LEAF_PATHS } from './timeLeaves.js';

const SIXTY_FOUR_BIT = new Set<number>([
  DataType.Int64,
  DataType.Int64Array,
  DataType.UInt64,
  DataType.UInt64Array,
]);

describe('time leaf paths', () => {
  const ALL = [...TIME_LEAF_PATHS, ...DURATION_LEAF_PATHS];

  it.each(ALL)('%s resolves to at least one leaf', (path) => {
    expect(expandLeaves(path).length).toBeGreaterThan(0);
  });

  it.each(ALL)('%s resolves only to 64-bit leaves', (path) => {
    for (const leaf of expandLeaves(path)) {
      expect(SIXTY_FOUR_BIT.has(leaf.type)).toBe(true);
    }
  });
});
