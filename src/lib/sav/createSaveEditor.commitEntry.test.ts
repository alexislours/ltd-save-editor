import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/session/sessionPersist', () => ({
  schedulePersist: vi.fn(),
  flushAllPending: vi.fn(),
}));

import {
  commitEntryEdit,
  playerState,
  syncFromSave as syncPlayer,
} from '$lib/player/playerEditor.svelte';
import { clearSave, getSaveBytes, setSaveFromBytes } from '$lib/saveFile/saveFile.svelte';
import { setFloat, setInt64, setUInt } from './codec';
import { DataType } from './dataType';
import { decode } from './materialized/decode';
import { parseSav } from './parse';
import { PLAYER_SCHEMA } from './schema';
import type { Entry, SavFile } from './types';
import { writeSav } from './write';

const MONEY_LEAF = PLAYER_SCHEMA.Player.Money;
const MONEY_HASH = MONEY_LEAF.hash >>> 0;

function inlineFloat(hash: number, value: number): Entry {
  const e: Entry = { hash, type: DataType.Float, inlineRaw: 0 };
  setFloat(e, value);
  return e;
}

function inlineUInt(hash: number, value: number): Entry {
  const e: Entry = { hash, type: DataType.UInt, inlineRaw: 0 };
  setUInt(e, value);
  return e;
}

function int64Entry(hash: number, value: bigint): Entry {
  const e: Entry = { hash, type: DataType.Int64, payload: new Uint8Array(8) };
  setInt64(e, value);
  return e;
}

function bytesFromEntries(entries: Entry[]): Uint8Array {
  const file: SavFile = { version: 1, entries };
  return writeSav(file);
}

function loadSyntheticPlayer(entries: Entry[]): void {
  const bytes = bytesFromEntries(entries);
  setSaveFromBytes('player', { name: 'Player.sav', bytes }, { persist: false });
  syncPlayer();
}

function findMoneyEntry(savFile: SavFile): Entry | undefined {
  return savFile.entries.find((e) => e.hash === MONEY_LEAF.hash);
}

describe('commitEntryEdit plan-aware fix', () => {
  beforeEach(() => {
    clearSave('player', { persist: false });
    syncPlayer();
  });

  it('promotes an unknown plan slot to known when a schema-typed edit arrives', () => {
    loadSyntheticPlayer([inlineFloat(MONEY_LEAF.hash, 1.5)]);
    expect(playerState.error).toBeNull();
    const decoded = playerState.decoded!;
    expect(decoded.unknowns.length).toBe(1);
    expect(decoded.unknowns[0].type).toBe(DataType.Float);
    const plan = decoded.plan;
    expect(plan?.[0]).toEqual({ kind: 'unknown', index: 0 });

    commitEntryEdit(inlineUInt(MONEY_LEAF.hash, 9999));

    const planAfter = decoded.plan;
    expect(planAfter[0]).toEqual({ kind: 'known', hash: MONEY_HASH });

    const out = getSaveBytes('player')!;
    const parsed = parseSav(out);
    const moneyEntry = findMoneyEntry(parsed);
    expect(moneyEntry).toBeDefined();
    expect(moneyEntry!.type).toBe(DataType.UInt);
    const reDecoded = decode(PLAYER_SCHEMA, parsed);
    expect(reDecoded.values[MONEY_HASH]).toBe(9999);
  });

  it('preserves a foreign-typed unknown when the edit is also foreign-typed', () => {
    loadSyntheticPlayer([inlineFloat(MONEY_LEAF.hash, 1.5)]);
    const decoded = playerState.decoded!;
    expect(decoded.unknowns[0].type).toBe(DataType.Float);

    commitEntryEdit(int64Entry(MONEY_LEAF.hash, 42n));

    const planAfter = decoded.plan;
    expect(planAfter[0]).toEqual({ kind: 'unknown', index: 0 });

    const out = getSaveBytes('player')!;
    const parsed = parseSav(out);
    const e = findMoneyEntry(parsed)!;
    expect(e.type).toBe(DataType.Int64);
  });

  it('throws on type-mismatched commit against a known plan slot', () => {
    loadSyntheticPlayer([inlineUInt(MONEY_LEAF.hash, 100)]);
    const decoded = playerState.decoded!;
    const plan = decoded.plan;
    expect(plan[0]).toEqual({ kind: 'known', hash: MONEY_HASH });

    expect(() => commitEntryEdit(inlineFloat(MONEY_LEAF.hash, 1.5))).toThrow(/type mismatch/);

    const out = getSaveBytes('player')!;
    const parsed = parseSav(out);
    const e = findMoneyEntry(parsed)!;
    expect(e.type).toBe(DataType.UInt);
    const reDecoded = decode(PLAYER_SCHEMA, parsed);
    expect(reDecoded.values[MONEY_HASH]).toBe(100);
  });

  it('round-trips a normal known commit', () => {
    loadSyntheticPlayer([inlineUInt(MONEY_LEAF.hash, 100)]);

    commitEntryEdit(inlineUInt(MONEY_LEAF.hash, 7777));

    const out = getSaveBytes('player')!;
    const parsed = parseSav(out);
    const reDecoded = decode(PLAYER_SCHEMA, parsed);
    expect(reDecoded.values[MONEY_HASH]).toBe(7777);
  });

  it('mutating the source payload after commit does not affect decoded.unknowns', () => {
    const e: Entry = {
      hash: 0xdeadbeef,
      type: DataType.Binary,
      payload: new Uint8Array([1, 2, 3, 4]),
    };
    loadSyntheticPlayer([]);
    commitEntryEdit(e);
    e.payload![0] = 0xff;
    const stored = playerState.decoded!.unknowns[0];
    expect(stored.payload![0]).toBe(1);
  });
});
