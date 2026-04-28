import { DataType, isInline, stringCapacity } from './dataType';
import type { Entry } from './types';

export function getBool(e: Entry): boolean {
  assertType(e, DataType.Bool);
  return ((e.inlineRaw ?? 0) & 0xff) !== 0;
}
export function setBool(e: Entry, v: boolean): void {
  assertType(e, DataType.Bool);
  e.inlineRaw = v ? 1 : 0;
}

export function getInt(e: Entry): number {
  assertType(e, DataType.Int);
  return (e.inlineRaw ?? 0) | 0;
}
export function setInt(e: Entry, v: number): void {
  assertType(e, DataType.Int);
  e.inlineRaw = (v | 0) >>> 0;
}

export function getUInt(e: Entry): number {
  assertType(e, DataType.UInt);
  return (e.inlineRaw ?? 0) >>> 0;
}
export function setUInt(e: Entry, v: number): void {
  assertType(e, DataType.UInt);
  e.inlineRaw = v >>> 0;
}

export function getFloat(e: Entry): number {
  assertType(e, DataType.Float);
  const u32 = new Uint32Array(1);
  u32[0] = e.inlineRaw ?? 0;
  return new Float32Array(u32.buffer)[0];
}
export function setFloat(e: Entry, v: number): void {
  assertType(e, DataType.Float);
  const f = new Float32Array(1);
  f[0] = v;
  e.inlineRaw = new Uint32Array(f.buffer)[0];
}

export function getEnum(e: Entry): number {
  assertType(e, DataType.Enum);
  return (e.inlineRaw ?? 0) >>> 0;
}
export function setEnum(e: Entry, hash: number): void {
  assertType(e, DataType.Enum);
  e.inlineRaw = hash >>> 0;
}

export function getInt64(e: Entry): bigint {
  assertType(e, DataType.Int64);
  return payloadView(e).getBigInt64(0, true);
}
export function setInt64(e: Entry, v: bigint): void {
  assertType(e, DataType.Int64);
  payloadView(e).setBigInt64(0, v, true);
}

export function getUInt64(e: Entry): bigint {
  assertType(e, DataType.UInt64);
  return payloadView(e).getBigUint64(0, true);
}
export function setUInt64(e: Entry, v: bigint): void {
  assertType(e, DataType.UInt64);
  payloadView(e).setBigUint64(0, v, true);
}

export function getVector2(e: Entry): { x: number; y: number } {
  assertType(e, DataType.Vector2);
  const v = payloadView(e);
  return { x: v.getFloat32(0, true), y: v.getFloat32(4, true) };
}
export function setVector2(e: Entry, v: { x: number; y: number }): void {
  assertType(e, DataType.Vector2);
  const dv = payloadView(e);
  dv.setFloat32(0, v.x, true);
  dv.setFloat32(4, v.y, true);
}

export function getVector3(e: Entry): { x: number; y: number; z: number } {
  assertType(e, DataType.Vector3);
  const v = payloadView(e);
  return {
    x: v.getFloat32(0, true),
    y: v.getFloat32(4, true),
    z: v.getFloat32(8, true),
  };
}
export function setVector3(e: Entry, v: { x: number; y: number; z: number }): void {
  assertType(e, DataType.Vector3);
  const dv = payloadView(e);
  dv.setFloat32(0, v.x, true);
  dv.setFloat32(4, v.y, true);
  dv.setFloat32(8, v.z, true);
}

const NARROW_STRINGS = new Set([DataType.String16, DataType.String32, DataType.String64]);
const WIDE_STRINGS = new Set([DataType.WString16, DataType.WString32, DataType.WString64]);

export function getString(e: Entry): string {
  const cap = stringCapacity(e.type);
  if (cap == null) {
    throw new Error(`Entry 0x${e.hash.toString(16)} is not a string type`);
  }
  if (!e.payload) return '';

  if (NARROW_STRINGS.has(e.type)) {
    let end = e.payload.indexOf(0);
    if (end < 0) end = e.payload.byteLength;
    return new TextDecoder('utf-8').decode(e.payload.subarray(0, end));
  }
  if (WIDE_STRINGS.has(e.type)) {
    const u16 = new Uint16Array(e.payload.buffer, e.payload.byteOffset, e.payload.byteLength / 2);
    let end = 0;
    while (end < u16.length && u16[end] !== 0) end++;
    // Use Uint16Array chunk + decoder for surrogate handling.
    const buf = u16.slice(0, end);
    return new TextDecoder('utf-16le').decode(
      new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
    );
  }
  throw new Error(`Not a string type: ${e.type}`);
}

export function stringEncodedSize(t: DataType, s: string): number {
  if (NARROW_STRINGS.has(t)) return new TextEncoder().encode(s).byteLength;
  if (WIDE_STRINGS.has(t)) return s.length * 2;
  throw new Error(`Not a string type: ${t}`);
}

export function setString(e: Entry, s: string): void {
  const cap = stringCapacity(e.type);
  if (cap == null) {
    throw new Error(`Entry 0x${e.hash.toString(16)} is not a string type`);
  }
  const encoded = encodeStringFixed(e.type, s, cap);
  if (!e.payload || e.payload.byteLength !== cap) {
    e.payload = encoded;
  } else {
    e.payload.set(encoded);
  }
}

function encodeStringFixed(t: DataType, s: string, capacity: number): Uint8Array {
  const out = new Uint8Array(capacity);
  if (NARROW_STRINGS.has(t)) {
    const bytes = new TextEncoder().encode(s);
    if (bytes.byteLength > capacity) {
      throw new Error(`String exceeds capacity ${capacity} (utf-8 size ${bytes.byteLength})`);
    }
    out.set(bytes);
    return out;
  }
  if (WIDE_STRINGS.has(t)) {
    // Write UTF-16LE code units.
    if (s.length * 2 > capacity) {
      throw new Error(`String exceeds capacity ${capacity} (utf-16 size ${s.length * 2})`);
    }
    const dv = new DataView(out.buffer);
    for (let i = 0; i < s.length; i++) {
      dv.setUint16(i * 2, s.charCodeAt(i), true);
    }
    return out;
  }
  throw new Error(`Not a string type: ${t}`);
}

export function arrayCount(e: Entry): number {
  if (!e.payload || e.payload.byteLength < 4) return 0;
  return payloadView(e).getUint32(0, true);
}

export function arrayElementSize(t: DataType): number | null {
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

export function isArrayType(t: DataType): boolean {
  return (
    t === DataType.BoolArray ||
    t === DataType.IntArray ||
    t === DataType.UIntArray ||
    t === DataType.FloatArray ||
    t === DataType.EnumArray ||
    t === DataType.Int64Array ||
    t === DataType.UInt64Array ||
    t === DataType.Vector2Array ||
    t === DataType.Vector3Array ||
    t === DataType.String16Array ||
    t === DataType.String32Array ||
    t === DataType.String64Array ||
    t === DataType.WString16Array ||
    t === DataType.WString32Array ||
    t === DataType.WString64Array ||
    t === DataType.BinaryArray
  );
}

export function hasIndexedElementEditor(t: DataType): boolean {
  if (t === DataType.BoolArray) return true;
  if (t === DataType.BinaryArray) return false;
  return arrayElementSize(t) !== null;
}

function elementView(e: Entry, i: number, sz: number): DataView {
  if (!e.payload) {
    throw new Error(`Entry 0x${e.hash.toString(16)} has no payload`);
  }
  const offset = 4 + i * sz;
  if (offset < 0 || offset + sz > e.payload.byteLength) {
    throw new Error(`Array index ${i} out of range for entry 0x${e.hash.toString(16)}`);
  }
  return new DataView(e.payload.buffer, e.payload.byteOffset + offset, sz);
}

export function arrGetBool(e: Entry, i: number): boolean {
  assertType(e, DataType.BoolArray);
  const byte = e.payload![4 + (i >>> 3)];
  return ((byte >>> (i & 7)) & 1) === 1;
}

export function arrSetBool(e: Entry, i: number, v: boolean): void {
  assertType(e, DataType.BoolArray);
  const byteIdx = 4 + (i >>> 3);
  const bitMask = 1 << (i & 7);
  if (v) e.payload![byteIdx] |= bitMask;
  else e.payload![byteIdx] &= ~bitMask;
}

export function arrGetInt(e: Entry, i: number): number {
  assertType(e, DataType.IntArray);
  return elementView(e, i, 4).getInt32(0, true);
}
export function arrSetInt(e: Entry, i: number, v: number): void {
  assertType(e, DataType.IntArray);
  elementView(e, i, 4).setInt32(0, v | 0, true);
}

export function arrGetUInt(e: Entry, i: number): number {
  assertType(e, DataType.UIntArray);
  return elementView(e, i, 4).getUint32(0, true);
}
export function arrSetUInt(e: Entry, i: number, v: number): void {
  assertType(e, DataType.UIntArray);
  elementView(e, i, 4).setUint32(0, v >>> 0, true);
}

export function arrGetFloat(e: Entry, i: number): number {
  assertType(e, DataType.FloatArray);
  return elementView(e, i, 4).getFloat32(0, true);
}
export function arrSetFloat(e: Entry, i: number, v: number): void {
  assertType(e, DataType.FloatArray);
  elementView(e, i, 4).setFloat32(0, v, true);
}

export function arrGetEnum(e: Entry, i: number): number {
  assertType(e, DataType.EnumArray);
  return elementView(e, i, 4).getUint32(0, true);
}
export function arrSetEnum(e: Entry, i: number, v: number): void {
  assertType(e, DataType.EnumArray);
  elementView(e, i, 4).setUint32(0, v >>> 0, true);
}

export function arrGetInt64(e: Entry, i: number): bigint {
  assertType(e, DataType.Int64Array);
  return elementView(e, i, 8).getBigInt64(0, true);
}
export function arrSetInt64(e: Entry, i: number, v: bigint): void {
  assertType(e, DataType.Int64Array);
  elementView(e, i, 8).setBigInt64(0, v, true);
}

export function arrGetUInt64(e: Entry, i: number): bigint {
  assertType(e, DataType.UInt64Array);
  return elementView(e, i, 8).getBigUint64(0, true);
}
export function arrSetUInt64(e: Entry, i: number, v: bigint): void {
  assertType(e, DataType.UInt64Array);
  elementView(e, i, 8).setBigUint64(0, v, true);
}

export function arrGetVector2(e: Entry, i: number): { x: number; y: number } {
  assertType(e, DataType.Vector2Array);
  const v = elementView(e, i, 8);
  return { x: v.getFloat32(0, true), y: v.getFloat32(4, true) };
}
export function arrSetVector2(e: Entry, i: number, v: { x: number; y: number }): void {
  assertType(e, DataType.Vector2Array);
  const dv = elementView(e, i, 8);
  dv.setFloat32(0, v.x, true);
  dv.setFloat32(4, v.y, true);
}

export function arrGetVector3(e: Entry, i: number): { x: number; y: number; z: number } {
  assertType(e, DataType.Vector3Array);
  const v = elementView(e, i, 12);
  return {
    x: v.getFloat32(0, true),
    y: v.getFloat32(4, true),
    z: v.getFloat32(8, true),
  };
}
export function arrSetVector3(e: Entry, i: number, v: { x: number; y: number; z: number }): void {
  assertType(e, DataType.Vector3Array);
  const dv = elementView(e, i, 12);
  dv.setFloat32(0, v.x, true);
  dv.setFloat32(4, v.y, true);
  dv.setFloat32(8, v.z, true);
}

const NARROW_ARRAY_TYPES = new Set([
  DataType.String16Array,
  DataType.String32Array,
  DataType.String64Array,
]);
const WIDE_ARRAY_TYPES = new Set([
  DataType.WString16Array,
  DataType.WString32Array,
  DataType.WString64Array,
]);

export function arrGetString(e: Entry, i: number): string {
  const sz = arrayElementSize(e.type);
  if (sz == null) throw new Error(`Not a string array: ${e.type}`);
  if (!e.payload) return '';
  const start = 4 + i * sz;
  const slice = e.payload.subarray(start, start + sz);

  if (NARROW_ARRAY_TYPES.has(e.type)) {
    let end = slice.indexOf(0);
    if (end < 0) end = slice.byteLength;
    return new TextDecoder('utf-8').decode(slice.subarray(0, end));
  }
  if (WIDE_ARRAY_TYPES.has(e.type)) {
    const u16 = new Uint16Array(slice.buffer, slice.byteOffset, slice.byteLength / 2);
    let end = 0;
    while (end < u16.length && u16[end] !== 0) end++;
    const buf = u16.slice(0, end);
    return new TextDecoder('utf-16le').decode(
      new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
    );
  }
  throw new Error(`Not a string array: ${e.type}`);
}

export function arrSetString(e: Entry, i: number, s: string): void {
  const sz = arrayElementSize(e.type);
  if (sz == null) throw new Error(`Not a string array: ${e.type}`);
  if (!e.payload) throw new Error(`Entry 0x${e.hash.toString(16)} has no payload`);
  const start = 4 + i * sz;
  if (start + sz > e.payload.byteLength) {
    throw new Error(`Array index ${i} out of range`);
  }

  const fresh = new Uint8Array(sz);
  if (NARROW_ARRAY_TYPES.has(e.type)) {
    const bytes = new TextEncoder().encode(s);
    if (bytes.byteLength > sz) {
      throw new Error(`String exceeds capacity ${sz} (utf-8 size ${bytes.byteLength})`);
    }
    fresh.set(bytes);
  } else if (WIDE_ARRAY_TYPES.has(e.type)) {
    if (s.length * 2 > sz) {
      throw new Error(`String exceeds capacity ${sz} (utf-16 size ${s.length * 2})`);
    }
    const dv = new DataView(fresh.buffer);
    for (let k = 0; k < s.length; k++) {
      dv.setUint16(k * 2, s.charCodeAt(k), true);
    }
  } else {
    throw new Error(`Not a string array: ${e.type}`);
  }
  e.payload.set(fresh, start);
}

export type BinaryArrayElement = { size: number; bytes: Uint8Array };

export function binaryArrayElements(e: Entry): BinaryArrayElement[] {
  assertType(e, DataType.BinaryArray);
  if (!e.payload) return [];
  const dv = payloadView(e);
  const count = dv.getUint32(0, true);
  const out: BinaryArrayElement[] = [];
  let p = 4;
  for (let i = 0; i < count; i++) {
    const size = dv.getUint32(p, true);
    p += 4;
    out.push({ size, bytes: e.payload.subarray(p, p + size) });
    p += size;
  }
  return out;
}

export function isEditable(e: Entry): boolean {
  if (isInline(e.type)) return true;
  switch (e.type) {
    case DataType.Int64:
    case DataType.UInt64:
    case DataType.Vector2:
    case DataType.Vector3:
    case DataType.String16:
    case DataType.String32:
    case DataType.String64:
    case DataType.WString16:
    case DataType.WString32:
    case DataType.WString64:
      return true;
    default:
      return false;
  }
}

function assertType(e: Entry, expected: DataType): void {
  if (e.type !== expected) {
    throw new Error(`Entry 0x${e.hash.toString(16)} has type ${e.type}, expected ${expected}`);
  }
}

function payloadView(e: Entry): DataView {
  if (!e.payload) {
    throw new Error(`Entry 0x${e.hash.toString(16)} has no heap payload`);
  }
  return new DataView(e.payload.buffer, e.payload.byteOffset, e.payload.byteLength);
}
