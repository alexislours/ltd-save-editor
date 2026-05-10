import type { SchemaLeaf } from '$lib/sav/schema/leaf';

const HASH_CACHE = new WeakMap<object, Map<number, SchemaLeaf>>();
const PATH_CACHE = new WeakMap<object, Map<number, string>>();
const OPTIONS_CACHE = new WeakMap<object, Map<number, readonly string[]>>();

export function buildHashMap(schema: object): Map<number, SchemaLeaf> {
  const cached = HASH_CACHE.get(schema);
  if (cached) return cached;
  const map = new Map<number, SchemaLeaf>();
  walk(schema, map);
  HASH_CACHE.set(schema, map);
  return map;
}

export function buildPathMap(schema: object): Map<number, string> {
  const cached = PATH_CACHE.get(schema);
  if (cached) return cached;
  const map = new Map<number, string>();
  walkPaths(schema, '', map);
  PATH_CACHE.set(schema, map);
  return map;
}

export function buildOptionsMap(schema: object): Map<number, readonly string[]> {
  const cached = OPTIONS_CACHE.get(schema);
  if (cached) return cached;
  const map = new Map<number, readonly string[]>();
  for (const [hash, leaf] of buildHashMap(schema)) {
    if (leaf.options) map.set(hash, leaf.options);
  }
  OPTIONS_CACHE.set(schema, map);
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

function walkPaths(node: unknown, prefix: string, out: Map<number, string>): void {
  if (isLeaf(node)) {
    if (prefix !== '') out.set(node.hash >>> 0, prefix);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node)) {
    const childPath = key === '$self' ? prefix : prefix === '' ? key : `${prefix}.${key}`;
    walkPaths(value, childPath, out);
  }
}
