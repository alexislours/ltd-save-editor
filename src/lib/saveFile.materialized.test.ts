import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapAccessor, syncFromSave as syncMap } from './map/mapSave.svelte';
import { miiAccessor, syncFromSave as syncMii } from './mii/miiEditor.svelte';
import { playerAccessor, playerState, syncFromSave as syncPlayer } from './playerEditor.svelte';
import { decode } from './sav/materialized/decode';
import { parseSav } from './sav/parse';
import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from './sav/schema';
import { getSaveBytes, setSaveFromBytes } from './saveFile.svelte';

const SLOT_DIR = resolve('sample/saves/1');
const MII_PATH = resolve(SLOT_DIR, 'Mii.sav');
const PLAYER_PATH = resolve(SLOT_DIR, 'Player.sav');
const MAP_PATH = resolve(SLOT_DIR, 'Map.sav');

function loadBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

describe.runIf(existsSync(MII_PATH))('materialized write path through saveFile', () => {
  it('mii: mutating a leaf via the accessor lands in getSaveBytes', () => {
    const bytes = loadBytes(MII_PATH);
    setSaveFromBytes('mii', { name: 'Mii.sav', bytes }, { persist: false });
    syncMii();

    const acc = miiAccessor();
    expect(acc).not.toBeNull();
    if (!acc) return;

    const originalName = acc.getElement(MII_SCHEMA.Mii.Name.Name, 0);
    const newName = originalName === 'Axiom' ? 'AxiomB' : 'Axiom';
    const otherOriginal = acc.getElement(MII_SCHEMA.Mii.Name.Name, 1);

    acc.setElement(MII_SCHEMA.Mii.Name.Name, 0, newName);

    const out = getSaveBytes('mii');
    expect(out).not.toBeNull();
    if (!out) return;

    const reparsed = parseSav(out);
    const redecoded = decode(MII_SCHEMA, reparsed);
    const values = redecoded.values as unknown as Record<string, unknown>;
    const names = values['Mii.Name.Name'] as string[];
    expect(names[0]).toBe(newName);
    expect(names[1]).toBe(otherOriginal);
  });
});

describe.runIf(existsSync(PLAYER_PATH))('materialized write path through saveFile (player)', () => {
  it('player: mutating a scalar leaf via the accessor lands in getSaveBytes', () => {
    const bytes = loadBytes(PLAYER_PATH);
    setSaveFromBytes('player', { name: 'Player.sav', bytes }, { persist: false });
    syncPlayer();

    const acc = playerAccessor();
    expect(acc).not.toBeNull();
    if (!acc) return;

    const originalMoney = acc.get(PLAYER_SCHEMA.DailyLog.MoneyGet);
    const originalSpent = acc.get(PLAYER_SCHEMA.DailyLog.MoneySpent);
    const newMoney = (originalMoney + 1234) >>> 0;

    acc.set(PLAYER_SCHEMA.DailyLog.MoneyGet, newMoney);

    const out = getSaveBytes('player');
    expect(out).not.toBeNull();
    if (!out) return;

    const reparsed = parseSav(out);
    const redecoded = decode(PLAYER_SCHEMA, reparsed);
    const values = redecoded.values as unknown as Record<string, unknown>;
    expect(values['DailyLog.MoneyGet']).toBe(newMoney);
    expect(values['DailyLog.MoneySpent']).toBe(originalSpent);
  });

  it('player: accessor write flips state.dirty to true', () => {
    const bytes = loadBytes(PLAYER_PATH);
    setSaveFromBytes('player', { name: 'Player.sav', bytes }, { persist: false });
    syncPlayer();
    expect(playerState.dirty).toBe(false);
    const acc = playerAccessor();
    expect(acc).not.toBeNull();
    if (!acc) return;
    acc.set(PLAYER_SCHEMA.Player.Money, 12345);
    expect(playerState.dirty).toBe(true);
  });
});

describe.runIf(existsSync(MAP_PATH))('materialized write path through saveFile (map)', () => {
  it('map: mutating an array element via the accessor lands in getSaveBytes', () => {
    const bytes = loadBytes(MAP_PATH);
    setSaveFromBytes('map', { name: 'Map.sav', bytes }, { persist: false });
    syncMap();

    const acc = mapAccessor();
    expect(acc).not.toBeNull();
    if (!acc) return;

    const originalGroup = acc.getElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0);
    const otherOriginal = acc.getElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 1);
    const newGroup = originalGroup + 1n;

    acc.setElement(MAP_SCHEMA.MapGrid.UnlockAreaGroup, 0, newGroup);

    const out = getSaveBytes('map');
    expect(out).not.toBeNull();
    if (!out) return;

    const reparsed = parseSav(out);
    const redecoded = decode(MAP_SCHEMA, reparsed);
    const values = redecoded.values as unknown as Record<string, unknown>;
    const groups = values['MapGrid.UnlockAreaGroup'] as bigint[];
    expect(groups[0]).toBe(newGroup);
    expect(groups[1]).toBe(otherOriginal);
  });
});
