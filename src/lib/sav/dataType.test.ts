import { describe, expect, it } from 'vitest';
import {
  DATA_TYPE_COUNT,
  DataType,
  DataTypeName,
  isInline,
  isNarrowString,
  isWideString,
  stringCapacity,
} from './dataType';

describe('DataType enum', () => {
  it('has the expected total count', () => {
    expect(DATA_TYPE_COUNT).toBe(33);
  });

  it('exposes a name for every member', () => {
    for (let t = 0; t < DATA_TYPE_COUNT; t++) {
      expect(DataTypeName[t as DataType]).toBeDefined();
      expect(DataTypeName[t as DataType]).toMatch(/^[A-Za-z0-9]+$/);
    }
  });
});

describe('isInline', () => {
  const inline = [DataType.Bool, DataType.Int, DataType.UInt, DataType.Float, DataType.Enum];
  const heap = [
    DataType.BoolArray,
    DataType.Int64,
    DataType.UInt64,
    DataType.Vector2,
    DataType.Vector3,
    DataType.String16,
    DataType.WString64,
    DataType.Binary,
    DataType.Bool64bitKey,
  ];

  it.each(inline)('returns true for inline type %s', (t) => {
    expect(isInline(t)).toBe(true);
  });

  it.each(heap)('returns false for heap type %s', (t) => {
    expect(isInline(t)).toBe(false);
  });
});

describe('stringCapacity', () => {
  it.each([
    [DataType.String16, 16],
    [DataType.String32, 32],
    [DataType.String64, 64],
    [DataType.WString16, 32],
    [DataType.WString32, 64],
    [DataType.WString64, 128],
  ])('returns %i bytes for %s', (type, cap) => {
    expect(stringCapacity(type)).toBe(cap);
  });

  it('returns null for non-string types', () => {
    expect(stringCapacity(DataType.Int)).toBeNull();
    expect(stringCapacity(DataType.Vector2)).toBeNull();
    expect(stringCapacity(DataType.String16Array)).toBeNull();
  });
});

describe('isWideString / isNarrowString', () => {
  it('classifies WStringN as wide only', () => {
    for (const t of [DataType.WString16, DataType.WString32, DataType.WString64]) {
      expect(isWideString(t)).toBe(true);
      expect(isNarrowString(t)).toBe(false);
    }
  });

  it('classifies StringN as narrow only', () => {
    for (const t of [DataType.String16, DataType.String32, DataType.String64]) {
      expect(isNarrowString(t)).toBe(true);
      expect(isWideString(t)).toBe(false);
    }
  });

  it('returns false for both on non-strings', () => {
    expect(isNarrowString(DataType.Int)).toBe(false);
    expect(isWideString(DataType.Int)).toBe(false);
  });
});
