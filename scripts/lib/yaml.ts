import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  type Document,
  type Pair,
  type YAMLMap,
} from 'yaml';

export const bymlHashToName = new Map<number, string>();
for (const line of readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'byml-hashes.tsv'),
  'utf8',
).split('\n')) {
  const tab = line.indexOf('\t');
  if (tab < 0) continue;
  bymlHashToName.set(Number.parseInt(line.slice(0, tab), 16) >>> 0, line.slice(tab + 1).trim());
}

export const BYML_CUSTOM_TAGS = [
  { tag: '!u', resolve: (str: string) => Number.parseInt(str, 10) >>> 0 },
  { tag: '!str', resolve: (str: string) => str },
  { tag: '!u32', resolve: (str: string) => Number.parseInt(str, 10) >>> 0 },
  { tag: '!i32', resolve: (str: string) => Number.parseInt(str, 10) | 0 },
  { tag: '!f32', resolve: (str: string) => Number.parseFloat(str) },
  { tag: '!bool', resolve: (str: string) => str === 'true' },
  { tag: '!hash32', resolve: () => null },
  { tag: '!u64', resolve: (str: string) => Number.parseInt(str, 10) },
  { tag: '!i64', resolve: (str: string) => Number.parseInt(str, 10) },
];

export class YamlEntry {
  readonly data: Record<string, unknown>;
  private readonly trailingComments: Record<string, string>;
  private readonly leadingComments: string[];

  constructor(doc: Document, node: YAMLMap, leadingComments: string[] = []) {
    this.data = node.toJS(doc) as Record<string, unknown>;
    this.trailingComments = {};
    this.leadingComments = leadingComments;
    for (const pair of node.items as Pair[]) {
      if (!isScalar(pair.key) || typeof pair.key.value !== 'string') continue;
      const value = pair.value;
      const comment = isScalar(value) ? value.comment : null;
      if (comment) this.trailingComments[pair.key.value] = comment;
    }
  }

  has(key: string): boolean {
    return key in this.data;
  }

  get(key: string): unknown {
    return this.data[key];
  }

  str(key: string): string | null {
    const v = this.data[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
  }

  uint(key: string): number {
    const v = this.data[key];
    if (typeof v === 'number') return v >>> 0;
    if (typeof v === 'string') return Number.parseInt(v, 10) >>> 0;
    return 0;
  }

  num(key: string): number | null {
    const v = this.data[key];
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const m = v.match(/^\s*(-?\d+)/);
      return m ? Number.parseInt(m[1], 10) : null;
    }
    return null;
  }

  bool(key: string): boolean {
    return this.data[key] === true;
  }

  array<T = unknown>(key: string): T[] | null {
    const v = this.data[key];
    if (!Array.isArray(v)) return null;
    return v.filter((x) => x != null) as T[];
  }

  arrayLength(key: string): number {
    const a = this.array(key);
    return a ? a.length : 0;
  }

  nested<T = unknown>(parent: string): Record<string, T> | null {
    const v = this.data[parent];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, T>;
    }
    return null;
  }

  enumLabel(key: string): string | null {
    const c = this.trailingComments[key];
    if (c) {
      const m = c.match(/=>\s*(\w+)/);
      if (m) return m[1];
    }
    const v = this.data[key];
    if (typeof v === 'number') return bymlHashToName.get(v >>> 0) ?? null;
    return null;
  }

  rowKey(key = '__RowId'): string | null {
    const c = this.trailingComments[key];
    if (c) {
      const m = c.match(/\/([A-Za-z0-9_]+)\.(?:data|actor)__/);
      if (m) return m[1];
    }
    const v = this.data[key];
    if (typeof v === 'string') {
      const m = v.match(/\/([A-Za-z0-9_]+)\.(?:data|actor)__/);
      if (m) return m[1];
      const cleaned = v.replace(/^['"]|['"]$/g, '').trim();
      return cleaned || null;
    }
    return null;
  }

  comments(): readonly string[] {
    return this.leadingComments;
  }
}

export function loadSequence(path: string): YamlEntry[] {
  const doc = parseDocument(readFileSync(path, 'utf8'), { customTags: BYML_CUSTOM_TAGS });
  let seq = doc.contents;
  if (isMap(seq)) {
    for (const pair of seq.items as Pair[]) {
      if (isScalar(pair.key) && pair.key.value === 'root' && isSeq(pair.value)) {
        seq = pair.value as typeof seq;
        break;
      }
    }
  }
  if (!isSeq(seq)) return [];
  const out: YamlEntry[] = [];
  let pendingComments: string[] = [];
  for (const item of seq.items) {
    if (isMap(item)) {
      const before = item.commentBefore ? item.commentBefore.split('\n') : [];
      const lead = pendingComments.concat(before);
      out.push(new YamlEntry(doc, item, lead));
      pendingComments = [];
      continue;
    }
    if (isScalar(item) && item.value == null) {
      if (item.commentBefore) pendingComments.push(...item.commentBefore.split('\n'));
      if (item.comment) pendingComments.push(...item.comment.split('\n'));
    }
  }
  return out;
}

export function loadMapping(path: string): YamlEntry | null {
  const doc = parseDocument(readFileSync(path, 'utf8'), { customTags: BYML_CUSTOM_TAGS });
  let node = doc.contents;
  if (isMap(node)) {
    for (const pair of node.items as Pair[]) {
      if (isScalar(pair.key) && pair.key.value === 'root' && isMap(pair.value)) {
        node = pair.value as typeof node;
        break;
      }
    }
  }
  if (!isMap(node)) return null;
  return new YamlEntry(doc, node);
}
