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
} from '../sav/codec';
import { DataType } from '../sav/dataType';
import { parseMaybeHex } from '../sav/format';
import type { Entry } from '../sav/types';
import { INPUT_CLASS, MONO_INPUT_CLASS } from '../styles';

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export type ScalarAccess =
  | { kind: 'bool'; read: () => boolean; write: (v: boolean) => void }
  | { kind: 'int'; read: () => number; write: (v: number) => void }
  | { kind: 'uint'; read: () => number; write: (v: number) => void }
  | { kind: 'float'; read: () => number; write: (v: number) => void }
  | { kind: 'enum'; read: () => number; write: (v: number) => void }
  | { kind: 'int64'; read: () => bigint; write: (v: bigint) => void }
  | { kind: 'uint64'; read: () => bigint; write: (v: bigint) => void }
  | { kind: 'vector2'; read: () => Vec2; write: (v: Vec2) => void }
  | { kind: 'vector3'; read: () => Vec3; write: (v: Vec3) => void }
  | {
      kind: 'string';
      read: () => string;
      write: (v: string) => void;
      validate: (v: string) => void;
    };

export function entryScalarAccess(entry: Entry): ScalarAccess | null {
  switch (entry.type) {
    case DataType.Bool:
      return { kind: 'bool', read: () => getBool(entry), write: (v) => setBool(entry, v) };
    case DataType.Int:
      return { kind: 'int', read: () => getInt(entry), write: (v) => setInt(entry, v) };
    case DataType.UInt:
      return { kind: 'uint', read: () => getUInt(entry), write: (v) => setUInt(entry, v) };
    case DataType.Float:
      return { kind: 'float', read: () => getFloat(entry), write: (v) => setFloat(entry, v) };
    case DataType.Enum:
      return { kind: 'enum', read: () => getEnum(entry), write: (v) => setEnum(entry, v) };
    case DataType.Int64:
      return { kind: 'int64', read: () => getInt64(entry), write: (v) => setInt64(entry, v) };
    case DataType.UInt64:
      return { kind: 'uint64', read: () => getUInt64(entry), write: (v) => setUInt64(entry, v) };
    case DataType.Vector2:
      return {
        kind: 'vector2',
        read: () => getVector2(entry),
        write: (v) => setVector2(entry, v),
      };
    case DataType.Vector3:
      return {
        kind: 'vector3',
        read: () => getVector3(entry),
        write: (v) => setVector3(entry, v),
      };
    default:
      if (isEditable(entry)) {
        return {
          kind: 'string',
          read: () => getString(entry),
          write: (v) => setString(entry, v),
          validate: (v) => {
            stringEncodedSize(entry.type, v);
          },
        };
      }
      return null;
  }
}

export function arrayElementScalarAccess(entry: Entry, index: number): ScalarAccess | null {
  switch (entry.type) {
    case DataType.BoolArray:
      return {
        kind: 'bool',
        read: () => arrGetBool(entry, index),
        write: (v) => arrSetBool(entry, index, v),
      };
    case DataType.IntArray:
      return {
        kind: 'int',
        read: () => arrGetInt(entry, index),
        write: (v) => arrSetInt(entry, index, v),
      };
    case DataType.UIntArray:
      return {
        kind: 'uint',
        read: () => arrGetUInt(entry, index),
        write: (v) => arrSetUInt(entry, index, v),
      };
    case DataType.FloatArray:
      return {
        kind: 'float',
        read: () => arrGetFloat(entry, index),
        write: (v) => arrSetFloat(entry, index, v),
      };
    case DataType.EnumArray:
      return {
        kind: 'enum',
        read: () => arrGetEnum(entry, index),
        write: (v) => arrSetEnum(entry, index, v),
      };
    case DataType.Int64Array:
      return {
        kind: 'int64',
        read: () => arrGetInt64(entry, index),
        write: (v) => arrSetInt64(entry, index, v),
      };
    case DataType.UInt64Array:
      return {
        kind: 'uint64',
        read: () => arrGetUInt64(entry, index),
        write: (v) => arrSetUInt64(entry, index, v),
      };
    case DataType.Vector2Array:
      return {
        kind: 'vector2',
        read: () => arrGetVector2(entry, index),
        write: (v) => arrSetVector2(entry, index, v),
      };
    case DataType.Vector3Array:
      return {
        kind: 'vector3',
        read: () => arrGetVector3(entry, index),
        write: (v) => arrSetVector3(entry, index, v),
      };
    case DataType.String16Array:
    case DataType.String32Array:
    case DataType.String64Array:
    case DataType.WString16Array:
    case DataType.WString32Array:
    case DataType.WString64Array:
      return {
        kind: 'string',
        read: () => arrGetString(entry, index),
        write: (v) => arrSetString(entry, index, v),
        validate: () => {},
      };
    default:
      return null;
  }
}

export type ScalarSizing = {
  numClass: string;
  longNumClass: string;
  vecClass: string;
  enumHexClass: string;
  enumSelectClass: string;
  stringClass: string;
};

export const SCALAR_SIZING_PRESETS: { array: ScalarSizing; entry: ScalarSizing } = {
  array: {
    numClass: `w-full max-w-32 ${MONO_INPUT_CLASS}`,
    longNumClass: `w-full max-w-48 ${MONO_INPUT_CLASS}`,
    vecClass: `min-w-0 flex-1 ${MONO_INPUT_CLASS}`,
    enumHexClass: `w-full max-w-40 ${MONO_INPUT_CLASS}`,
    enumSelectClass: `w-full max-w-56 ${INPUT_CLASS}`,
    stringClass: `w-full max-w-64 ${INPUT_CLASS}`,
  },
  entry: {
    numClass: `w-full max-w-40 ${MONO_INPUT_CLASS}`,
    longNumClass: `w-full max-w-56 ${MONO_INPUT_CLASS}`,
    vecClass: `min-w-0 flex-1 ${MONO_INPUT_CLASS}`,
    enumHexClass: `w-full max-w-44 ${MONO_INPUT_CLASS}`,
    enumSelectClass: `w-full max-w-56 ${INPUT_CLASS}`,
    stringClass: `w-full max-w-72 ${INPUT_CLASS}`,
  },
};

export function fieldWriteError(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export type BulkParseResult =
  | { ok: true; value: boolean | number | bigint | string }
  | { ok: false; error: string };

export function parseBulkValueForArrayType(t: DataType, input: string): BulkParseResult {
  switch (t) {
    case DataType.BoolArray: {
      const v = input.trim().toLowerCase();
      if (v !== 'true' && v !== 'false') return { ok: false, error: 'Enter "true" or "false"' };
      return { ok: true, value: v === 'true' };
    }
    case DataType.IntArray: {
      const n = Number(input);
      if (!Number.isFinite(n)) return { ok: false, error: 'Enter an integer' };
      return { ok: true, value: Math.trunc(n) };
    }
    case DataType.UIntArray: {
      const n = Number(input);
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: 'Enter a non-negative integer' };
      }
      return { ok: true, value: Math.trunc(n) };
    }
    case DataType.FloatArray: {
      const n = Number(input);
      if (!Number.isFinite(n)) return { ok: false, error: 'Enter a number' };
      return { ok: true, value: n };
    }
    case DataType.EnumArray: {
      const n = parseMaybeHex(input);
      if (n == null) return { ok: false, error: 'Enter decimal or 0x-hex' };
      return { ok: true, value: n >>> 0 };
    }
    case DataType.Int64Array: {
      try {
        return { ok: true, value: BigInt(input.trim()) };
      } catch {
        return { ok: false, error: 'Enter an integer' };
      }
    }
    case DataType.UInt64Array: {
      try {
        const n = BigInt(input.trim());
        if (n < 0n) return { ok: false, error: 'Enter a non-negative integer' };
        return { ok: true, value: n };
      } catch {
        return { ok: false, error: 'Enter a non-negative integer' };
      }
    }
    case DataType.String16Array:
    case DataType.String32Array:
    case DataType.String64Array:
    case DataType.WString16Array:
    case DataType.WString32Array:
    case DataType.WString64Array:
      return { ok: true, value: input };
    default:
      return { ok: false, error: 'Bulk edit not supported for this type' };
  }
}
