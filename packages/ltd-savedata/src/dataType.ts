export enum DataType {
  Bool = 0,
  BoolArray = 1,
  Int = 2,
  IntArray = 3,
  Float = 4,
  FloatArray = 5,
  Enum = 6,
  EnumArray = 7,
  Vector2 = 8,
  Vector2Array = 9,
  Vector3 = 10,
  Vector3Array = 11,
  String16 = 12,
  String16Array = 13,
  String32 = 14,
  String32Array = 15,
  String64 = 16,
  String64Array = 17,
  Binary = 18,
  BinaryArray = 19,
  UInt = 20,
  UIntArray = 21,
  Int64 = 22,
  Int64Array = 23,
  UInt64 = 24,
  UInt64Array = 25,
  WString16 = 26,
  WString16Array = 27,
  WString32 = 28,
  WString32Array = 29,
  WString64 = 30,
  WString64Array = 31,
  Bool64bitKey = 32,
}

export const DATA_TYPE_COUNT = 33;

export function isInline(t: DataType): boolean {
  return (
    t === DataType.Bool ||
    t === DataType.Int ||
    t === DataType.UInt ||
    t === DataType.Float ||
    t === DataType.Enum
  );
}

export function stringCapacity(t: DataType): number | null {
  switch (t) {
    case DataType.String16:
      return 16;
    case DataType.String32:
      return 32;
    case DataType.String64:
      return 64;
    case DataType.WString16:
      return 32; // 16 UTF-16 chars
    case DataType.WString32:
      return 64;
    case DataType.WString64:
      return 128;
    default:
      return null;
  }
}

export function isWideString(t: DataType): boolean {
  return t === DataType.WString16 || t === DataType.WString32 || t === DataType.WString64;
}

export function isNarrowString(t: DataType): boolean {
  return t === DataType.String16 || t === DataType.String32 || t === DataType.String64;
}
