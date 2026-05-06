import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMaterializedAccessor } from '$lib/sav/materialized/accessor';
import { decode } from '$lib/sav/materialized/decode';
import { encode } from '$lib/sav/materialized/encode';
import { parseSav } from '$lib/sav/parse';
import { PLAYER_SCHEMA } from '$lib/sav/schema';
import { writeSav } from '$lib/sav/write';
import { applyUgc, extractUgc } from './applyUgc';
import { encodeLtdUgc, type LtdUgc } from './codec';
import { type PlayerOnlySaves } from './savAccess';
import { type SidecarSource } from '$lib/shareMii/sidecar/sidecar';
import { ugcKindIndex, type UgcKind } from './ugcKinds';

const PLAYER_PATH = resolve('sample/saves/1/Player.sav');

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(
    Buffer.from(b.buffer, b.byteOffset, b.byteLength),
  );
}

function loadPlayer(): Uint8Array {
  return new Uint8Array(readFileSync(PLAYER_PATH));
}

function makeSaves(playerBytes: Uint8Array): {
  saves: PlayerOnlySaves;
  reEncode: () => Uint8Array;
} {
  const parsed = parseSav(playerBytes);
  const decoded = decode(PLAYER_SCHEMA, parsed);
  const saves: PlayerOnlySaves = {
    player: createMaterializedAccessor<'player'>(PLAYER_SCHEMA, decoded),
  };
  return { saves, reEncode: () => writeSav(encode(PLAYER_SCHEMA, decoded)) };
}

function makeFakeLtd(
  kind: UgcKind,
  fieldCount: number,
  withVector: boolean,
  withVector2: boolean,
): {
  ltdBytes: Uint8Array;
  sidecar: SidecarSource;
  expectedTextures: { canvas: Uint8Array; ugc: Uint8Array; thumb: Uint8Array };
} {
  const fields = new Uint8Array(fieldCount * 4);
  for (let i = 0; i < fields.byteLength; i++) fields[i] = (i + 1) & 0xff;

  const vector = new Uint8Array(12);
  if (withVector) {
    const dv = new DataView(vector.buffer);
    dv.setFloat32(0, 1.5, true);
    dv.setFloat32(4, 2.5, true);
    dv.setFloat32(8, 3.5, true);
  }
  const vector2 = new Uint8Array(8);
  if (withVector2) {
    const dv = new DataView(vector2.buffer);
    dv.setFloat32(0, 4.25, true);
    dv.setFloat32(4, 5.25, true);
  }

  const name = encodeName('TestName', 128);
  const pronounce = encodeName('TestPronounce', 128);

  const goodsText = kind === 'Goods' ? encodeName('GText', 64) : undefined;
  const goodsPronounce = kind === 'Goods' ? encodeName('GPronounce', 128) : undefined;

  const canvas = new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50]);
  const ugc = new Uint8Array([0xa1, 0xa2, 0xa3, 0xa4]);
  const thumb = new Uint8Array([0xb1, 0xb2, 0xb3]);

  const ltd: LtdUgc = {
    kindIndex: ugcKindIndex(kind),
    fields,
    vector,
    vector2,
    name,
    pronounce,
    goodsText,
    goodsPronounce,
    canvasTex: canvas,
    ugcTex: ugc,
    thumbTex: thumb,
  };
  return {
    ltdBytes: encodeLtdUgc(ltd),
    sidecar: { origin: 'folder', files: new Map() },
    expectedTextures: { canvas, ugc, thumb },
  };
}

function encodeName(text: string, byteLen: number): Uint8Array {
  const out = new Uint8Array(byteLen);
  for (let i = 0; i < text.length; i++) {
    out[i * 2] = text.charCodeAt(i) & 0xff;
    out[i * 2 + 1] = (text.charCodeAt(i) >> 8) & 0xff;
  }
  return out;
}

const FIELD_COUNTS: Record<UgcKind, number> = {
  Food: 10,
  Cloth: 10,
  Goods: 17,
  Interior: 8,
  Exterior: 11,
  MapObject: 13,
  MapFloor: 8,
};

describe.runIf(existsSync(PLAYER_PATH))('shareMii UGC round-trip extract → apply', () => {
  it('Food: add-new then extract round-trips to same player bytes', () => {
    const playerBytes = loadPlayer();
    const slot = 1;
    const { ltdBytes, sidecar } = makeFakeLtd('Food', FIELD_COUNTS.Food, false, false);

    const seeded = makeSaves(playerBytes);
    applyUgc(seeded.saves, slot, 'Food', ltdBytes, true, sidecar);
    const seededBytes = seeded.reEncode();

    const sidecarForExtract: SidecarSource = { origin: 'folder', files: new Map(sidecar.files) };
    const reExtracted = extractUgc(makeSaves(seededBytes).saves, slot, 'Food', sidecarForExtract);

    const dst = makeSaves(playerBytes);
    const sidecarOut: SidecarSource = { origin: 'folder', files: new Map() };
    applyUgc(dst.saves, slot, 'Food', reExtracted.bytes, true, sidecarOut);

    expect(bytesEqual(dst.reEncode(), seededBytes)).toBe(true);
    expect(sidecarOut.files.size).toBe(3);
  });

  it('Food: replace-in-slot is idempotent on player bytes', () => {
    const playerBytes = loadPlayer();
    const slot = 2;
    const { ltdBytes, sidecar } = makeFakeLtd('Food', FIELD_COUNTS.Food, false, false);

    const seeded = makeSaves(playerBytes);
    applyUgc(seeded.saves, slot, 'Food', ltdBytes, true, sidecar);
    const seededBytes = seeded.reEncode();

    const sidecarForExtract: SidecarSource = { origin: 'folder', files: new Map(sidecar.files) };
    const extracted = extractUgc(makeSaves(seededBytes).saves, slot, 'Food', sidecarForExtract);

    const dst = makeSaves(seededBytes);
    const sidecarOut: SidecarSource = { origin: 'folder', files: new Map() };
    applyUgc(dst.saves, slot, 'Food', extracted.bytes, false, sidecarOut);

    expect(bytesEqual(dst.reEncode(), seededBytes)).toBe(true);
  });

  it('Cloth: add-new exercises BoolArray field branch and round-trips', () => {
    const playerBytes = loadPlayer();
    const slot = 1;
    const { ltdBytes, sidecar } = makeFakeLtd('Cloth', FIELD_COUNTS.Cloth, false, false);

    const seeded = makeSaves(playerBytes);
    applyUgc(seeded.saves, slot, 'Cloth', ltdBytes, true, sidecar);
    const seededBytes = seeded.reEncode();

    const sidecarForExtract: SidecarSource = { origin: 'folder', files: new Map(sidecar.files) };
    const reExtracted = extractUgc(makeSaves(seededBytes).saves, slot, 'Cloth', sidecarForExtract);

    const dst = makeSaves(playerBytes);
    const sidecarOut: SidecarSource = { origin: 'folder', files: new Map() };
    applyUgc(dst.saves, slot, 'Cloth', reExtracted.bytes, true, sidecarOut);

    expect(bytesEqual(dst.reEncode(), seededBytes)).toBe(true);
  });

  it('Goods: add-new with goodsText/goodsPronounce names round-trips', () => {
    const playerBytes = loadPlayer();
    const slot = 1;
    const { ltdBytes, sidecar } = makeFakeLtd('Goods', FIELD_COUNTS.Goods, true, false);

    const seeded = makeSaves(playerBytes);
    applyUgc(seeded.saves, slot, 'Goods', ltdBytes, true, sidecar);
    const seededBytes = seeded.reEncode();

    const sidecarForExtract: SidecarSource = { origin: 'folder', files: new Map(sidecar.files) };
    const reExtracted = extractUgc(makeSaves(seededBytes).saves, slot, 'Goods', sidecarForExtract);

    const dst = makeSaves(playerBytes);
    const sidecarOut: SidecarSource = { origin: 'folder', files: new Map() };
    applyUgc(dst.saves, slot, 'Goods', reExtracted.bytes, true, sidecarOut);

    expect(bytesEqual(dst.reEncode(), seededBytes)).toBe(true);
  });
});
