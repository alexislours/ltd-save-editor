import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectSaveKindFromBytes, type SaveKind } from '$lib/saveFile/saveFile.svelte';

const SLOT_DIR = resolve('sample/saves/1');
const PLAYER_PATH = resolve(SLOT_DIR, 'Player.sav');
const MII_PATH = resolve(SLOT_DIR, 'Mii.sav');
const MAP_PATH = resolve(SLOT_DIR, 'Map.sav');

function loadBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

const CASES: ReadonlyArray<{ kind: SaveKind; path: string }> = [
  { kind: 'player', path: PLAYER_PATH },
  { kind: 'mii', path: MII_PATH },
  { kind: 'map', path: MAP_PATH },
];

describe.runIf(existsSync(MII_PATH))('detectSaveKindFromBytes', () => {
  for (const { kind, path } of CASES) {
    it(`detects ${kind} from sample bytes`, () => {
      expect(detectSaveKindFromBytes(loadBytes(path))).toBe(kind);
    });
  }

  it('returns null for non-sav bytes', () => {
    expect(detectSaveKindFromBytes(new Uint8Array([0, 1, 2, 3]))).toBeNull();
  });
});
