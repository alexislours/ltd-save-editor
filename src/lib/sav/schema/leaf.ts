import { DataType } from '$lib/sav/dataType';

declare const brand: unique symbol;

export type SchemaLeaf<T extends DataType = DataType> = {
  readonly hash: number;
  readonly type: T;
};

export type Leaf<T extends DataType = DataType, K extends string = string> = SchemaLeaf<T> & {
  readonly [brand]: K;
};

export interface ValueOf {
  [DataType.Bool]: boolean;
  [DataType.BoolArray]: boolean[];
  [DataType.Int]: number;
  [DataType.IntArray]: number[];
  [DataType.Float]: number;
  [DataType.FloatArray]: number[];
  [DataType.Enum]: number;
  [DataType.EnumArray]: number[];
  [DataType.Vector2]: { x: number; y: number };
  [DataType.Vector2Array]: { x: number; y: number }[];
  [DataType.Vector3]: { x: number; y: number; z: number };
  [DataType.Vector3Array]: { x: number; y: number; z: number }[];
  [DataType.String16]: string;
  [DataType.String16Array]: string[];
  [DataType.String32]: string;
  [DataType.String32Array]: string[];
  [DataType.String64]: string;
  [DataType.String64Array]: string[];
  [DataType.Binary]: Uint8Array;
  [DataType.BinaryArray]: Uint8Array[];
  [DataType.UInt]: number;
  [DataType.UIntArray]: number[];
  [DataType.Int64]: bigint;
  [DataType.Int64Array]: bigint[];
  [DataType.UInt64]: bigint;
  [DataType.UInt64Array]: bigint[];
  [DataType.WString16]: string;
  [DataType.WString16Array]: string[];
  [DataType.WString32]: string;
  [DataType.WString32Array]: string[];
  [DataType.WString64]: string;
  [DataType.WString64Array]: string[];
  [DataType.Bool64bitKey]: null;
}

export interface ElementOf {
  [DataType.BoolArray]: DataType.Bool;
  [DataType.IntArray]: DataType.Int;
  [DataType.UIntArray]: DataType.UInt;
  [DataType.FloatArray]: DataType.Float;
  [DataType.EnumArray]: DataType.Enum;
  [DataType.Int64Array]: DataType.Int64;
  [DataType.UInt64Array]: DataType.UInt64;
  [DataType.Vector2Array]: DataType.Vector2;
  [DataType.Vector3Array]: DataType.Vector3;
  [DataType.String16Array]: DataType.String16;
  [DataType.String32Array]: DataType.String32;
  [DataType.String64Array]: DataType.String64;
  [DataType.WString16Array]: DataType.WString16;
  [DataType.WString32Array]: DataType.WString32;
  [DataType.WString64Array]: DataType.WString64;
  [DataType.BinaryArray]: DataType.Binary;
}
