import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DataType } from '$lib/sav/dataType';
import { murmur3_x86_32 } from '$lib/sav/hash';
import { parseSav } from '$lib/sav/parse';
import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from './index';

type Leaf = { hash: number; type: DataType };

function isLeaf(value: unknown): value is Leaf {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.hash === 'number' && typeof v.type === 'number';
}

function walk(node: unknown, prefix: string, out: Array<[string, Leaf]>): void {
  if (isLeaf(node)) {
    out.push([prefix, node]);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node)) {
    const childPath = key === '$self' ? prefix : prefix === '' ? key : `${prefix}.${key}`;
    walk(value, childPath, out);
  }
}

const KINDS = [
  { name: 'mii', schema: MII_SCHEMA as unknown, file: 'Mii.sav' },
  { name: 'player', schema: PLAYER_SCHEMA as unknown, file: 'Player.sav' },
  { name: 'map', schema: MAP_SCHEMA as unknown, file: 'Map.sav' },
] as const;

const VALID_TYPES = new Set<number>(
  Object.values(DataType).filter((v): v is number => typeof v === 'number'),
);

const SLOTS = [1, 2, 3] as const;
const slotPath = (slot: number, file: string): string => resolve(`sample/saves/${slot}/${file}`);

function isUnknown(path: string): boolean {
  return path === 'Unknown' || path.startsWith('Unknown.');
}

function hex(hash: number): string {
  return `0x${hash.toString(16).toUpperCase().padStart(8, '0')}`;
}

for (const { name, schema } of KINDS) {
  describe(`schema integrity: ${name}`, () => {
    const leaves: Array<[string, Leaf]> = [];
    walk(schema, '', leaves);

    it('hashes match murmur3 of their path', () => {
      const mismatches: string[] = [];
      for (const [path, leaf] of leaves) {
        if (isUnknown(path)) continue;
        const expected = murmur3_x86_32(path) >>> 0;
        if (expected !== leaf.hash) {
          mismatches.push(`${path}: expected ${hex(expected)}, got ${hex(leaf.hash)}`);
        }
      }
      expect(mismatches, mismatches.join('\n')).toEqual([]);
    });

    it('every leaf type is a real DataType', () => {
      const bad: string[] = [];
      for (const [path, leaf] of leaves) {
        if (!VALID_TYPES.has(leaf.type)) bad.push(`${path}: type=${leaf.type}`);
      }
      expect(bad, bad.join('\n')).toEqual([]);
    });

    it('no two paths share a hash', () => {
      const seen = new Map<number, string>();
      const dups: string[] = [];
      for (const [path, leaf] of leaves) {
        const prev = seen.get(leaf.hash);
        if (prev !== undefined) {
          dups.push(`${hex(leaf.hash)}: ${prev} & ${path}`);
        } else {
          seen.set(leaf.hash, path);
        }
      }
      expect(dups, dups.join('\n')).toEqual([]);
    });
  });
}

describe.runIf(existsSync(slotPath(1, 'Mii.sav')))('schema sample consistency', () => {
  for (const { name, schema, file } of KINDS) {
    describe(name, () => {
      const leaves: Array<[string, Leaf]> = [];
      walk(schema, '', leaves);
      const schemaByHash = new Map<number, { path: string; leaf: Leaf }>();
      for (const [path, leaf] of leaves) {
        if (!schemaByHash.has(leaf.hash)) schemaByHash.set(leaf.hash, { path, leaf });
      }

      const parsedBySlot = new Map<number, Map<number, Set<DataType>>>();
      for (const slot of SLOTS) {
        const p = slotPath(slot, file);
        if (!existsSync(p)) continue;
        const bytes = new Uint8Array(readFileSync(p));
        const parsed = parseSav(bytes);
        const byHash = new Map<number, Set<DataType>>();
        for (const entry of parsed.entries) {
          let set = byHash.get(entry.hash);
          if (!set) {
            set = new Set<DataType>();
            byHash.set(entry.hash, set);
          }
          set.add(entry.type);
        }
        parsedBySlot.set(slot, byHash);
      }

      it('parsed types match schema (slot 1)', () => {
        const slot1 = parsedBySlot.get(1);
        expect(slot1).toBeDefined();
        const mismatches: string[] = [];
        for (const [hash, types] of slot1!) {
          const entry = schemaByHash.get(hash);
          if (!entry) continue;
          if (types.size !== 1 || !types.has(entry.leaf.type)) {
            const seen = [...types].map((t) => DataType[t]).join(', ');
            mismatches.push(`${entry.path}: schema=${DataType[entry.leaf.type]} parsed={${seen}}`);
          }
        }
        expect(mismatches, mismatches.join('\n')).toEqual([]);
      });

      it('every schema hash appears in at least one available sample slot', () => {
        const slots = [...parsedBySlot.values()];
        const missing: string[] = [];
        for (const [path, leaf] of leaves) {
          if (slots.every((byHash) => !byHash.has(leaf.hash))) {
            missing.push(`${path} (${hex(leaf.hash)})`);
          }
        }
        expect(
          missing,
          `schema entries absent from every sample slot:\n${missing.join('\n')}`,
        ).toEqual([]);
      });

      it('reports drift metrics', () => {
        const unknownPrefixCount = leaves.filter(([p]) => isUnknown(p)).length;
        const perSlot: string[] = [];
        for (const slot of SLOTS) {
          const byHash = parsedBySlot.get(slot);
          if (!byHash) continue;
          let unschematised = 0;
          for (const hash of byHash.keys()) {
            if (!schemaByHash.has(hash)) unschematised++;
          }
          perSlot.push(`slot${slot}=${unschematised}`);
        }
        console.info(
          `[schema:${name}] keys=${leaves.length} unknown_prefix=${unknownPrefixCount} parsed_unschematised{${perSlot.join(' ')}}`,
        );
      });
    });
  }
});
