import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { setBool, setFloat, setInt, setString, setVector3 } from './codec';
import { DataType } from './dataType';
import { parseSav } from './parse';
import type { Entry, SavFile } from './types';
import { writeSav } from './write';

function makeInline(hash: number, type: DataType, raw: number): Entry {
  const e: Entry = { hash, type, inlineRaw: 0 };
  switch (type) {
    case DataType.Bool:
      setBool(e, raw !== 0);
      break;
    case DataType.Int:
      setInt(e, raw);
      break;
    case DataType.Float:
      setFloat(e, raw);
      break;
    default:
      e.inlineRaw = raw >>> 0;
  }
  return e;
}

function fixture(): SavFile {
  const intArray: Entry = {
    hash: 0x10000001,
    type: DataType.IntArray,
    payload: new Uint8Array(4 + 3 * 4),
  };
  const dv = new DataView(intArray.payload!.buffer);
  dv.setUint32(0, 3, true);
  dv.setInt32(4, 1, true);
  dv.setInt32(8, -2, true);
  dv.setInt32(12, 1234, true);

  const wstring: Entry = { hash: 0x20000002, type: DataType.WString32 };
  setString(wstring, 'hello');

  const vec3: Entry = { hash: 0x30000003, type: DataType.Vector3, payload: new Uint8Array(12) };
  setVector3(vec3, { x: 1.5, y: -2.5, z: 3.5 });

  const int64: Entry = { hash: 0x40000004, type: DataType.Int64, payload: new Uint8Array(8) };
  new DataView(int64.payload!.buffer).setBigInt64(0, -123456789012345n, true);

  return {
    version: 7,
    entries: [
      makeInline(0x00000001, DataType.Bool, 1),
      makeInline(0x00000002, DataType.Bool, 0),
      makeInline(0x00000003, DataType.Int, -42),
      makeInline(0x00000004, DataType.Float, 3.14),
      intArray,
      wstring,
      vec3,
      int64,
    ],
  };
}

describe('parseSav / writeSav', () => {
  it('rejects files smaller than the header', () => {
    expect(() => parseSav(new Uint8Array(8))).toThrow(/too small/);
  });

  it('rejects files with bad magic', () => {
    const bytes = new Uint8Array(0x40);
    bytes[0] = 0xff;
    expect(() => parseSav(bytes)).toThrow(/Bad magic/);
  });

  it('round-trips a synthetic save byte-for-byte', () => {
    const file = fixture();
    const written = writeSav(file);

    expect(written[0]).toBe(0x04);
    expect(written[1]).toBe(0x03);
    expect(written[2]).toBe(0x02);
    expect(written[3]).toBe(0x01);

    const reparsed = parseSav(written);
    const rewritten = writeSav(reparsed);

    expect(rewritten.byteLength).toBe(written.byteLength);
    expect(rewritten).toEqual(written);
  });

  it('preserves entry values across parse/write', () => {
    const original = fixture();
    const reparsed = parseSav(writeSav(original));

    expect(reparsed.version).toBe(original.version);
    expect(reparsed.entries).toHaveLength(original.entries.length);

    const byHash = new Map(reparsed.entries.map((e) => [e.hash, e]));
    expect(byHash.get(0x00000001)?.inlineRaw).toBe(1);
    expect(byHash.get(0x00000003)?.type).toBe(DataType.Int);
    expect(byHash.get(0x10000001)?.payload?.byteLength).toBe(4 + 3 * 4);
    expect(byHash.get(0x20000002)?.payload?.byteLength).toBe(64);
  });

  it('rejects entries with invalid DataType', () => {
    const bad: SavFile = {
      version: 1,
      entries: [{ hash: 1, type: 999 as DataType, inlineRaw: 0 }],
    };
    expect(() => writeSav(bad)).toThrow(/invalid DataType/);
  });

  it('throws when a heap entry is missing its payload', () => {
    const missing: SavFile = {
      version: 1,
      entries: [{ hash: 1, type: DataType.Int64 }],
    };
    expect(() => writeSav(missing)).toThrow(/missing its heap payload/);
  });
});

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(
    Buffer.from(b.buffer, b.byteOffset, b.byteLength),
  );
}

describe.runIf(existsSync(resolve('sample/Player.sav')))('real save fixtures', () => {
  it.each(['Player.sav', 'Mii.sav', 'Map.sav'])('parses and re-encodes %s idempotently', (name) => {
    const path = resolve('sample', name);
    if (!existsSync(path)) return;
    const bytes = new Uint8Array(readFileSync(path));
    const parsed = parseSav(bytes);
    const rewritten = writeSav(parsed);
    const reparsed = parseSav(rewritten);
    expect(reparsed.entries).toHaveLength(parsed.entries.length);
    const rewrittenAgain = writeSav(reparsed);
    expect(rewrittenAgain.byteLength).toBe(rewritten.byteLength);
    expect(bytesEqual(rewrittenAgain, rewritten)).toBe(true);
  });
});
