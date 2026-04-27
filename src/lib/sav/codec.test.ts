import { describe, expect, it } from 'vitest';
import {
  arrGetBool,
  arrGetEnum,
  arrGetFloat,
  arrGetInt,
  arrGetInt64,
  arrGetString,
  arrGetUInt,
  arrGetUInt64,
  arrGetVector2,
  arrGetVector3,
  arrSetBool,
  arrSetEnum,
  arrSetFloat,
  arrSetInt,
  arrSetInt64,
  arrSetString,
  arrSetUInt,
  arrSetUInt64,
  arrSetVector2,
  arrSetVector3,
  arrayCount,
  arrayElementSize,
  binaryArrayElements,
  getBool,
  getEnum,
  getFloat,
  getInt,
  getInt64,
  getString,
  getUInt,
  getUInt64,
  getVector2,
  getVector3,
  hasIndexedElementEditor,
  isArrayType,
  isEditable,
  setBool,
  setEnum,
  setFloat,
  setInt,
  setInt64,
  setString,
  setUInt,
  setUInt64,
  setVector2,
  setVector3,
  stringEncodedSize,
} from './codec';
import { DataType } from './dataType';
import type { Entry } from './types';

function entry(type: DataType, payloadBytes = 0): Entry {
  return {
    hash: 0xdeadbeef,
    type,
    payload: payloadBytes ? new Uint8Array(payloadBytes) : undefined,
  };
}

function arrayEntry(type: DataType, count: number, elementSize: number): Entry {
  const payload = new Uint8Array(4 + count * elementSize);
  new DataView(payload.buffer).setUint32(0, count, true);
  return { hash: 0xcafebabe, type, payload };
}

describe('inline scalars round-trip', () => {
  it('Bool', () => {
    const e = entry(DataType.Bool);
    setBool(e, true);
    expect(getBool(e)).toBe(true);
    setBool(e, false);
    expect(getBool(e)).toBe(false);
  });

  it('Int preserves negatives', () => {
    const e = entry(DataType.Int);
    setInt(e, -1);
    expect(getInt(e)).toBe(-1);
    setInt(e, -2147483648);
    expect(getInt(e)).toBe(-2147483648);
    setInt(e, 2147483647);
    expect(getInt(e)).toBe(2147483647);
  });

  it('UInt is unsigned', () => {
    const e = entry(DataType.UInt);
    setUInt(e, 0xffffffff);
    expect(getUInt(e)).toBe(0xffffffff);
  });

  it('Float preserves IEEE-754 round-trip (matches Math.fround)', () => {
    const e = entry(DataType.Float);
    for (const v of [0, 1, -1, 3.14159, -2.5e10, Number.EPSILON, 1.4e-45]) {
      setFloat(e, v);
      expect(getFloat(e)).toBe(Math.fround(v));
    }
    setFloat(e, Infinity);
    expect(getFloat(e)).toBe(Infinity);
    setFloat(e, -Infinity);
    expect(getFloat(e)).toBe(-Infinity);
    setFloat(e, NaN);
    expect(Number.isNaN(getFloat(e))).toBe(true);
  });

  it('Enum stores hash unsigned', () => {
    const e = entry(DataType.Enum);
    setEnum(e, 0x9747b28c);
    expect(getEnum(e)).toBe(0x9747b28c);
  });
});

describe('heap 64-bit scalars round-trip', () => {
  it('Int64 preserves bigint sign and range', () => {
    const e = entry(DataType.Int64, 8);
    setInt64(e, -1n);
    expect(getInt64(e)).toBe(-1n);
    setInt64(e, 1234567890123456789n);
    expect(getInt64(e)).toBe(1234567890123456789n);
  });

  it('UInt64 preserves max value', () => {
    const e = entry(DataType.UInt64, 8);
    setUInt64(e, 0xffffffffffffffffn);
    expect(getUInt64(e)).toBe(0xffffffffffffffffn);
  });
});

describe('vectors round-trip', () => {
  it('Vector2', () => {
    const e = entry(DataType.Vector2, 8);
    setVector2(e, { x: 1.5, y: -2.25 });
    expect(getVector2(e)).toEqual({ x: 1.5, y: -2.25 });
  });

  it('Vector3', () => {
    const e = entry(DataType.Vector3, 12);
    setVector3(e, { x: 1, y: 2, z: 3 });
    expect(getVector3(e)).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe('strings round-trip', () => {
  it('String32 narrow UTF-8', () => {
    const e: Entry = { hash: 0, type: DataType.String32 };
    setString(e, 'hello');
    expect(getString(e)).toBe('hello');
    expect(e.payload!.byteLength).toBe(32);
  });

  it('String32 truncates trailing zero bytes when reading', () => {
    const e: Entry = { hash: 0, type: DataType.String32 };
    setString(e, 'abc');
    expect(getString(e)).toBe('abc');
  });

  it('WString32 round-trips ASCII as UTF-16LE', () => {
    const e: Entry = { hash: 0, type: DataType.WString32 };
    setString(e, 'world');
    expect(getString(e)).toBe('world');
    expect(e.payload!.byteLength).toBe(64);
    expect(e.payload![0]).toBe('w'.charCodeAt(0));
    expect(e.payload![1]).toBe(0);
  });

  it('returns empty string when payload is missing', () => {
    const e: Entry = { hash: 0, type: DataType.String16 };
    expect(getString(e)).toBe('');
  });

  it('throws when string exceeds capacity (utf-8)', () => {
    const e: Entry = { hash: 0, type: DataType.String16 };
    expect(() => setString(e, 'x'.repeat(17))).toThrow(/exceeds capacity/);
  });

  it('throws when string exceeds capacity (utf-16)', () => {
    const e: Entry = { hash: 0, type: DataType.WString16 };
    expect(() => setString(e, 'x'.repeat(17))).toThrow(/exceeds capacity/);
  });

  it('throws when reading a non-string type', () => {
    expect(() => getString(entry(DataType.Int))).toThrow(/not a string type/);
  });
});

describe('stringEncodedSize', () => {
  it('returns UTF-8 byte length for narrow strings', () => {
    expect(stringEncodedSize(DataType.String16, 'abc')).toBe(3);
    expect(stringEncodedSize(DataType.String32, '日本')).toBe(6);
  });

  it('returns UTF-16 byte length for wide strings', () => {
    expect(stringEncodedSize(DataType.WString32, 'abc')).toBe(6);
  });

  it('throws for non-string types', () => {
    expect(() => stringEncodedSize(DataType.Int, 'x')).toThrow(/Not a string type/);
  });
});

describe('array helpers', () => {
  it('arrayCount reads the leading u32 length', () => {
    const e = arrayEntry(DataType.IntArray, 5, 4);
    expect(arrayCount(e)).toBe(5);
  });

  it('arrayCount returns 0 when payload is missing', () => {
    expect(arrayCount({ hash: 0, type: DataType.IntArray })).toBe(0);
  });

  it('arrayElementSize returns the per-element byte size', () => {
    expect(arrayElementSize(DataType.IntArray)).toBe(4);
    expect(arrayElementSize(DataType.Int64Array)).toBe(8);
    expect(arrayElementSize(DataType.Vector3Array)).toBe(12);
    expect(arrayElementSize(DataType.WString64Array)).toBe(128);
    expect(arrayElementSize(DataType.BoolArray)).toBeNull();
    expect(arrayElementSize(DataType.Bool)).toBeNull();
  });

  it('isArrayType identifies all array types', () => {
    expect(isArrayType(DataType.IntArray)).toBe(true);
    expect(isArrayType(DataType.BinaryArray)).toBe(true);
    expect(isArrayType(DataType.Int)).toBe(false);
  });

  it('hasIndexedElementEditor is true for fixed-size scalar arrays', () => {
    expect(hasIndexedElementEditor(DataType.BoolArray)).toBe(true);
    expect(hasIndexedElementEditor(DataType.IntArray)).toBe(true);
    expect(hasIndexedElementEditor(DataType.BinaryArray)).toBe(false);
    expect(hasIndexedElementEditor(DataType.Int)).toBe(false);
  });
});

describe('array element accessors round-trip', () => {
  it('BoolArray packs bits LSB-first', () => {
    const payload = new Uint8Array(4 + 4);
    new DataView(payload.buffer).setUint32(0, 16, true);
    const e: Entry = { hash: 0, type: DataType.BoolArray, payload };
    arrSetBool(e, 0, true);
    arrSetBool(e, 7, true);
    arrSetBool(e, 8, true);
    expect(arrGetBool(e, 0)).toBe(true);
    expect(arrGetBool(e, 1)).toBe(false);
    expect(arrGetBool(e, 7)).toBe(true);
    expect(arrGetBool(e, 8)).toBe(true);
    expect(payload[4]).toBe(0b10000001);
    expect(payload[5]).toBe(0b00000001);

    arrSetBool(e, 0, false);
    expect(arrGetBool(e, 0)).toBe(false);
    expect(arrGetBool(e, 7)).toBe(true);
  });

  it('IntArray', () => {
    const e = arrayEntry(DataType.IntArray, 3, 4);
    arrSetInt(e, 0, -1);
    arrSetInt(e, 1, 0);
    arrSetInt(e, 2, 2147483647);
    expect(arrGetInt(e, 0)).toBe(-1);
    expect(arrGetInt(e, 1)).toBe(0);
    expect(arrGetInt(e, 2)).toBe(2147483647);
  });

  it('UIntArray', () => {
    const e = arrayEntry(DataType.UIntArray, 2, 4);
    arrSetUInt(e, 0, 0xffffffff);
    expect(arrGetUInt(e, 0)).toBe(0xffffffff);
  });

  it('FloatArray', () => {
    const e = arrayEntry(DataType.FloatArray, 2, 4);
    arrSetFloat(e, 0, 1.25);
    arrSetFloat(e, 1, -3.75);
    expect(arrGetFloat(e, 0)).toBe(1.25);
    expect(arrGetFloat(e, 1)).toBe(-3.75);
  });

  it('EnumArray', () => {
    const e = arrayEntry(DataType.EnumArray, 1, 4);
    arrSetEnum(e, 0, 0x12345678);
    expect(arrGetEnum(e, 0)).toBe(0x12345678);
  });

  it('Int64Array / UInt64Array', () => {
    const i64 = arrayEntry(DataType.Int64Array, 1, 8);
    arrSetInt64(i64, 0, -42n);
    expect(arrGetInt64(i64, 0)).toBe(-42n);

    const u64 = arrayEntry(DataType.UInt64Array, 1, 8);
    arrSetUInt64(u64, 0, 0xffffffffffffffffn);
    expect(arrGetUInt64(u64, 0)).toBe(0xffffffffffffffffn);
  });

  it('Vector2Array / Vector3Array', () => {
    const v2 = arrayEntry(DataType.Vector2Array, 2, 8);
    arrSetVector2(v2, 1, { x: 5, y: 6 });
    expect(arrGetVector2(v2, 0)).toEqual({ x: 0, y: 0 });
    expect(arrGetVector2(v2, 1)).toEqual({ x: 5, y: 6 });

    const v3 = arrayEntry(DataType.Vector3Array, 1, 12);
    arrSetVector3(v3, 0, { x: 1, y: 2, z: 3 });
    expect(arrGetVector3(v3, 0)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('String32Array round-trip', () => {
    const e = arrayEntry(DataType.String32Array, 2, 32);
    arrSetString(e, 0, 'one');
    arrSetString(e, 1, 'two');
    expect(arrGetString(e, 0)).toBe('one');
    expect(arrGetString(e, 1)).toBe('two');
  });

  it('WString32Array round-trip', () => {
    const e = arrayEntry(DataType.WString32Array, 1, 64);
    arrSetString(e, 0, 'utf16');
    expect(arrGetString(e, 0)).toBe('utf16');
  });

  it('throws when array element index is out of range', () => {
    const e = arrayEntry(DataType.IntArray, 1, 4);
    expect(() => arrGetInt(e, 5)).toThrow(/out of range/);
  });

  it('throws when type does not match accessor', () => {
    const e = arrayEntry(DataType.IntArray, 1, 4);
    expect(() => arrGetFloat(e, 0)).toThrow();
  });
});

describe('binaryArrayElements', () => {
  it('reads count + (size, bytes) elements', () => {
    const elems = [new Uint8Array([1, 2, 3]), new Uint8Array([0xaa, 0xbb]), new Uint8Array([])];
    const totalSize = 4 + elems.reduce((acc, e) => acc + 4 + e.byteLength, 0);
    const payload = new Uint8Array(totalSize);
    const dv = new DataView(payload.buffer);
    dv.setUint32(0, elems.length, true);
    let p = 4;
    for (const elem of elems) {
      dv.setUint32(p, elem.byteLength, true);
      p += 4;
      payload.set(elem, p);
      p += elem.byteLength;
    }

    const e: Entry = { hash: 0, type: DataType.BinaryArray, payload };
    const decoded = binaryArrayElements(e);
    expect(decoded).toHaveLength(3);
    expect(decoded[0].size).toBe(3);
    expect(Array.from(decoded[0].bytes)).toEqual([1, 2, 3]);
    expect(decoded[1].size).toBe(2);
    expect(Array.from(decoded[1].bytes)).toEqual([0xaa, 0xbb]);
    expect(decoded[2].size).toBe(0);
  });

  it('returns empty array for missing payload', () => {
    expect(binaryArrayElements({ hash: 0, type: DataType.BinaryArray })).toEqual([]);
  });
});

describe('isEditable', () => {
  it('is true for inline scalar types', () => {
    expect(isEditable(entry(DataType.Bool))).toBe(true);
    expect(isEditable(entry(DataType.Int))).toBe(true);
    expect(isEditable(entry(DataType.Float))).toBe(true);
  });

  it('is true for heap scalar / vector / string types', () => {
    expect(isEditable(entry(DataType.Int64, 8))).toBe(true);
    expect(isEditable(entry(DataType.Vector3, 12))).toBe(true);
    expect(isEditable(entry(DataType.WString64, 128))).toBe(true);
  });

  it('is false for array and binary types', () => {
    expect(isEditable(entry(DataType.IntArray))).toBe(false);
    expect(isEditable(entry(DataType.Binary))).toBe(false);
    expect(isEditable(entry(DataType.Bool64bitKey))).toBe(false);
  });
});

describe('type assertion', () => {
  it('throws when accessor receives wrong type', () => {
    expect(() => getInt(entry(DataType.Float))).toThrow(/expected/);
    expect(() => setBool(entry(DataType.Int), true)).toThrow(/expected/);
  });
});
