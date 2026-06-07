import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/session/sessionPersist', () => ({
  schedulePersist: vi.fn(),
  flushAllPending: vi.fn(),
}));

import { commitEntryEdit, syncFromSave as syncPlayer } from '$lib/player/playerEditor.svelte';
import { setUInt, DataType, type Entry } from '@alexislours/ltd-savedata';
import { PLAYER_SCHEMA } from '@alexislours/ltd-savedata/schema';
import {
  clearSave,
  getSave,
  getSaveBytes,
  restoreSaveFromDecoded,
  setSaveFromBytes,
} from '$lib/saveFile/saveFile.svelte';

const PLAYER_PATH = resolve('sample/saves/1/Player.sav');

function loadBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

function inlineUInt(hash: number, value: number): Entry {
  const e: Entry = { hash, type: DataType.UInt, inlineRaw: 0 };
  setUInt(e, value);
  return e;
}

describe.runIf(existsSync(PLAYER_PATH))('persist/restore decoded round-trip', () => {
  it('byte-identical after structuredClone roundtrip of an unmodified save', () => {
    const bytes = loadBytes(PLAYER_PATH);
    setSaveFromBytes('player', { name: 'Player.sav', bytes }, { persist: false });
    syncPlayer();

    const before = getSaveBytes('player')!;
    const live = getSave('player')!.decoded!;
    const cloned = structuredClone(live);

    clearSave('player', { persist: false });
    restoreSaveFromDecoded('player', {
      name: 'Player.sav',
      size: before.byteLength,
      lastModified: 0,
      decoded: cloned,
    });
    syncPlayer();

    const after = getSaveBytes('player')!;
    expect(after).toEqual(before);
  });

  it('byte-identical after structuredClone roundtrip when plan was mutated by commitEntry', () => {
    const bytes = loadBytes(PLAYER_PATH);
    setSaveFromBytes('player', { name: 'Player.sav', bytes }, { persist: false });
    syncPlayer();

    commitEntryEdit(inlineUInt(PLAYER_SCHEMA.Player.Money.hash, 12345));
    const before = getSaveBytes('player')!;

    const live = getSave('player')!.decoded!;
    const cloned = structuredClone(live);

    clearSave('player', { persist: false });
    restoreSaveFromDecoded('player', {
      name: 'Player.sav',
      size: before.byteLength,
      lastModified: 0,
      decoded: cloned,
    });
    syncPlayer();

    const after = getSaveBytes('player')!;
    expect(after).toEqual(before);
  });
});
