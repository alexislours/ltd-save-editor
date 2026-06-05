export type PrimKind = 'u8' | 'u16' | 'u32' | 'u64' | 's8' | 's16' | 's32' | 's64' | 'f32' | 'f64';

export type FieldType =
  | { kind: 'prim'; prim: PrimKind; enumOptions?: readonly string[] }
  | { kind: 'char'; len: number }
  | { kind: 'wchar'; len: number }
  | { kind: 'bytes'; len: number }
  | { kind: 'array'; element: FieldType; count: number }
  | { kind: 'struct'; def: StructDef }
  | { kind: 'bitfield'; def: BitfieldDef };

type Field = {
  name: string;
  type: FieldType;
  format?: (node: DecodedNode) => string;
};

export type StructDef = {
  name: string;
  fields: readonly Field[];
  format?: (node: DecodedNode) => string;
};

type BitMember = { name: string; bits: number };

export type BitfieldDef = {
  name: string;
  members: readonly BitMember[];
};

type DecodedValue =
  | { kind: 'number'; value: number }
  | { kind: 'bigint'; value: bigint }
  | { kind: 'text'; value: string }
  | { kind: 'bytes'; value: Uint8Array }
  | { kind: 'group' };

type BitSpan = {
  containerOffset: number;
  containerBytes: number;
  bitOffset: number;
  bitWidth: number;
};

export type DecodedNode = {
  name: string;
  path: string;
  offset: number;
  size: number;
  type: FieldType;
  value: DecodedValue;
  summary?: string;
  children?: DecodedNode[];
  bits?: BitSpan;
};

export function struct(def: StructDef): FieldType {
  return { kind: 'struct', def };
}

export function bitfield(def: BitfieldDef): FieldType {
  return { kind: 'bitfield', def };
}

export function array(element: FieldType, count: number): FieldType {
  return { kind: 'array', element, count };
}

export function prim(p: PrimKind, enumOptions?: readonly string[]): FieldType {
  return { kind: 'prim', prim: p, enumOptions };
}

export function char(len: number): FieldType {
  return { kind: 'char', len };
}

export function wchar(len: number): FieldType {
  return { kind: 'wchar', len };
}

export function bytes(len: number): FieldType {
  return { kind: 'bytes', len };
}
