import type { BitfieldDef, DecodedNode, FieldType, PrimKind, StructDef } from './types';

const PRIM_SIZE: Record<PrimKind, number> = {
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  s8: 1,
  s16: 2,
  s32: 4,
  s64: 8,
  f32: 4,
  f64: 8,
};

export function sizeOf(type: FieldType): number {
  switch (type.kind) {
    case 'prim':
      return PRIM_SIZE[type.prim];
    case 'char':
      return type.len;
    case 'wchar':
      return type.len * 2;
    case 'bytes':
      return type.len;
    case 'array':
      return sizeOf(type.element) * type.count;
    case 'struct':
      return type.def.fields.reduce((sum, f) => sum + sizeOf(f.type), 0);
    case 'bitfield':
      return bitfieldBytes(type.def);
  }
}

function bitfieldBytes(def: BitfieldDef): number {
  const total = def.members.reduce((sum, m) => sum + m.bits, 0);
  return Math.ceil(total / 8);
}

function readUintN(dv: DataView, offset: number, byteLen: number): number {
  let v = 0;
  for (let i = byteLen - 1; i >= 0; i--) v = v * 256 + dv.getUint8(offset + i);
  return v;
}

function writeUintN(dv: DataView, offset: number, byteLen: number, value: number): void {
  let v = value;
  for (let i = 0; i < byteLen; i++) {
    dv.setUint8(offset + i, v % 256);
    v = Math.floor(v / 256);
  }
}

export function writeBits(
  dv: DataView,
  containerOffset: number,
  containerBytes: number,
  bitOffset: number,
  bitWidth: number,
  value: number,
): void {
  const low = 2 ** bitOffset;
  const span = 2 ** bitWidth;
  const container = readUintN(dv, containerOffset, containerBytes);
  const field = Math.floor(container / low) % span;
  const cleared = container - field * low;
  const next = cleared + (((value % span) + span) % span) * low;
  writeUintN(dv, containerOffset, containerBytes, next);
}

function readPrim(dv: DataView, offset: number, prim: PrimKind): number | bigint {
  switch (prim) {
    case 'u8':
      return dv.getUint8(offset);
    case 'u16':
      return dv.getUint16(offset, true);
    case 'u32':
      return dv.getUint32(offset, true);
    case 'u64':
      return dv.getBigUint64(offset, true);
    case 's8':
      return dv.getInt8(offset);
    case 's16':
      return dv.getInt16(offset, true);
    case 's32':
      return dv.getInt32(offset, true);
    case 's64':
      return dv.getBigInt64(offset, true);
    case 'f32':
      return dv.getFloat32(offset, true);
    case 'f64':
      return dv.getFloat64(offset, true);
  }
}

export function writePrim(
  dv: DataView,
  offset: number,
  prim: PrimKind,
  value: number | bigint,
): void {
  switch (prim) {
    case 'u8':
      return dv.setUint8(offset, Number(value) & 0xff);
    case 'u16':
      return dv.setUint16(offset, Number(value) & 0xffff, true);
    case 'u32':
      return dv.setUint32(offset, Number(value) >>> 0, true);
    case 'u64':
      return dv.setBigUint64(offset, BigInt(value), true);
    case 's8':
      return dv.setInt8(offset, Number(value) | 0);
    case 's16':
      return dv.setInt16(offset, Number(value) | 0, true);
    case 's32':
      return dv.setInt32(offset, Number(value) | 0, true);
    case 's64':
      return dv.setBigInt64(offset, BigInt(value), true);
    case 'f32':
      return dv.setFloat32(offset, Number(value), true);
    case 'f64':
      return dv.setFloat64(offset, Number(value), true);
  }
}

export function isFloatPrim(prim: PrimKind): boolean {
  return prim === 'f32' || prim === 'f64';
}

export function primRange(prim: PrimKind): { min: number; max: number } | null {
  switch (prim) {
    case 'u8':
      return { min: 0, max: 0xff };
    case 'u16':
      return { min: 0, max: 0xffff };
    case 'u32':
      return { min: 0, max: 0xffffffff };
    case 's8':
      return { min: -0x80, max: 0x7f };
    case 's16':
      return { min: -0x8000, max: 0x7fff };
    case 's32':
      return { min: -0x80000000, max: 0x7fffffff };
    default:
      return null;
  }
}

function readChars(dv: DataView, offset: number, len: number): string {
  const view = new Uint8Array(dv.buffer, dv.byteOffset + offset, len);
  let end = view.indexOf(0);
  if (end < 0) end = len;
  return new TextDecoder('utf-8').decode(view.subarray(0, end));
}

export function writeChars(dv: DataView, offset: number, len: number, text: string): void {
  const out = new Uint8Array(dv.buffer, dv.byteOffset + offset, len);
  out.fill(0);
  const encoder = new TextEncoder();
  let written = 0;
  for (const ch of text) {
    const encoded = encoder.encode(ch);
    if (written + encoded.length > len) break;
    out.set(encoded, written);
    written += encoded.length;
  }
}

function readChars16(dv: DataView, offset: number, units: number): string {
  let end = units;
  for (let i = 0; i < units; i++) {
    if (dv.getUint16(offset + i * 2, true) === 0) {
      end = i;
      break;
    }
  }
  let out = '';
  for (let i = 0; i < end; i++) out += String.fromCharCode(dv.getUint16(offset + i * 2, true));
  return out;
}

export function writeChars16(dv: DataView, offset: number, units: number, text: string): void {
  for (let i = 0; i < units; i++) {
    dv.setUint16(offset + i * 2, i < text.length ? text.charCodeAt(i) : 0, true);
  }
}

function decodeType(
  type: FieldType,
  dv: DataView,
  offset: number,
  name: string,
  path: string,
): DecodedNode {
  switch (type.kind) {
    case 'prim': {
      const raw = readPrim(dv, offset, type.prim);
      const value =
        typeof raw === 'bigint'
          ? ({ kind: 'bigint', value: raw } as const)
          : ({ kind: 'number', value: raw } as const);
      return { name, path, offset, size: sizeOf(type), type, value };
    }
    case 'char':
      return {
        name,
        path,
        offset,
        size: type.len,
        type,
        value: { kind: 'text', value: readChars(dv, offset, type.len) },
      };
    case 'wchar':
      return {
        name,
        path,
        offset,
        size: type.len * 2,
        type,
        value: { kind: 'text', value: readChars16(dv, offset, type.len) },
      };
    case 'bitfield':
      return decodeBitfieldAt(type.def, dv, offset, name, path);
    case 'bytes':
      return {
        name,
        path,
        offset,
        size: type.len,
        type,
        value: {
          kind: 'bytes',
          value: new Uint8Array(dv.buffer, dv.byteOffset + offset, type.len),
        },
      };
    case 'array': {
      const elementSize = sizeOf(type.element);
      const children: DecodedNode[] = [];
      for (let i = 0; i < type.count; i++) {
        children.push(
          decodeType(type.element, dv, offset + i * elementSize, `[${i}]`, `${path}[${i}]`),
        );
      }
      return {
        name,
        path,
        offset,
        size: elementSize * type.count,
        type,
        value: { kind: 'group' },
        children,
      };
    }
    case 'struct':
      return decodeStructAt(type.def, dv, offset, name, path);
  }
}

function decodeStructAt(
  def: StructDef,
  dv: DataView,
  base: number,
  name: string,
  path: string,
): DecodedNode {
  const children: DecodedNode[] = [];
  let cursor = base;
  for (const field of def.fields) {
    const childPath = path ? `${path}.${field.name}` : field.name;
    const node = decodeType(field.type, dv, cursor, field.name, childPath);
    if (field.format) node.summary = field.format(node);
    children.push(node);
    cursor += node.size;
  }
  const node: DecodedNode = {
    name,
    path,
    offset: base,
    size: cursor - base,
    type: { kind: 'struct', def },
    value: { kind: 'group' },
    children,
  };
  if (def.format) node.summary = def.format(node);
  return node;
}

function decodeBitfieldAt(
  def: BitfieldDef,
  dv: DataView,
  base: number,
  name: string,
  path: string,
): DecodedNode {
  const byteLen = bitfieldBytes(def);
  const children: DecodedNode[] = [];
  let bitPos = 0;
  for (const member of def.members) {
    const startByte = bitPos >> 3;
    const endByte = (bitPos + member.bits - 1) >> 3;
    const containerBytes = endByte - startByte + 1;
    const containerOffset = base + startByte;
    const bitOffset = bitPos - startByte * 8;
    const value =
      Math.floor(readUintN(dv, containerOffset, containerBytes) / 2 ** bitOffset) %
      2 ** member.bits;
    children.push({
      name: member.name,
      path: `${path}.${member.name}`,
      offset: containerOffset,
      size: 0,
      type: { kind: 'prim', prim: 'u8' },
      value: { kind: 'number', value },
      bits: { containerOffset, containerBytes, bitOffset, bitWidth: member.bits },
    });
    bitPos += member.bits;
  }
  const node: DecodedNode = {
    name,
    path,
    offset: base,
    size: byteLen,
    type: { kind: 'bitfield', def },
    value: { kind: 'group' },
    children,
  };
  if (byteLen <= 4) {
    const container = readUintN(dv, base, byteLen);
    node.summary = `0x${container
      .toString(16)
      .toUpperCase()
      .padStart(byteLen * 2, '0')}`;
  }
  return node;
}

export function decodeStruct(def: StructDef, bytes: Uint8Array): DecodedNode {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return decodeStructAt(def, dv, 0, def.name, '');
}
