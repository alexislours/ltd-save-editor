import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/session/sessionPersist', () => ({
  schedulePersist: vi.fn(),
  flushAllPending: vi.fn(),
}));

import { mapAccessor, mapSave, syncFromSave as syncMap } from './mapSave.svelte';
import { MAP_SCHEMA } from '$lib/sav/schema';
import { setSaveFromBytes, clearSave } from '$lib/saveFile/saveFile.svelte';
import { schedulePersist } from '$lib/session/sessionPersist';
import * as encodeModule from '$lib/sav/materialized/encode';
import * as writeModule from '$lib/sav/write';

const MAP_PATH = resolve('sample/saves/1/Map.sav');

function loadBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

function loadMap(): void {
  const bytes = loadBytes(MAP_PATH);
  setSaveFromBytes('map', { name: 'Map.sav', bytes }, { persist: false });
  syncMap();
}

const scheduleSpy = schedulePersist as unknown as ReturnType<typeof vi.fn>;

describe.runIf(existsSync(MAP_PATH))('mapSave dirty', () => {
  beforeEach(() => {
    clearSave('map', { persist: false });
    syncMap();
    scheduleSpy.mockClear();
  });

  it('loading a map save leaves dirty=false', () => {
    loadMap();
    expect(mapSave.dirty).toBe(false);
  });

  it('accessor.setElement flips mapSave.dirty and calls schedulePersist', () => {
    loadMap();
    scheduleSpy.mockClear();
    const acc = mapAccessor()!;
    const original = acc.getElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0);
    acc.setElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0, original + 1n);
    expect(mapSave.dirty).toBe(true);
    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    expect(scheduleSpy).toHaveBeenCalledWith('map');
  });

  it('syncFromSave after a fresh load clears dirty back to false', () => {
    loadMap();
    const acc = mapAccessor()!;
    const original = acc.getElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0);
    acc.setElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0, original + 1n);
    expect(mapSave.dirty).toBe(true);
    loadMap();
    expect(mapSave.dirty).toBe(false);
  });

  it('reading mapSave.dirty does not encode or rewrite the save', () => {
    loadMap();
    const acc = mapAccessor()!;
    const original = acc.getElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0);
    acc.setElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0, original + 1n);
    expect(mapSave.dirty).toBe(true);
    const encodeSpy = vi.spyOn(encodeModule, 'encode');
    const writeSpy = vi.spyOn(writeModule, 'writeSav');
    for (let i = 0; i < 10; i++) {
      void mapSave.dirty;
    }
    expect(encodeSpy).toHaveBeenCalledTimes(0);
    expect(writeSpy).toHaveBeenCalledTimes(0);
    encodeSpy.mockRestore();
    writeSpy.mockRestore();
  });
});
