import {
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
} from '$lib/sav/codec';
import { DataType, isInline } from '$lib/sav/dataType';
import type { Entry, SavFile } from '$lib/sav/types';
import { buildHashMap } from './schemaIndex';
import type { DecodedSave } from './types';

export function encode(schema: object, decoded: DecodedSave): SavFile {
  const plan = decoded.plan;
  const hashMap = buildHashMap(schema);
  const values = decoded.values;
  const entries: Entry[] = [];
  for (const item of plan) {
    if (item.kind === 'unknown') {
      entries.push(decoded.unknowns[item.index]);
    } else {
      const leaf = hashMap.get(item.hash);
      if (!leaf) throw new Error(`No leaf for hash 0x${item.hash.toString(16)}`);
      entries.push(buildEntry(item.hash, leaf.type, values[item.hash]));
    }
  }
  return { version: decoded.version, entries };
}

function buildEntry(hash: number, type: DataType, value: unknown): Entry {
  if (type === DataType.Bool64bitKey) {
    return { hash, type, payload: null };
  }
  if (isInline(type)) {
    const e: Entry = { hash, type, inlineRaw: 0 };
    switch (type) {
      case DataType.Bool:
        setBool(e, value as boolean);
        break;
      case DataType.Int:
        setInt(e, value as number);
        break;
      case DataType.UInt:
        setUInt(e, value as number);
        break;
      case DataType.Float:
        setFloat(e, value as number);
        break;
      case DataType.Enum:
        setEnum(e, value as number);
        break;
    }
    return e;
  }
  const fixed = fixedHeapSize(type);
  if (fixed !== null) {
    const e: Entry = { hash, type, payload: new Uint8Array(fixed) };
    switch (type) {
      case DataType.Int64:
        setInt64(e, value as bigint);
        break;
      case DataType.UInt64:
        setUInt64(e, value as bigint);
        break;
      case DataType.Vector2:
        setVector2(e, value as { x: number; y: number });
        break;
      case DataType.Vector3:
        setVector3(e, value as { x: number; y: number; z: number });
        break;
      case DataType.String16:
      case DataType.String32:
      case DataType.String64:
      case DataType.WString16:
      case DataType.WString32:
      case DataType.WString64:
        setString(e, value as string);
        break;
    }
    return e;
  }
  if (type === DataType.Binary) {
    const data = value as Uint8Array;
    const out = new Uint8Array(4 + data.byteLength);
    new DataView(out.buffer).setUint32(0, data.byteLength, true);
    out.set(data, 4);
    return { hash, type, payload: out };
  }
  if (type === DataType.BinaryArray) {
    const elements = value as Uint8Array[];
    let total = 4;
    for (const el of elements) total += 4 + el.byteLength;
    const out = new Uint8Array(total);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, elements.length, true);
    let p = 4;
    for (const el of elements) {
      dv.setUint32(p, el.byteLength, true);
      p += 4;
      out.set(el, p);
      p += el.byteLength;
    }
    return { hash, type, payload: out };
  }
  return { hash, type, payload: buildArrayPayload(type, value as unknown[]) };
}

function fixedHeapSize(t: DataType): number | null {
  switch (t) {
    case DataType.Int64:
    case DataType.UInt64:
    case DataType.Vector2:
      return 8;
    case DataType.Vector3:
      return 12;
    case DataType.String16:
      return 16;
    case DataType.String32:
      return 32;
    case DataType.String64:
      return 64;
    case DataType.WString16:
      return 32;
    case DataType.WString32:
      return 64;
    case DataType.WString64:
      return 128;
    default:
      return null;
  }
}

function buildArrayPayload(type: DataType, value: unknown[]): Uint8Array {
  const count = value.length;
  if (type === DataType.BoolArray) {
    const byteSize = Math.max(4, Math.ceil(count / 8));
    const aligned = (byteSize + 3) & ~3;
    const out = new Uint8Array(4 + aligned);
    new DataView(out.buffer).setUint32(0, count, true);
    const arr = value as boolean[];
    const e: Entry = { hash: 0, type, payload: out };
    for (let i = 0; i < count; i++) arrSetBool(e, i, arr[i]);
    return out;
  }
  const sz = elementSize(type);
  if (sz == null) throw new Error(`Unsupported array type ${type}`);
  const out = new Uint8Array(4 + count * sz);
  new DataView(out.buffer).setUint32(0, count, true);
  const e: Entry = { hash: 0, type, payload: out };
  for (let i = 0; i < count; i++) setArrayElement(e, type, i, value[i]);
  return out;
}

function elementSize(t: DataType): number | null {
  switch (t) {
    case DataType.IntArray:
    case DataType.UIntArray:
    case DataType.FloatArray:
    case DataType.EnumArray:
      return 4;
    case DataType.Int64Array:
    case DataType.UInt64Array:
    case DataType.Vector2Array:
      return 8;
    case DataType.Vector3Array:
      return 12;
    case DataType.String16Array:
      return 16;
    case DataType.String32Array:
      return 32;
    case DataType.String64Array:
      return 64;
    case DataType.WString16Array:
      return 32;
    case DataType.WString32Array:
      return 64;
    case DataType.WString64Array:
      return 128;
    default:
      return null;
  }
}

function setArrayElement(e: Entry, type: DataType, i: number, v: unknown): void {
  switch (type) {
    case DataType.IntArray:
      arrSetInt(e, i, v as number);
      return;
    case DataType.UIntArray:
      arrSetUInt(e, i, v as number);
      return;
    case DataType.FloatArray:
      arrSetFloat(e, i, v as number);
      return;
    case DataType.EnumArray:
      arrSetEnum(e, i, v as number);
      return;
    case DataType.Int64Array:
      arrSetInt64(e, i, v as bigint);
      return;
    case DataType.UInt64Array:
      arrSetUInt64(e, i, v as bigint);
      return;
    case DataType.Vector2Array:
      arrSetVector2(e, i, v as { x: number; y: number });
      return;
    case DataType.Vector3Array:
      arrSetVector3(e, i, v as { x: number; y: number; z: number });
      return;
    case DataType.String16Array:
    case DataType.String32Array:
    case DataType.String64Array:
    case DataType.WString16Array:
    case DataType.WString32Array:
    case DataType.WString64Array:
      arrSetString(e, i, v as string);
      return;
  }
  throw new Error(`Unsupported array element type ${type}`);
}
