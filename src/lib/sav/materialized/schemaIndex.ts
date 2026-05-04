import type { SchemaLeaf } from '../schema/paths';

export type LeafInfo = { leaf: SchemaLeaf; path: string };

const HASH_CACHE = new WeakMap<object, Map<number, LeafInfo>>();
const PATH_CACHE = new WeakMap<object, Map<string, SchemaLeaf>>();

export function buildHashMap(schema: object): Map<number, LeafInfo> {
  const cached = HASH_CACHE.get(schema);
  if (cached) return cached;
  const map = new Map<number, LeafInfo>();
  walk(schema, '', map);
  HASH_CACHE.set(schema, map);
  return map;
}

export function pathToLeafMap(schema: object): Map<string, SchemaLeaf> {
  const cached = PATH_CACHE.get(schema);
  if (cached) return cached;
  const out = new Map<string, SchemaLeaf>();
  for (const info of buildHashMap(schema).values()) {
    out.set(info.path, info.leaf);
  }
  PATH_CACHE.set(schema, out);
  return out;
}

export function pathFor(schema: object, leaf: SchemaLeaf): string {
  const info = buildHashMap(schema).get(leaf.hash >>> 0);
  if (!info || info.leaf !== leaf) {
    throw new Error(`Leaf 0x${leaf.hash.toString(16)} not found in schema`);
  }
  return info.path;
}

function isLeaf(value: unknown): value is SchemaLeaf {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.hash === 'number' && typeof v.type === 'number';
}

function walk(node: unknown, prefix: string, out: Map<number, LeafInfo>): void {
  if (isLeaf(node)) {
    out.set(node.hash >>> 0, { leaf: node, path: prefix });
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node)) {
    const childPath = key === '$self' ? prefix : prefix === '' ? key : `${prefix}.${key}`;
    walk(value, childPath, out);
  }
}
