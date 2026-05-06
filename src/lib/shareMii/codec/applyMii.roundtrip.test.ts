import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DataType } from '$lib/sav/dataType';
import { createMaterializedAccessor } from '$lib/sav/materialized/accessor';
import { decode } from '$lib/sav/materialized/decode';
import { encode } from '$lib/sav/materialized/encode';
import { parseSav } from '$lib/sav/parse';
import { MII_SCHEMA, PLAYER_SCHEMA } from '$lib/sav/schema';
import { writeSav } from '$lib/sav/write';
import { applyMii, extractMii, listMiiSlots, MII_SLOTS } from './applyMii';
import { leafByHashOrThrow, type MiiSaves } from './savAccess';
import { EMPTY_SIDECAR, type SidecarSource } from '$lib/shareMii/sidecar/sidecar';
import { facepaintCanvasFileName, facepaintTexFileName, MII_HASHES } from './ugcKinds';

const SLOT_DIR = resolve('sample/saves/1');
const PLAYER_PATH = resolve(SLOT_DIR, 'Player.sav');
const MII_PATH = resolve(SLOT_DIR, 'Mii.sav');

const FACE_PAINT_INDEX_LEAF = leafByHashOrThrow(
  MII_SCHEMA,
  MII_HASHES.facePaintIndex,
  'Mii.FacePaintIndex',
  DataType.IntArray,
);

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(
    Buffer.from(b.buffer, b.byteOffset, b.byteLength),
  );
}

function loadSaves(): { playerBytes: Uint8Array; miiBytes: Uint8Array } {
  return {
    playerBytes: new Uint8Array(readFileSync(PLAYER_PATH)),
    miiBytes: new Uint8Array(readFileSync(MII_PATH)),
  };
}

function makeSaves(
  playerBytes: Uint8Array,
  miiBytes: Uint8Array,
): { saves: MiiSaves; reEncode: () => { player: Uint8Array; mii: Uint8Array } } {
  const playerParsed = parseSav(playerBytes);
  const miiParsed = parseSav(miiBytes);
  const playerDecoded = decode(PLAYER_SCHEMA, playerParsed);
  const miiDecoded = decode(MII_SCHEMA, miiParsed);
  const saves: MiiSaves = {
    player: createMaterializedAccessor<'player'>(PLAYER_SCHEMA, playerDecoded),
    mii: createMaterializedAccessor<'mii'>(MII_SCHEMA, miiDecoded),
  };
  return {
    saves,
    reEncode: () => ({
      player: writeSav(encode(PLAYER_SCHEMA, playerDecoded)),
      mii: writeSav(encode(MII_SCHEMA, miiDecoded)),
    }),
  };
}

function findPopulatedSlot(saves: MiiSaves): number | null {
  const list = listMiiSlots(saves);
  const found = list.find((s) => s.slot !== 0 && !s.empty);
  return found ? found.slot : null;
}

function findSlotWithFacepaint(saves: MiiSaves): number | null {
  const list = listMiiSlots(saves);
  for (const s of list) {
    if (s.slot === 0 || s.empty) continue;
    const fpId = saves.mii.getElement(FACE_PAINT_INDEX_LEAF, s.slot - 1);
    if (fpId !== -1) return s.slot;
  }
  return null;
}

function findFreeFacepaintId(saves: MiiSaves): number {
  const used = new Set<number>();
  for (let s = 0; s < MII_SLOTS; s++) {
    const id = saves.mii.getElement(FACE_PAINT_INDEX_LEAF, s);
    if (id !== -1) used.add(id);
  }
  for (let i = 0; i < MII_SLOTS; i++) if (!used.has(i)) return i;
  throw new Error('no free facepaint slot');
}

describe.runIf(existsSync(PLAYER_PATH) && existsSync(MII_PATH))(
  'shareMii round-trip extract → apply',
  () => {
    it('populated slot: extract then apply preserves player + mii bytes', () => {
      const { playerBytes, miiBytes } = loadSaves();

      const src = makeSaves(playerBytes, miiBytes);
      const slot = findPopulatedSlot(src.saves);
      if (slot === null) return;

      const extracted = extractMii(src.saves, slot, EMPTY_SIDECAR);

      const dst = makeSaves(playerBytes, miiBytes);
      applyMii(dst.saves, slot, extracted.bytes, EMPTY_SIDECAR);

      const baseline = makeSaves(playerBytes, miiBytes).reEncode();
      const out = dst.reEncode();

      expect(bytesEqual(out.player, baseline.player)).toBe(true);
      expect(bytesEqual(out.mii, baseline.mii)).toBe(true);
    });

    it('temp slot (slot 0): extract then apply preserves player + mii bytes', () => {
      const { playerBytes, miiBytes } = loadSaves();

      const probe = makeSaves(playerBytes, miiBytes);
      let extracted: ReturnType<typeof extractMii>;
      try {
        extracted = extractMii(probe.saves, 0, EMPTY_SIDECAR);
      } catch {
        return;
      }

      const dst = makeSaves(playerBytes, miiBytes);
      applyMii(dst.saves, 0, extracted.bytes, EMPTY_SIDECAR);

      const baseline = makeSaves(playerBytes, miiBytes).reEncode();
      const out = dst.reEncode();

      expect(bytesEqual(out.player, baseline.player)).toBe(true);
      expect(bytesEqual(out.mii, baseline.mii)).toBe(true);
    });

    it('slot with facepaint sidecar: round-trip preserves player + mii bytes', () => {
      const { playerBytes, miiBytes } = loadSaves();

      const src = makeSaves(playerBytes, miiBytes);
      const slot = findSlotWithFacepaint(src.saves);
      if (slot === null) {
        const free = makeSaves(playerBytes, miiBytes);
        const populated = findPopulatedSlot(free.saves);
        if (populated === null) return;
        const fpId = findFreeFacepaintId(free.saves);
        const fakeCanvas = new Uint8Array([1, 2, 3, 4, 5]);
        const fakeTex = new Uint8Array([9, 8, 7, 6]);
        const sidecarIn: SidecarSource = {
          origin: 'folder',
          files: new Map([
            [facepaintCanvasFileName(fpId), fakeCanvas],
            [facepaintTexFileName(fpId), fakeTex],
          ]),
        };
        const probe = makeSaves(playerBytes, miiBytes);
        const extracted = extractMii(probe.saves, populated, EMPTY_SIDECAR);

        const dst = makeSaves(playerBytes, miiBytes);
        const sidecarOut: SidecarSource = { origin: 'folder', files: new Map() };
        applyMii(dst.saves, populated, extracted.bytes, sidecarOut);

        const baseline = makeSaves(playerBytes, miiBytes).reEncode();
        const out = dst.reEncode();

        expect(bytesEqual(out.player, baseline.player)).toBe(true);
        expect(bytesEqual(out.mii, baseline.mii)).toBe(true);
        void sidecarIn;
        return;
      }

      const slotIdx = slot - 1;
      const fpId = src.saves.mii.getElement(FACE_PAINT_INDEX_LEAF, slotIdx);
      const fakeCanvas = new Uint8Array([1, 2, 3, 4, 5]);
      const fakeTex = new Uint8Array([9, 8, 7, 6]);
      const sidecarIn: SidecarSource = {
        origin: 'folder',
        files: new Map([
          [facepaintCanvasFileName(fpId), fakeCanvas],
          [facepaintTexFileName(fpId), fakeTex],
        ]),
      };

      const extracted = extractMii(src.saves, slot, sidecarIn);
      expect(extracted.facepaint.length).toBe(2);

      const dst = makeSaves(playerBytes, miiBytes);
      const sidecarOut: SidecarSource = { origin: 'folder', files: new Map() };
      const applied = applyMii(dst.saves, slot, extracted.bytes, sidecarOut);
      expect(applied.facepaintWrites.length).toBe(2);

      const baseline = makeSaves(playerBytes, miiBytes).reEncode();
      const out = dst.reEncode();

      expect(bytesEqual(out.player, baseline.player)).toBe(true);
      expect(bytesEqual(out.mii, baseline.mii)).toBe(true);
    });
  },
);
