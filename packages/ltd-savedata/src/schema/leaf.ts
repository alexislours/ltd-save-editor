import { DataType } from '../dataType.js';

declare const brand: unique symbol;

/** A leaf in a schema tree: a field's hash, its {@link DataType}, and any enum option names. */
export type SchemaLeaf<T extends DataType = DataType> = {
  /** murmur3 hash of the field's path. */
  readonly hash: number;
  /** Wire type of the field's value. */
  readonly type: T;
  /** Option names for enum fields, if known. */
  readonly options?: readonly string[];
};

/** A {@link SchemaLeaf} carrying a phantom schema brand `K`, so leaves from different schemas are not interchangeable. */
export type Leaf<T extends DataType = DataType, K extends string = string> = SchemaLeaf<T> & {
  readonly [brand]: K;
};

/** Maps each {@link DataType} to the JS type its decoded value takes, used to type {@link Accessor} reads and writes. */
export interface ValueOf {
  /** Decoded value type of a {@link DataType.Bool} leaf. */
  [DataType.Bool]: boolean;
  /** Decoded value type of a {@link DataType.BoolArray} leaf. */
  [DataType.BoolArray]: boolean[];
  /** Decoded value type of a {@link DataType.Int} leaf. */
  [DataType.Int]: number;
  /** Decoded value type of a {@link DataType.IntArray} leaf. */
  [DataType.IntArray]: number[];
  /** Decoded value type of a {@link DataType.Float} leaf. */
  [DataType.Float]: number;
  /** Decoded value type of a {@link DataType.FloatArray} leaf. */
  [DataType.FloatArray]: number[];
  /** Decoded value type of a {@link DataType.Enum} leaf (the value's name hash). */
  [DataType.Enum]: number;
  /** Decoded value type of a {@link DataType.EnumArray} leaf. */
  [DataType.EnumArray]: number[];
  /** Decoded value type of a {@link DataType.Vector2} leaf. */
  [DataType.Vector2]: { x: number; y: number };
  /** Decoded value type of a {@link DataType.Vector2Array} leaf. */
  [DataType.Vector2Array]: { x: number; y: number }[];
  /** Decoded value type of a {@link DataType.Vector3} leaf. */
  [DataType.Vector3]: { x: number; y: number; z: number };
  /** Decoded value type of a {@link DataType.Vector3Array} leaf. */
  [DataType.Vector3Array]: { x: number; y: number; z: number }[];
  /** Decoded value type of a {@link DataType.String16} leaf. */
  [DataType.String16]: string;
  /** Decoded value type of a {@link DataType.String16Array} leaf. */
  [DataType.String16Array]: string[];
  /** Decoded value type of a {@link DataType.String32} leaf. */
  [DataType.String32]: string;
  /** Decoded value type of a {@link DataType.String32Array} leaf. */
  [DataType.String32Array]: string[];
  /** Decoded value type of a {@link DataType.String64} leaf. */
  [DataType.String64]: string;
  /** Decoded value type of a {@link DataType.String64Array} leaf. */
  [DataType.String64Array]: string[];
  /** Decoded value type of a {@link DataType.Binary} leaf. */
  [DataType.Binary]: Uint8Array;
  /** Decoded value type of a {@link DataType.BinaryArray} leaf. */
  [DataType.BinaryArray]: Uint8Array[];
  /** Decoded value type of a {@link DataType.UInt} leaf. */
  [DataType.UInt]: number;
  /** Decoded value type of a {@link DataType.UIntArray} leaf. */
  [DataType.UIntArray]: number[];
  /** Decoded value type of a {@link DataType.Int64} leaf. */
  [DataType.Int64]: bigint;
  /** Decoded value type of a {@link DataType.Int64Array} leaf. */
  [DataType.Int64Array]: bigint[];
  /** Decoded value type of a {@link DataType.UInt64} leaf. */
  [DataType.UInt64]: bigint;
  /** Decoded value type of a {@link DataType.UInt64Array} leaf. */
  [DataType.UInt64Array]: bigint[];
  /** Decoded value type of a {@link DataType.WString16} leaf. */
  [DataType.WString16]: string;
  /** Decoded value type of a {@link DataType.WString16Array} leaf. */
  [DataType.WString16Array]: string[];
  /** Decoded value type of a {@link DataType.WString32} leaf. */
  [DataType.WString32]: string;
  /** Decoded value type of a {@link DataType.WString32Array} leaf. */
  [DataType.WString32Array]: string[];
  /** Decoded value type of a {@link DataType.WString64} leaf. */
  [DataType.WString64]: string;
  /** Decoded value type of a {@link DataType.WString64Array} leaf. */
  [DataType.WString64Array]: string[];
  /** Decoded value type of a {@link DataType.Bool64bitKey} leaf (always absent). */
  [DataType.Bool64bitKey]: null;
}

/** Maps each array {@link DataType} to its element's scalar {@link DataType}, used to type element-level accessors. */
export interface ElementOf {
  /** Element type of a {@link DataType.BoolArray}. */
  [DataType.BoolArray]: DataType.Bool;
  /** Element type of a {@link DataType.IntArray}. */
  [DataType.IntArray]: DataType.Int;
  /** Element type of a {@link DataType.UIntArray}. */
  [DataType.UIntArray]: DataType.UInt;
  /** Element type of a {@link DataType.FloatArray}. */
  [DataType.FloatArray]: DataType.Float;
  /** Element type of an {@link DataType.EnumArray}. */
  [DataType.EnumArray]: DataType.Enum;
  /** Element type of an {@link DataType.Int64Array}. */
  [DataType.Int64Array]: DataType.Int64;
  /** Element type of a {@link DataType.UInt64Array}. */
  [DataType.UInt64Array]: DataType.UInt64;
  /** Element type of a {@link DataType.Vector2Array}. */
  [DataType.Vector2Array]: DataType.Vector2;
  /** Element type of a {@link DataType.Vector3Array}. */
  [DataType.Vector3Array]: DataType.Vector3;
  /** Element type of a {@link DataType.String16Array}. */
  [DataType.String16Array]: DataType.String16;
  /** Element type of a {@link DataType.String32Array}. */
  [DataType.String32Array]: DataType.String32;
  /** Element type of a {@link DataType.String64Array}. */
  [DataType.String64Array]: DataType.String64;
  /** Element type of a {@link DataType.WString16Array}. */
  [DataType.WString16Array]: DataType.WString16;
  /** Element type of a {@link DataType.WString32Array}. */
  [DataType.WString32Array]: DataType.WString32;
  /** Element type of a {@link DataType.WString64Array}. */
  [DataType.WString64Array]: DataType.WString64;
  /** Element type of a {@link DataType.BinaryArray}. */
  [DataType.BinaryArray]: DataType.Binary;
}
