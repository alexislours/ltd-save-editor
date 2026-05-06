import type { SchemaLeaf } from '$lib/sav/schema/leaf';

const HASH_CACHE = new WeakMap<object, Map<number, SchemaLeaf>>();

export function buildHashMap(schema: object): Map<number, SchemaLeaf> {
  const cached = HASH_CACHE.get(schema);
  if (cached) return cached;
  const map = new Map<number, SchemaLeaf>();
  walk(schema, map);
  HASH_CACHE.set(schema, map);
  return map;
}

function isLeaf(value: unknown): value is SchemaLeaf {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.hash === 'number' && typeof v.type === 'number';
}

function walk(node: unknown, out: Map<number, SchemaLeaf>): void {
  if (isLeaf(node)) {
    out.set(node.hash >>> 0, node);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const value of Object.values(node)) {
    walk(value, out);
  }
}
