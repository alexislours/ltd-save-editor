import { DataType } from '$lib/sav/dataType';
import { hexU32 } from '$lib/sav/format';
import { decodeValue } from '$lib/sav/materialized/decode';
import { buildHashMap, buildPathMap } from '$lib/sav/materialized/schemaIndex';
import type { DecodedSave } from '$lib/sav/materialized/types';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';
import { valuesEqual } from './valueFormat';

export type DiffStatus = 'changed' | 'added' | 'removed';

export type DiffEntry = {
  hash: number;
  path: string;
  section: string;
  type: DataType | null;
  known: boolean;
  status: DiffStatus;
  before: unknown;
  after: unknown;
};

type DiffSection = { name: string; entries: DiffEntry[] };

type DiffCounts = { changed: number; added: number; removed: number };

export type DiffResult = {
  sections: DiffSection[];
  counts: DiffCounts;
  total: number;
};

const UNKNOWN_SECTION = 'Unknown / raw';

type NormalizedEntry = { type: DataType | null; value: unknown; known: boolean };

function normalize(
  decoded: DecodedSave,
  hashMap: Map<number, SchemaLeaf>,
): Map<number, NormalizedEntry> {
  const out = new Map<number, NormalizedEntry>();
  for (const key of Object.keys(decoded.values)) {
    const hash = Number(key) >>> 0;
    const leaf = hashMap.get(hash);
    out.set(hash, {
      type: leaf ? leaf.type : null,
      value: decoded.values[hash],
      known: leaf != null,
    });
  }
  for (const item of decoded.plan) {
    if (item.kind !== 'unknown') continue;
    const entry = decoded.unknowns[item.index];
    if (!entry) continue;
    const hash = entry.hash >>> 0;
    if (out.has(hash)) continue;
    let value: unknown;
    try {
      value = decodeValue(entry);
    } catch {
      value = entry.payload ? entry.payload.slice() : (entry.inlineRaw ?? null);
    }
    out.set(hash, { type: entry.type, value, known: false });
  }
  return out;
}

function sectionOf(path: string, known: boolean): string {
  if (!known) return UNKNOWN_SECTION;
  const dot = path.indexOf('.');
  return dot === -1 ? path : path.slice(0, dot);
}

export function diffDecoded(schema: object, before: DecodedSave, after: DecodedSave): DiffResult {
  const hashMap = buildHashMap(schema);
  const pathMap = buildPathMap(schema);
  const a = normalize(before, hashMap);
  const b = normalize(after, hashMap);

  const entries: DiffEntry[] = [];
  const counts: DiffCounts = { changed: 0, added: 0, removed: 0 };

  const hashes = new Set(a.keys());
  for (const hash of b.keys()) hashes.add(hash);
  for (const hash of hashes) {
    const ea = a.get(hash);
    const eb = b.get(hash);
    let status: DiffStatus;
    if (ea && eb) {
      if (valuesEqual(ea.value, eb.value)) continue;
      status = 'changed';
    } else if (eb) {
      status = 'added';
    } else {
      status = 'removed';
    }
    counts[status]++;
    const ref = (ea ?? eb) as NormalizedEntry;
    const path = pathMap.get(hash) ?? hexU32(hash);
    entries.push({
      hash,
      path,
      section: sectionOf(path, ref.known),
      type: ref.type,
      known: ref.known,
      status,
      before: ea?.value,
      after: eb?.value,
    });
  }

  const byName = new Map<string, DiffEntry[]>();
  for (const entry of entries) {
    const list = byName.get(entry.section);
    if (list) list.push(entry);
    else byName.set(entry.section, [entry]);
  }

  const sections: DiffSection[] = [...byName.entries()]
    .map(([name, list]) => ({
      name,
      entries: list.sort((x, y) => x.path.localeCompare(y.path) || x.hash - y.hash),
    }))
    .sort((x, y) => {
      if (x.name === UNKNOWN_SECTION) return 1;
      if (y.name === UNKNOWN_SECTION) return -1;
      return x.name.localeCompare(y.name);
    });

  return { sections, counts, total: entries.length };
}
