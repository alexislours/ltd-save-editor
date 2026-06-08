import { DataType } from '../dataType.js';
import type { ElementOf, SchemaLeaf, ValueOf } from '../schema/leaf.js';
import { buildHashMap } from './schemaIndex.js';
import type { DecodedSave } from './types.js';

/**
 * Typed read/write view over a {@link DecodedSave}'s values, keyed by
 * {@link SchemaLeaf} references. The leaf's {@link DataType} drives the value type
 * of each method, so reads and writes are checked at compile time. The optional
 * `K` brand ties an accessor to a specific schema (e.g. `'player'` or `'mii'`).
 */
export type Accessor<K extends string = string> = {
  /** Whether the schema contains this leaf and the decoded save has a value for it. */
  has(leaf: SchemaLeaf): boolean;
  /** Read the value for a leaf. Throws if the leaf is absent from the schema or its type disagrees. */
  get<T extends DataType>(leaf: SchemaLeaf<T>): ValueOf[T];
  /** Write the value for a leaf. Throws if the leaf is absent from the schema or its type disagrees. */
  set<T extends DataType>(leaf: SchemaLeaf<T>, v: ValueOf[T]): void;
  /** Read element `i` of an array leaf. Throws if the leaf is not an array type. */
  getElement<T extends DataType>(
    leaf: SchemaLeaf<T>,
    i: number,
  ): T extends keyof ElementOf ? ValueOf[ElementOf[T]] : never;
  /** Write element `i` of an array leaf. Throws if the leaf is not an array type. */
  setElement<T extends DataType>(
    leaf: SchemaLeaf<T>,
    i: number,
    v: T extends keyof ElementOf ? ValueOf[ElementOf[T]] : never,
  ): void;
  /** Phantom schema brand; never present at runtime. */
  readonly _brand?: K;
};

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

/**
 * Build an {@link Accessor} that reads and writes a {@link DecodedSave}'s values
 * through {@link SchemaLeaf} references resolved against `schema`. Mutations apply
 * to `decoded` in place, so a later {@link encode} reflects them.
 */
export function createMaterializedAccessor<K extends string>(
  schema: object,
  decoded: DecodedSave,
): Accessor<K> {
  const values = decoded.values;

  function resolve(leaf: SchemaLeaf): { hash: number; expected: DataType } {
    const hash = leaf.hash >>> 0;
    const found = buildHashMap(schema).get(hash);
    if (!found) throw new Error(`Leaf 0x${leaf.hash.toString(16)} not found in schema`);
    if (found.type !== leaf.type) {
      throw new Error(
        `Leaf 0x${leaf.hash.toString(16)} type mismatch: schema=${found.type} caller=${leaf.type}`,
      );
    }
    return { hash, expected: found.type };
  }

  function resolveArray(leaf: SchemaLeaf): { hash: number; expected: DataType } {
    const r = resolve(leaf);
    if (!ARRAY_TYPES.has(r.expected)) {
      throw new Error(`Leaf 0x${leaf.hash.toString(16)} is not an array type (type=${r.expected})`);
    }
    return r;
  }

  return {
    has(leaf) {
      const hash = leaf.hash >>> 0;
      const found = buildHashMap(schema).get(hash);
      if (!found) return false;
      if (found.type !== leaf.type) {
        throw new Error(
          `Leaf 0x${leaf.hash.toString(16)} type mismatch: schema=${found.type} caller=${leaf.type}`,
        );
      }
      return hash in values;
    },
    get(leaf) {
      const { hash } = resolve(leaf);
      return values[hash] as never;
    },
    set(leaf, v) {
      const { hash } = resolve(leaf);
      values[hash] = v;
    },
    getElement(leaf, i) {
      const { hash } = resolveArray(leaf);
      const arr = values[hash] as unknown[];
      return arr[i] as never;
    },
    setElement(leaf, i, v) {
      const { hash } = resolveArray(leaf);
      const arr = values[hash] as unknown[];
      arr[i] = v;
    },
  };
}
