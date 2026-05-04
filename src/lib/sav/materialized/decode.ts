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
  arrayCount,
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
} from '$lib/sav/codec';
import { DataType } from '$lib/sav/dataType';
import type { Entry, SavFile } from '$lib/sav/types';
import { buildHashMap } from './schemaIndex';
import type { DecodedSave, PlanItem } from './types';

export function decode(schema: object, file: SavFile): DecodedSave {
  const hashMap = buildHashMap(schema);
  const values: Record<number, unknown> = {};
  const unknowns: Entry[] = [];
  const plan: PlanItem[] = [];

  for (const entry of file.entries) {
    const hash = entry.hash >>> 0;
    const info = hashMap.get(hash);
    if (info && info.type === entry.type) {
      values[hash] = decodeValue(entry);
      plan.push({ kind: 'known', hash });
    } else {
      const idx = unknowns.length;
      unknowns.push(entry);
      plan.push({ kind: 'unknown', index: idx });
    }
  }

  const result: DecodedSave = {
    values,
    unknowns,
    version: file.version,
    plan,
  };
  return result;
}

export function decodeValue(entry: Entry): unknown {
  switch (entry.type) {
    case DataType.Bool:
      return getBool(entry);
    case DataType.Int:
      return getInt(entry);
    case DataType.UInt:
      return getUInt(entry);
    case DataType.Float:
      return getFloat(entry);
    case DataType.Enum:
      return getEnum(entry);
    case DataType.Int64:
      return getInt64(entry);
    case DataType.UInt64:
      return getUInt64(entry);
    case DataType.Vector2:
      return getVector2(entry);
    case DataType.Vector3:
      return getVector3(entry);
    case DataType.String16:
    case DataType.String32:
    case DataType.String64:
    case DataType.WString16:
    case DataType.WString32:
    case DataType.WString64:
      return getString(entry);
    case DataType.Binary:
      return entry.payload ? entry.payload.subarray(4).slice() : new Uint8Array(0);
    case DataType.BinaryArray:
      return binaryArrayElements(entry).map((el) => el.bytes.slice());
    case DataType.Bool64bitKey:
      return null;
    case DataType.BoolArray: {
      const count = arrayCount(entry);
      const out: boolean[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetBool(entry, i);
      return out;
    }
    case DataType.IntArray: {
      const count = arrayCount(entry);
      const out: number[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetInt(entry, i);
      return out;
    }
    case DataType.UIntArray: {
      const count = arrayCount(entry);
      const out: number[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetUInt(entry, i);
      return out;
    }
    case DataType.FloatArray: {
      const count = arrayCount(entry);
      const out: number[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetFloat(entry, i);
      return out;
    }
    case DataType.EnumArray: {
      const count = arrayCount(entry);
      const out: number[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetEnum(entry, i);
      return out;
    }
    case DataType.Int64Array: {
      const count = arrayCount(entry);
      const out: bigint[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetInt64(entry, i);
      return out;
    }
    case DataType.UInt64Array: {
      const count = arrayCount(entry);
      const out: bigint[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetUInt64(entry, i);
      return out;
    }
    case DataType.Vector2Array: {
      const count = arrayCount(entry);
      const out: { x: number; y: number }[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetVector2(entry, i);
      return out;
    }
    case DataType.Vector3Array: {
      const count = arrayCount(entry);
      const out: { x: number; y: number; z: number }[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetVector3(entry, i);
      return out;
    }
    case DataType.String16Array:
    case DataType.String32Array:
    case DataType.String64Array:
    case DataType.WString16Array:
    case DataType.WString32Array:
    case DataType.WString64Array: {
      const count = arrayCount(entry);
      const out: string[] = new Array(count);
      for (let i = 0; i < count; i++) out[i] = arrGetString(entry, i);
      return out;
    }
  }
  throw new Error(`Unsupported DataType ${entry.type}`);
}
