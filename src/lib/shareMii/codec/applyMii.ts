import { DataType } from '$lib/sav/dataType';
import type { Accessor } from '$lib/sav/materialized/accessor';
import { buildHashMap } from '$lib/sav/materialized/schemaIndex';
import { MII_SCHEMA, PLAYER_SCHEMA, type SchemaLeaf } from '$lib/sav/schema';
import { decodeLtdMii, encodeLtdMii, type LtdMii } from './codec';
import { ShareMiiError } from './errors';
import { leafByHashOrThrow, type MiiSaves } from './savAccess';
import {
  FACEPAINT_HASHES,
  MII_HASHES,
  facepaintCanvasFileName,
  facepaintTexFileName,
} from './ugcKinds';
import { decodeUtf16Name, encodeUtf16Name, sanitizeFileName } from './utf16';
import { EMPTY_SIDECAR, type SidecarFile, type SidecarSource } from '$lib/shareMii/sidecar/sidecar';

export const MII_SLOTS = 70;
const MII_BLOCK_LEN = 156;
const MII_DATA_LEN = 152;

function wrapMiiBlock(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(MII_BLOCK_LEN);
  new DataView(out.buffer).setUint32(0, MII_DATA_LEN, true);
  out.set(data, 4);
  return out;
}

function unwrapMiiBlock(block: Uint8Array): Uint8Array {
  return block.slice(4, MII_BLOCK_LEN);
}

const FP_TEX_SRC_USED = 0x56934941 | 0;
const FP_TEX_SRC_UNUSED = 0xb6eede09 | 0;
const FP_STATE_USED = 0x1d7fadf4 | 0;
export const FP_STATE_UNUSED = 0xafff8aa5 | 0;
const FP_UNKNOWN_USED = 0x00008000 | 0;
const FP_UNKNOWN_UNUSED = 0x00000000 | 0;
const FP_PRICE = 0x000001f4;
const FP_HASH_UNUSED = 0x00000000 | 0;
const FP_INDEX_UNUSED = -1;

function fpHashValue(facepaintId: number): number {
  return (8 << 16) | facepaintId | 0;
}

const PLAYER_LEAVES = {
  fpPrice: leafByHashOrThrow(
    PLAYER_SCHEMA,
    FACEPAINT_HASHES.price,
    'Facepaint.Price',
    DataType.IntArray,
  ),
  fpTexSrc: leafByHashOrThrow(
    PLAYER_SCHEMA,
    FACEPAINT_HASHES.textureSourceType,
    'Facepaint.TextureSourceType',
    DataType.EnumArray,
  ),
  fpState: leafByHashOrThrow(
    PLAYER_SCHEMA,
    FACEPAINT_HASHES.state,
    'Facepaint.State',
    DataType.EnumArray,
  ),
  fpUnknown: leafByHashOrThrow(
    PLAYER_SCHEMA,
    FACEPAINT_HASHES.unknown,
    'Facepaint.Unknown',
    DataType.UIntArray,
  ),
  fpHash: leafByHashOrThrow(
    PLAYER_SCHEMA,
    FACEPAINT_HASHES.hash,
    'Facepaint.Hash',
    DataType.UIntArray,
  ),
  tempSlot: leafByHashOrThrow(
    PLAYER_SCHEMA,
    MII_HASHES.tempSlotMii,
    'Player.TempSlotMii',
    DataType.Binary,
  ),
} as const;

const MII_LEAVES = {
  facePaintIndex: leafByHashOrThrow(
    MII_SCHEMA,
    MII_HASHES.facePaintIndex,
    'Mii.FacePaintIndex',
    DataType.IntArray,
  ),
  names: leafByHashOrThrow(MII_SCHEMA, MII_HASHES.names, 'Mii.Names', DataType.WString32Array),
  pronunciation: leafByHashOrThrow(
    MII_SCHEMA,
    MII_HASHES.pronunciation,
    'Mii.Pronunciation',
    DataType.WString64Array,
  ),
  rawMii: leafByHashOrThrow(MII_SCHEMA, MII_HASHES.rawMii, 'Mii.Raw', DataType.BinaryArray),
  isLoveGender: leafByHashOrThrow(
    MII_SCHEMA,
    MII_HASHES.isLoveGender,
    'Mii.IsLoveGender',
    DataType.BoolArray,
  ),
  personality: MII_HASHES.personality.map((h, i) => {
    const leaf = buildHashMap(MII_SCHEMA).get(h >>> 0);
    if (!leaf) throw new ShareMiiError('save_format_error', { label: `Personality[${i}]` });
    if (leaf.type !== DataType.IntArray && leaf.type !== DataType.EnumArray) {
      throw new ShareMiiError('save_format_error', { label: `Personality[${i}]` });
    }
    return leaf as SchemaLeaf<DataType.IntArray> | SchemaLeaf<DataType.EnumArray>;
  }) as readonly (SchemaLeaf<DataType.IntArray> | SchemaLeaf<DataType.EnumArray>)[],
} as const;

function getPersonalityElement(
  mii: Accessor<'mii'>,
  leaf: SchemaLeaf<DataType.IntArray> | SchemaLeaf<DataType.EnumArray>,
  i: number,
): number {
  if (leaf.type === DataType.IntArray) return mii.getElement(leaf, i);
  return mii.getElement(leaf, i);
}

function setPersonalityElement(
  mii: Accessor<'mii'>,
  leaf: SchemaLeaf<DataType.IntArray> | SchemaLeaf<DataType.EnumArray>,
  i: number,
  v: number,
): void {
  if (leaf.type === DataType.IntArray) mii.setElement(leaf, i, v);
  else mii.setElement(leaf, i, v >>> 0);
}

export type MiiSlotInfo = {
  slot: number;
  empty: boolean;
  name: string;
};

export function listMiiSlots(saves: MiiSaves): MiiSlotInfo[] {
  const out: MiiSlotInfo[] = [];
  out.push({ slot: 0, empty: false, name: 'In-Progress Mii' });
  for (let s = 0; s < MII_SLOTS; s++) {
    const data = saves.mii.getElement(MII_LEAVES.rawMii, s);
    const empty = isEmptyDataBlock(data);
    const name = saves.mii.getElement(MII_LEAVES.names, s);
    out.push({ slot: s + 1, empty, name: empty ? '' : name });
  }
  return out;
}

function isEmptyDataBlock(data: Uint8Array): boolean {
  if (data.byteLength !== MII_DATA_LEN) return false;
  for (const b of data) if (b !== 0) return false;
  return true;
}

function isEmptyMiiBlock(block: Uint8Array): boolean {
  if (block.byteLength !== MII_BLOCK_LEN) return false;
  let sum = 0;
  for (const b of block) sum += b;
  return sum === 152;
}

function readMiiBlock(saves: MiiSaves, isTemp: boolean, slotIdx: number): Uint8Array {
  if (isTemp) {
    const data = saves.player.get(PLAYER_LEAVES.tempSlot);
    if (data.byteLength < MII_DATA_LEN) throw new ShareMiiError('mii_not_initialized');
    return wrapMiiBlock(data.subarray(0, MII_DATA_LEN));
  }
  const data = saves.mii.getElement(MII_LEAVES.rawMii, slotIdx);
  if (data.byteLength !== MII_DATA_LEN) {
    throw new ShareMiiError('save_format_error', { label: 'Mii.Raw' });
  }
  return wrapMiiBlock(data);
}

function writeMiiBlock(saves: MiiSaves, isTemp: boolean, slotIdx: number, block: Uint8Array): void {
  const data = unwrapMiiBlock(block);
  if (isTemp) {
    const buf = saves.player.get(PLAYER_LEAVES.tempSlot);
    buf.set(data, 0);
    saves.player.set(PLAYER_LEAVES.tempSlot, buf);
  } else {
    saves.mii.setElement(MII_LEAVES.rawMii, slotIdx, data);
  }
}

export type ExtractMiiResult = {
  bytes: Uint8Array;
  fileName: string;
  miiName: string;
  facepaint: SidecarFile[];
};

export function extractMii(
  saves: MiiSaves,
  slot: number,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ExtractMiiResult {
  const isTemp = slot === 0;
  const slotIdx = slot - 1;

  const block = readMiiBlock(saves, isTemp, slotIdx);
  if (isEmptyMiiBlock(block)) {
    throw new ShareMiiError('mii_not_initialized');
  }

  let facepaintId: number | null = null;
  if (isTemp) {
    if (saves.player.getElement(PLAYER_LEAVES.fpState, 70) !== FP_STATE_UNUSED) facepaintId = 70;
  } else {
    const id = saves.mii.getElement(MII_LEAVES.facePaintIndex, slotIdx);
    if (id !== FP_INDEX_UNUSED) facepaintId = id;
  }

  const personality = new Uint8Array(72);
  const dv = new DataView(personality.buffer);
  for (let i = 0; i < 18; i++) {
    const v = isTemp ? 0 : getPersonalityElement(saves.mii, MII_LEAVES.personality[i], slotIdx);
    dv.setInt32(i * 4, v | 0, true);
  }

  const name = new Uint8Array(64);
  let decodedName: string;
  if (isTemp) {
    const tempName = new TextEncoder().encode('Temp');
    for (let i = 0; i < tempName.length; i++) name[i * 2] = tempName[i];
    decodedName = 'Mii';
  } else {
    const nameStr = saves.mii.getElement(MII_LEAVES.names, slotIdx);
    name.set(encodeUtf16Name(nameStr, 64));
    decodedName = decodeUtf16Name(name);
  }

  const pronounce = new Uint8Array(128);
  if (!isTemp) {
    const pStr = saves.mii.getElement(MII_LEAVES.pronunciation, slotIdx);
    pronounce.set(encodeUtf16Name(pStr, 128));
  }

  const sexuality = new Uint8Array(4);
  if (!isTemp) {
    const base = slotIdx * 3;
    sexuality[0] = saves.mii.getElement(MII_LEAVES.isLoveGender, base) ? 1 : 0;
    sexuality[1] = saves.mii.getElement(MII_LEAVES.isLoveGender, base + 1) ? 1 : 0;
    sexuality[2] = saves.mii.getElement(MII_LEAVES.isLoveGender, base + 2) ? 1 : 0;
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
  saves: MiiSaves,
  slot: number,
  ltdBytes: Uint8Array,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ApplyMiiResult {
  const ltd = decodeLtdMii(ltdBytes);

  const isTemp = slot === 0;
  const slotIdx = slot - 1;

  if (!isTemp && isEmptyMiiBlock(readMiiBlock(saves, isTemp, slotIdx))) {
    throw new ShareMiiError('mii_not_initialized');
  }

  writeMiiBlock(saves, isTemp, slotIdx, ltd.miiBlock);

  const facepaintAvailable: 'inline' | null = ltd.hasCanvas && ltd.hasUgcTex ? 'inline' : null;

  const prevFacepaintId = isTemp
    ? FP_INDEX_UNUSED
    : saves.mii.getElement(MII_LEAVES.facePaintIndex, slotIdx);

  let facepaintId = prevFacepaintId;
  const facepaintWrites: SidecarFile[] = [];

  if (facepaintAvailable === 'inline') {
    if (isTemp) {
      facepaintId = 70;
    } else if (facepaintId === FP_INDEX_UNUSED) {
      facepaintId = pickFacepaintId(saves.mii);
      saves.mii.setElement(MII_LEAVES.facePaintIndex, slotIdx, facepaintId);
    }
    saves.player.setElement(PLAYER_LEAVES.fpPrice, facepaintId, FP_PRICE);
    saves.player.setElement(PLAYER_LEAVES.fpTexSrc, facepaintId, FP_TEX_SRC_USED);
    saves.player.setElement(PLAYER_LEAVES.fpState, facepaintId, FP_STATE_USED);
    saves.player.setElement(PLAYER_LEAVES.fpUnknown, facepaintId, FP_UNKNOWN_USED);
    saves.player.setElement(PLAYER_LEAVES.fpHash, facepaintId, fpHashValue(facepaintId));

    facepaintWrites.push({
      name: facepaintCanvasFileName(facepaintId),
      bytes: ltd.canvasTex,
    });
    facepaintWrites.push({
      name: facepaintTexFileName(facepaintId),
      bytes: ltd.ugcTex,
    });
  } else if (prevFacepaintId !== FP_INDEX_UNUSED) {
    if (!isTemp) {
      saves.mii.setElement(MII_LEAVES.facePaintIndex, slotIdx, FP_INDEX_UNUSED);
    }
    saves.player.setElement(PLAYER_LEAVES.fpPrice, prevFacepaintId, 0);
    saves.player.setElement(PLAYER_LEAVES.fpTexSrc, prevFacepaintId, FP_TEX_SRC_UNUSED);
    saves.player.setElement(PLAYER_LEAVES.fpState, prevFacepaintId, FP_STATE_UNUSED);
    saves.player.setElement(PLAYER_LEAVES.fpUnknown, prevFacepaintId, FP_UNKNOWN_UNUSED);
    saves.player.setElement(PLAYER_LEAVES.fpHash, prevFacepaintId, FP_HASH_UNUSED);
  }

  if (ltd.originalVersion >= 2 && !isTemp) {
    const sdv = new DataView(
      ltd.personality.buffer,
      ltd.personality.byteOffset,
      ltd.personality.byteLength,
    );
    for (let i = 0; i < 18; i++) {
      setPersonalityElement(
        saves.mii,
        MII_LEAVES.personality[i],
        slotIdx,
        sdv.getInt32(i * 4, true),
      );
    }
    saves.mii.setElement(MII_LEAVES.names, slotIdx, decodeUtf16Name(ltd.name));
    saves.mii.setElement(MII_LEAVES.pronunciation, slotIdx, decodeUtf16Name(ltd.pronounce));

    const base = slotIdx * 3;
    saves.mii.setElement(MII_LEAVES.isLoveGender, base, (ltd.sexuality[0] & 1) === 1);
    saves.mii.setElement(MII_LEAVES.isLoveGender, base + 1, (ltd.sexuality[1] & 1) === 1);
    saves.mii.setElement(MII_LEAVES.isLoveGender, base + 2, (ltd.sexuality[2] & 1) === 1);
  }

  if (sidecar.origin !== 'none' && facepaintWrites.length > 0) {
    for (const f of facepaintWrites) sidecar.files.set(f.name, f.bytes);
  }

  return { facepaintWrites };
}

function pickFacepaintId(mii: Accessor<'mii'>): number {
  const used = new Set<number>();
  for (let s = 0; s < MII_SLOTS; s++) {
    const id = mii.getElement(MII_LEAVES.facePaintIndex, s);
    if (id !== FP_INDEX_UNUSED) used.add(id);
  }
  for (let i = 0; i < MII_SLOTS; i++) {
    if (!used.has(i)) return i;
  }
  throw new ShareMiiError('no_free_facepaint_slot');
}
