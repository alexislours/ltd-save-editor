import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/session/sessionPersist', () => ({
  schedulePersist: vi.fn(),
  flushAllPending: vi.fn(),
}));

import {
  playerAccessor,
  playerState,
  syncFromSave as syncPlayer,
} from '$lib/player/playerEditor.svelte';
import { PLAYER_SCHEMA } from './schema';
import { DataType } from './dataType';
import { setSaveFromBytes, clearSave } from '$lib/saveFile/saveFile.svelte';
import { schedulePersist } from '$lib/session/sessionPersist';
import * as encodeModule from './materialized/encode';
import * as writeModule from './write';

const PLAYER_PATH = resolve('sample/saves/1/Player.sav');

function loadBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

function loadPlayer(): void {
  const bytes = loadBytes(PLAYER_PATH);
  setSaveFromBytes('player', { name: 'Player.sav', bytes }, { persist: false });
  syncPlayer();
}

const scheduleSpy = schedulePersist as unknown as ReturnType<typeof vi.fn>;

describe.runIf(existsSync(PLAYER_PATH))('createSaveEditor dirty + persist', () => {
  beforeEach(() => {
    clearSave('player', { persist: false });
    syncPlayer();
    scheduleSpy.mockClear();
  });

  it('loading a save leaves dirty=false', () => {
    loadPlayer();
    expect(playerState.dirty).toBe(false);
  });

  it('accessor.set flips dirty and calls schedulePersist exactly once', () => {
    loadPlayer();
    scheduleSpy.mockClear();
    const acc = playerAccessor()!;
    acc.set(PLAYER_SCHEMA.Player.Money, 4242);
    expect(playerState.dirty).toBe(true);
    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    expect(scheduleSpy).toHaveBeenCalledWith('player');
  });

  it('accessor.setElement flips dirty and calls schedulePersist', () => {
    loadPlayer();
    scheduleSpy.mockClear();
    const acc = playerAccessor()!;
    const arrLeaf = PLAYER_SCHEMA.Player.MiiBirthdayNews.WatchedMiiIndex;
    if (!acc.has(arrLeaf)) return;
    acc.setElement(arrLeaf, 0, 7);
    expect(playerState.dirty).toBe(true);
    expect(scheduleSpy).toHaveBeenCalledTimes(1);
  });

  it('two consecutive writes flip dirty once and schedulePersist twice', () => {
    loadPlayer();
    scheduleSpy.mockClear();
    const acc = playerAccessor()!;
    acc.set(PLAYER_SCHEMA.Player.Money, 1);
    acc.set(PLAYER_SCHEMA.Player.Money, 2);
    expect(playerState.dirty).toBe(true);
    expect(scheduleSpy).toHaveBeenCalledTimes(2);
  });

  it('syncFromSave after a fresh load clears dirty back to false', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    acc.set(PLAYER_SCHEMA.Player.Money, 99);
    expect(playerState.dirty).toBe(true);
    loadPlayer();
    expect(playerState.dirty).toBe(false);
  });

  it('a thrown error in the underlying set leaves dirty unchanged', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    const phantomLeaf = { hash: 0xdeadbeef, type: PLAYER_SCHEMA.Player.Money.type } as never;
    expect(playerState.dirty).toBe(false);
    expect(() => acc.set(phantomLeaf, 1)).toThrow();
    expect(playerState.dirty).toBe(false);
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('setElement on a scalar leaf throws and leaves dirty unchanged', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    expect(playerState.dirty).toBe(false);
    expect(() => acc.setElement(PLAYER_SCHEMA.Player.Money as never, 0, 1 as never)).toThrow();
    expect(playerState.dirty).toBe(false);
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('set with a forged type that mismatches the schema throws and leaves dirty unchanged', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    const forgedLeaf = {
      hash: PLAYER_SCHEMA.Player.Money.hash,
      type: DataType.Int64,
    } as never;
    expect(playerState.dirty).toBe(false);
    expect(() => acc.set(forgedLeaf, 1n as never)).toThrow(/type mismatch/);
    expect(playerState.dirty).toBe(false);
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it('has(forgedLeaf) throws for type-mismatched hashes', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    const forgedLeaf = {
      hash: PLAYER_SCHEMA.Player.Money.hash,
      type: DataType.Int64,
    } as never;
    expect(() => acc.has(forgedLeaf)).toThrow(/type mismatch/);
  });

  it('has(unknownLeaf) returns false for hashes not in the schema', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    const unknownLeaf = { hash: 0xdeadbeef, type: DataType.Int } as never;
    expect(acc.has(unknownLeaf)).toBe(false);
  });

  it('reading dirty does not encode or rewrite the save', () => {
    loadPlayer();
    const acc = playerAccessor()!;
    acc.set(PLAYER_SCHEMA.Player.Money, 4242);
    expect(playerState.dirty).toBe(true);
    const encodeSpy = vi.spyOn(encodeModule, 'encode');
    const writeSpy = vi.spyOn(writeModule, 'writeSav');
    for (let i = 0; i < 10; i++) {
      void playerState.dirty;
    }
    expect(encodeSpy).toHaveBeenCalledTimes(0);
    expect(writeSpy).toHaveBeenCalledTimes(0);
    encodeSpy.mockRestore();
    writeSpy.mockRestore();
  });
});
