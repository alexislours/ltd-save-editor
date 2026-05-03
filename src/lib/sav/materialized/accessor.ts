import { DataType } from '../dataType';
import type { ElementOf, SchemaLeaf, ValueOf } from '../schema/leaf';
import { buildHashMap } from './schemaIndex';
import type { DecodedSave } from './types';

export type Accessor<K extends string = string> = {
  has(leaf: SchemaLeaf): boolean;
  get<T extends DataType>(leaf: SchemaLeaf<T>): ValueOf[T];
  set<T extends DataType>(leaf: SchemaLeaf<T>, v: ValueOf[T]): void;
  getElement<T extends DataType>(
    leaf: SchemaLeaf<T>,
    i: number,
  ): T extends keyof ElementOf ? ValueOf[ElementOf[T]] : never;
  setElement<T extends DataType>(
    leaf: SchemaLeaf<T>,
    i: number,
    v: T extends keyof ElementOf ? ValueOf[ElementOf[T]] : never,
  ): void;
  readonly _brand?: K;
};

export type MaterializedAccessor<K extends string = string> = Accessor<K>;

const ARRAY_TYPES: ReadonlySet<DataType> = new Set([
  DataType.BoolArray,
  DataType.IntArray,
  DataType.UIntArray,
  DataType.FloatArray,
  DataType.EnumArray,
  DataType.Int64Array,
  DataType.UInt64Array,
  DataType.Vector2Array,
  DataType.Vector3Array,
  DataType.String16Array,
  DataType.String32Array,
  DataType.String64Array,
  DataType.WString16Array,
  DataType.WString32Array,
  DataType.WString64Array,
  DataType.BinaryArray,
]);

export function createMaterializedAccessor<K extends string>(
  schema: unknown,
  decoded: DecodedSave,
): Accessor<K> {
  const values = decoded.values;
  const schemaObj = schema as object;

  function resolve(leaf: SchemaLeaf): { path: string; expected: DataType } {
    const info = buildHashMap(schemaObj).get(leaf.hash >>> 0);
    if (!info) throw new Error(`Leaf 0x${leaf.hash.toString(16)} not found in schema`);
    if (info.leaf.type !== leaf.type) {
      throw new Error(
        `Leaf 0x${leaf.hash.toString(16)} type mismatch: schema=${info.leaf.type} caller=${leaf.type}`,
      );
    }
    return { path: info.path, expected: info.leaf.type };
  }

  function resolveArray(leaf: SchemaLeaf): { path: string; expected: DataType } {
    const r = resolve(leaf);
    if (!ARRAY_TYPES.has(r.expected)) {
      throw new Error(`Leaf 0x${leaf.hash.toString(16)} is not an array type (type=${r.expected})`);
    }
    return r;
  }

  return {
    has(leaf) {
      const info = buildHashMap(schemaObj).get(leaf.hash >>> 0);
      if (!info) return false;
      if (info.leaf.type !== leaf.type) {
        throw new Error(
          `Leaf 0x${leaf.hash.toString(16)} type mismatch: schema=${info.leaf.type} caller=${leaf.type}`,
        );
      }
      return info.path in values;
    },
    get(leaf) {
      const { path } = resolve(leaf);
      return values[path] as never;
    },
    set(leaf, v) {
      const { path } = resolve(leaf);
      values[path] = v;
    },
    getElement(leaf, i) {
      const { path } = resolveArray(leaf);
      const arr = values[path] as unknown[];
      return arr[i] as never;
    },
    setElement(leaf, i, v) {
      const { path } = resolveArray(leaf);
      const arr = values[path] as unknown[];
      arr[i] = v;
    },
  };
}
