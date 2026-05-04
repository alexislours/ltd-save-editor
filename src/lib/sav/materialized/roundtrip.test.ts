import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSav } from '$lib/sav/parse';
import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from '$lib/sav/schema';
import { writeSav } from '$lib/sav/write';
import { decode } from './decode';
import { encode } from './encode';

const KINDS = [
  { kind: 'mii', schema: MII_SCHEMA, file: 'Mii.sav' },
  { kind: 'player', schema: PLAYER_SCHEMA, file: 'Player.sav' },
  { kind: 'map', schema: MAP_SCHEMA, file: 'Map.sav' },
] as const;

const SLOT_DIR = resolve('sample/saves/1');

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(
    Buffer.from(b.buffer, b.byteOffset, b.byteLength),
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'bigint' || typeof b === 'bigint') return a === b;
  if (a instanceof Uint8Array && b instanceof Uint8Array) return bytesEqual(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

describe.runIf(existsSync(resolve(SLOT_DIR, 'Mii.sav')))('materialized round-trip', () => {
  for (const { kind, schema, file } of KINDS) {
    it(`${kind}: decode/encode preserves writeSav output byte-for-byte`, () => {
      const path = resolve(SLOT_DIR, file);
      if (!existsSync(path)) return;
      const bytes = new Uint8Array(readFileSync(path));
      const parsed = parseSav(bytes);
      const decoded = decode(schema, parsed);
      const reEncoded = encode(schema, decoded);
      const rewritten = writeSav(reEncoded);
      const baseline = writeSav(parsed);
      expect(rewritten.byteLength).toBe(baseline.byteLength);
      expect(bytesEqual(rewritten, baseline)).toBe(true);
    });
  }

  it('mutating a value re-encodes correctly without affecting other entries', () => {
    const path = resolve(SLOT_DIR, 'Player.sav');
    if (!existsSync(path)) return;
    const bytes = new Uint8Array(readFileSync(path));
    const parsed = parseSav(bytes);
    const baseline = decode(PLAYER_SCHEMA, parsed);
    const baselineValues = baseline.values;

    const decoded = decode(PLAYER_SCHEMA, parsed);
    const moneyHash = PLAYER_SCHEMA.DailyLog.MoneyGet.hash >>> 0;
    decoded.values[moneyHash] = 9999;

    const reEncoded = encode(PLAYER_SCHEMA, decoded);
    const rewritten = writeSav(reEncoded);
    const reparsed = parseSav(rewritten);
    const redecoded = decode(PLAYER_SCHEMA, reparsed);
    const newValues = redecoded.values;

    expect(newValues[moneyHash]).toBe(9999);
    for (const key of Object.keys(baselineValues)) {
      const k = Number(key);
      if (k === moneyHash) continue;
      expect(deepEqual(newValues[k], baselineValues[k])).toBe(true);
    }
  });
});
