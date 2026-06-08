/** Scalar primitive kind in a binary struct: unsigned/signed integers (`u*`/`s*`) and floats (`f32`/`f64`). */
export type PrimKind = 'u8' | 'u16' | 'u32' | 'u64' | 's8' | 's16' | 's32' | 's64' | 'f32' | 'f64';

/**
 * One field's binary layout within a struct: a primitive, a fixed-length UTF-8
 * (`char`) or UTF-16 (`wchar`) string, raw `bytes`, a fixed-count `array`, a
 * nested `struct`, or a packed `bitfield`.
 */
export type FieldType =
  | { kind: 'prim'; prim: PrimKind; enumOptions?: readonly string[] }
  | { kind: 'char'; len: number }
  | { kind: 'wchar'; len: number }
  | { kind: 'bytes'; len: number }
  | { kind: 'array'; element: FieldType; count: number }
  | { kind: 'struct'; def: StructDef }
  | { kind: 'bitfield'; def: BitfieldDef };

/** A scalar value carried by a struct field: `number` for most primitives, `bigint` for 64-bit ones. */
export type CodecValue = number | bigint;

/** Describes how a struct field's raw {@link CodecValue} is presented and edited (e.g. epoch timestamps, durations). */
export type Codec = {
  /** Stable identifier for the codec. */
  id: string;
  /** Human-readable name shown in editors. */
  label: string;
  /** Editor input style for the value. */
  input: 'text' | 'datetime-local' | 'readonly';
  /** Format a raw value for display. */
  display: (value: CodecValue) => string;
  /** Parse edited text back into a raw value, or `null` if invalid. Absent for read-only codecs. */
  parse?: (text: string, prev: CodecValue) => CodecValue | null;
};

type Field = {
  name: string;
  type: FieldType;
  format?: (node: DecodedNode) => string;
  codec?: Codec;
};

/** A named binary struct layout: an ordered list of fields, with an optional summary formatter for the whole struct. */
export type StructDef = {
  /** Struct name, used as the root node name when decoding. */
  name: string;
  /** Ordered fields, laid out back to back with no padding. */
  fields: readonly Field[];
  /** Optional summary string built from the decoded node. */
  format?: (node: DecodedNode) => string;
};

type BitMember = { name: string; bits: number };

/** A named bitfield layout: members packed LSB-first into the smallest containing byte span. */
export type BitfieldDef = {
  /** Bitfield name, used as the node name when decoding. */
  name: string;
  /** Members in packing order, each with its bit width. */
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

/** A node in the decoded tree produced by {@link decodeStruct}: a field's value plus its location and any children. */
export type DecodedNode = {
  /** Field name (or `[i]` for array elements). */
  name: string;
  /** Dotted path from the struct root. */
  path: string;
  /** Byte offset of the field within the struct. */
  offset: number;
  /** Byte size of the field (0 for individual bitfield members). */
  size: number;
  /** The field's binary layout. */
  type: FieldType;
  /** The decoded scalar or a `group` marker for structs, arrays, and bitfields. */
  value: DecodedValue;
  /** Optional display summary from a field/struct formatter or codec. */
  summary?: string;
  /** Optional value codec attached to the field. */
  codec?: Codec;
  /** Child nodes for structs, arrays, and bitfields. */
  children?: DecodedNode[];
  /** Bit placement for bitfield members. */
  bits?: BitSpan;
};

/** Build a nested-struct {@link FieldType} from a {@link StructDef}. */
export function struct(def: StructDef): FieldType {
  return { kind: 'struct', def };
}

/** Build a {@link FieldType} for a packed {@link BitfieldDef}. */
export function bitfield(def: BitfieldDef): FieldType {
  return { kind: 'bitfield', def };
}

/** Build a fixed-count array {@link FieldType} of `count` `element`s. */
export function array(element: FieldType, count: number): FieldType {
  return { kind: 'array', element, count };
}

/** Build a primitive {@link FieldType}, optionally tagged with enum option names. */
export function prim(p: PrimKind, enumOptions?: readonly string[]): FieldType {
  return { kind: 'prim', prim: p, enumOptions };
}

/** Build a fixed-length UTF-8 string {@link FieldType} of `len` bytes. */
export function char(len: number): FieldType {
  return { kind: 'char', len };
}

/** Build a fixed-length UTF-16 string {@link FieldType} of `len` code units. */
export function wchar(len: number): FieldType {
  return { kind: 'wchar', len };
}

/** Build a raw-bytes {@link FieldType} of `len` bytes. */
export function bytes(len: number): FieldType {
  return { kind: 'bytes', len };
}
