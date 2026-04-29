import type { SavFile } from '../sav/types';
import { decodeLtdMii, encodeLtdMii, type LtdMii } from './codec';
import { ShareMiiError } from './errors';
import { entryPayload } from './savAccess';
import {
  FACEPAINT_HASHES,
  MII_HASHES,
  facepaintCanvasFileName,
  facepaintTexFileName,
} from './ugcKinds';
import { decodeSexuality, encodeSexuality } from './sexuality';
import { decodeUtf16Name, sanitizeFileName } from './utf16';
import { EMPTY_SIDECAR, type SidecarFile, type SidecarSource } from './sidecar';

export const MII_SLOTS = 70;
const MII_BLOCK_LEN = 156;
/** Size of the count prefix inside any *Array heap payload. */
const ARRAY_HEADER = 4;

/**
 * Resolved entry payloads for the player and mii saves. Each is a live
 * reference into the parsed SavFile - mutations propagate to other consumers
 * sharing the same parsed state.
 */
type MiiEntries = {
  fpPrice: Uint8Array;
  fpTexSrc: Uint8Array;
  fpState: Uint8Array;
  fpUnknown: Uint8Array;
  fpHash: Uint8Array;
  facePaintIndex: Uint8Array;
  tempSlot: Uint8Array;
  miiNames: Uint8Array;
  miiPronunciation: Uint8Array;
  miiRaw: Uint8Array;
  isLoveGender: Uint8Array;
  personality: Uint8Array[];
};

function readEntries(player: SavFile, mii: SavFile): MiiEntries {
  return {
    fpPrice: entryPayload(player, FACEPAINT_HASHES.price, 'Facepaint.Price'),
    fpTexSrc: entryPayload(
      player,
      FACEPAINT_HASHES.textureSourceType,
      'Facepaint.TextureSourceType',
    ),
    fpState: entryPayload(player, FACEPAINT_HASHES.state, 'Facepaint.State'),
    fpUnknown: entryPayload(player, FACEPAINT_HASHES.unknown, 'Facepaint.Unknown'),
    fpHash: entryPayload(player, FACEPAINT_HASHES.hash, 'Facepaint.Hash'),
    facePaintIndex: entryPayload(mii, MII_HASHES.facePaintIndex, 'Mii.FacePaintIndex'),
    tempSlot: entryPayload(player, MII_HASHES.tempSlotMii, 'Player.TempSlotMii'),
    miiNames: entryPayload(mii, MII_HASHES.names, 'Mii.Names'),
    miiPronunciation: entryPayload(mii, MII_HASHES.pronunciation, 'Mii.Pronunciation'),
    miiRaw: entryPayload(mii, MII_HASHES.rawMii, 'Mii.Raw'),
    isLoveGender: entryPayload(mii, MII_HASHES.isLoveGender, 'Mii.IsLoveGender'),
    personality: MII_HASHES.personality.map((h, i) => entryPayload(mii, h, `Personality[${i}]`)),
  };
}

export type MiiSlotInfo = {
  /** 0 = temp slot ("In-Progress Mii"), 1..70 = real slots */
  slot: number;
  empty: boolean;
  name: string;
};

export function listMiiSlots(player: SavFile, mii: SavFile): MiiSlotInfo[] {
  const e = readEntries(player, mii);
  const out: MiiSlotInfo[] = [];
  out.push({ slot: 0, empty: false, name: 'In-Progress Mii' });
  for (let s = 0; s < MII_SLOTS; s++) {
    const start = ARRAY_HEADER + MII_BLOCK_LEN * s;
    const block = e.miiRaw.subarray(start, start + MII_BLOCK_LEN);
    const empty = isEmptyMiiBlock(block);
    const nameBuf = e.miiNames.subarray(ARRAY_HEADER + s * 64, ARRAY_HEADER + s * 64 + 64);
    const name = decodeUtf16Name(nameBuf);
    out.push({ slot: s + 1, empty, name: empty ? '' : name });
  }
  return out;
}

function isEmptyMiiBlock(block: Uint8Array): boolean {
  let sum = 0;
  for (const b of block) sum += b;
  return sum === 152;
}

function readBlock(e: MiiEntries, isTemp: boolean, slotIdx: number): Uint8Array {
  if (isTemp) return e.tempSlot.subarray(0, MII_BLOCK_LEN);
  const start = ARRAY_HEADER + MII_BLOCK_LEN * slotIdx;
  return e.miiRaw.subarray(start, start + MII_BLOCK_LEN);
}

function writeBlock(e: MiiEntries, isTemp: boolean, slotIdx: number, block: Uint8Array): void {
  if (isTemp) e.tempSlot.set(block, 0);
  else e.miiRaw.set(block, ARRAY_HEADER + MII_BLOCK_LEN * slotIdx);
}

export type ExtractMiiResult = {
  bytes: Uint8Array;
  fileName: string;
  miiName: string;
  facepaint: SidecarFile[];
};

export function extractMii(
  player: SavFile,
  mii: SavFile,
  slot: number,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ExtractMiiResult {
  const e = readEntries(player, mii);
  const isTemp = slot === 0;
  const slotIdx = slot - 1;

  const block = readBlock(e, isTemp, slotIdx);
  if (isEmptyMiiBlock(block)) {
    throw new ShareMiiError('mii_not_initialized');
  }

  let facepaintId: number | null = null;
  if (isTemp) {
    const off = ARRAY_HEADER + 4 * 70;
    const marker = e.fpState.subarray(off, off + 4);
    if (!equalsHex(marker, [0xa5, 0x8a, 0xff, 0xaf])) facepaintId = 70;
  } else {
    const id = e.facePaintIndex[ARRAY_HEADER + 4 * slotIdx];
    if (id !== 0xff) facepaintId = id;
  }

  const personality = new Uint8Array(72);
  for (let i = 0; i < 18; i++) {
    const src = isTemp
      ? new Uint8Array(4)
      : e.personality[i].subarray(ARRAY_HEADER + slotIdx * 4, ARRAY_HEADER + slotIdx * 4 + 4);
    personality.set(src, i * 4);
  }

  const name = new Uint8Array(64);
  if (isTemp) {
    const tempName = new TextEncoder().encode('Temp');
    for (let i = 0; i < tempName.length; i++) name[i * 2] = tempName[i];
  } else {
    name.set(e.miiNames.subarray(ARRAY_HEADER + slotIdx * 64, ARRAY_HEADER + slotIdx * 64 + 64));
  }
  const pronounce = new Uint8Array(128);
  if (!isTemp) {
    pronounce.set(
      e.miiPronunciation.subarray(ARRAY_HEADER + slotIdx * 128, ARRAY_HEADER + slotIdx * 128 + 128),
    );
  }

  const sexuality = new Uint8Array(4);
  if (!isTemp) {
    const bits = decodeSexuality(e.isLoveGender.subarray(ARRAY_HEADER, ARRAY_HEADER + 27));
    const slotBits = bits.slice(slotIdx * 3, slotIdx * 3 + 3);
    sexuality[0] = slotBits[0];
    sexuality[1] = slotBits[1];
    sexuality[2] = slotBits[2];
  }

  let canvasTex = new Uint8Array(0);
  let ugcTex = new Uint8Array(0);
  const facepaint: SidecarFile[] = [];
  if (facepaintId !== null) {
    const canvasName = facepaintCanvasFileName(facepaintId);
    const texName = facepaintTexFileName(facepaintId);
    const c = sidecar.files.get(canvasName);
    const t = sidecar.files.get(texName);
    if (c && t) {
      canvasTex = new Uint8Array(c);
      ugcTex = new Uint8Array(t);
      facepaint.push({ name: canvasName, bytes: canvasTex }, { name: texName, bytes: ugcTex });
    }
  }

  const ltd: LtdMii = {
    version: isTemp ? 1 : 3,
    originalVersion: isTemp ? 1 : 3,
    hasCanvas: canvasTex.byteLength > 0,
    hasUgcTex: ugcTex.byteLength > 0,
    miiBlock: block.slice(),
    personality,
    name,
    pronounce,
    sexuality,
    canvasTex,
    ugcTex,
  };
  const bytes = encodeLtdMii(ltd);

  const decodedName = isTemp ? 'Mii' : decodeUtf16Name(name);
  const baseName = isTemp ? 'Mii' : sanitizeFileName(decodedName);
  return {
    bytes,
    fileName: `${baseName}.ltd`,
    miiName: decodedName || 'Mii',
    facepaint,
  };
}

export type ApplyMiiResult = {
  facepaintWrites: SidecarFile[];
};

export function applyMii(
  player: SavFile,
  mii: SavFile,
  slot: number,
  ltdBytes: Uint8Array,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ApplyMiiResult {
  const ltd = decodeLtdMii(ltdBytes);
  const e = readEntries(player, mii);

  const isTemp = slot === 0;
  const slotIdx = slot - 1;

  if (!isTemp && isEmptyMiiBlock(readBlock(e, isTemp, slotIdx))) {
    throw new ShareMiiError('mii_not_initialized');
  }

  writeBlock(e, isTemp, slotIdx, ltd.miiBlock);

  const facepaintAvailable: 'inline' | null = ltd.hasCanvas && ltd.hasUgcTex ? 'inline' : null;

  let prevFacepaintId = 0xff;
  if (!isTemp) prevFacepaintId = e.facePaintIndex[ARRAY_HEADER + 4 * slotIdx];

  let facepaintId = prevFacepaintId;
  const facepaintWrites: SidecarFile[] = [];

  if (facepaintAvailable === 'inline') {
    if (isTemp) {
      facepaintId = 70;
    } else if (facepaintId === 0xff) {
      facepaintId = pickFacepaintId(e.facePaintIndex);
      e.facePaintIndex.set([facepaintId, 0, 0, 0], ARRAY_HEADER + 4 * slotIdx);
    }
    setU32LE(e.fpPrice, ARRAY_HEADER + 4 * facepaintId, 0x000001f4);
    e.fpTexSrc.set([0x41, 0x49, 0x93, 0x56], ARRAY_HEADER + 4 * facepaintId);
    e.fpState.set([0xf4, 0xad, 0x7f, 0x1d], ARRAY_HEADER + 4 * facepaintId);
    e.fpUnknown.set([0x00, 0x80, 0x00, 0x00], ARRAY_HEADER + 4 * facepaintId);
    e.fpHash.set([facepaintId, 0, 8, 0], ARRAY_HEADER + 4 * facepaintId);

    facepaintWrites.push({
      name: facepaintCanvasFileName(facepaintId),
      bytes: ltd.canvasTex,
    });
    facepaintWrites.push({
      name: facepaintTexFileName(facepaintId),
      bytes: ltd.ugcTex,
    });
  } else if (prevFacepaintId !== 0xff) {
    if (!isTemp) {
      e.facePaintIndex.set([0xff, 0xff, 0xff, 0xff], ARRAY_HEADER + 4 * slotIdx);
    }
    setU32LE(e.fpPrice, ARRAY_HEADER + 4 * prevFacepaintId, 0);
    e.fpTexSrc.set([0x09, 0xde, 0xee, 0xb6], ARRAY_HEADER + 4 * prevFacepaintId);
    e.fpState.set([0xa5, 0x8a, 0xff, 0xaf], ARRAY_HEADER + 4 * prevFacepaintId);
    e.fpUnknown.set([0, 0, 0, 0], ARRAY_HEADER + 4 * prevFacepaintId);
    e.fpHash.set([0, 0, 0, 0], ARRAY_HEADER + 4 * prevFacepaintId);
  }

  if (ltd.originalVersion >= 2 && !isTemp) {
    for (let i = 0; i < 18; i++) {
      const src = ltd.personality.subarray(i * 4, i * 4 + 4);
      e.personality[i].set(src, ARRAY_HEADER + slotIdx * 4);
    }
    e.miiNames.set(ltd.name, ARRAY_HEADER + slotIdx * 64);
    e.miiPronunciation.set(ltd.pronounce, ARRAY_HEADER + slotIdx * 128);

    const bits = decodeSexuality(e.isLoveGender.subarray(ARRAY_HEADER, ARRAY_HEADER + 27));
    bits[slotIdx * 3] = ltd.sexuality[0] & 1;
    bits[slotIdx * 3 + 1] = ltd.sexuality[1] & 1;
    bits[slotIdx * 3 + 2] = ltd.sexuality[2] & 1;
    e.isLoveGender.set(encodeSexuality(bits), ARRAY_HEADER);
  }

  if (sidecar.origin !== 'none' && facepaintWrites.length > 0) {
    for (const f of facepaintWrites) sidecar.files.set(f.name, f.bytes);
  }

  return { facepaintWrites };
}

function pickFacepaintId(facePaintIndex: Uint8Array): number {
  const used = new Set<number>();
  for (let s = 0; s < MII_SLOTS; s++) {
    const id = facePaintIndex[ARRAY_HEADER + 4 * s];
    if (id !== 0xff) used.add(id);
  }
  for (let i = 0; i < MII_SLOTS; i++) {
    if (!used.has(i)) return i;
  }
  throw new ShareMiiError('no_free_facepaint_slot');
}

function setU32LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

function equalsHex(buf: Uint8Array, hex: number[]): boolean {
  if (buf.byteLength !== hex.length) return false;
  for (let i = 0; i < hex.length; i++) {
    if (buf[i] !== hex[i]) return false;
  }
  return true;
}
