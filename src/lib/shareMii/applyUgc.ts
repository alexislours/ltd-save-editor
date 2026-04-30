import type { Entry, SavFile } from '../sav/types';
import { decodeLtdUgc, encodeLtdUgc, type LtdUgc } from './codec';
import { ShareMiiError } from './errors';
import { entryPayload, findEntry } from './savAccess';
import {
  UGC_ENABLE_HASHES,
  UGC_FILE_EXTENSIONS,
  UGC_HASHES,
  UGC_HASH_ID_HASHES,
  UGC_HASH_INDICES,
  UGC_MAX_SLOTS,
  UGC_NAME_HASHES,
  UGC_TEX_DATA,
  UGC_TEXTURE_HASHES,
  type UgcKind,
  ugcCanvasFileName,
  ugcKindIndex,
  ugcTexFileName,
  ugcThumbFileName,
} from './ugcKinds';
import { decodeUtf16Name, encodeUtf16Name, sanitizeFileName } from './utf16';
import { EMPTY_SIDECAR, type SidecarFile, type SidecarSource } from './sidecar';

const ARRAY_HEADER = 4;

type UgcEntries = {
  fields: Uint8Array[];
  names: Uint8Array[];
  vector: Uint8Array | null;
  vector2: Uint8Array | null;
  enable: Uint8Array;
  texture: Uint8Array;
  hashId: Uint8Array;
};

function readUgcEntries(player: SavFile, kind: UgcKind): UgcEntries {
  const hashes = UGC_HASHES[kind];
  return {
    fields: hashes.fields.map((h, i) => entryPayload(player, h, `${kind}.field[${i}]`)),
    names: hashes.names.map((h, i) => entryPayload(player, h, `${kind}.name[${i}]`)),
    vector: hashes.vector ? entryPayload(player, hashes.vector, `${kind}.vector`) : null,
    vector2: hashes.vector2 ? entryPayload(player, hashes.vector2, `${kind}.vector2`) : null,
    enable: entryPayload(player, UGC_ENABLE_HASHES[kind], `${kind}.enable`),
    texture: entryPayload(player, UGC_TEXTURE_HASHES[kind], `${kind}.texture`),
    hashId: entryPayload(player, UGC_HASH_ID_HASHES[kind], `${kind}.hashId`),
  };
}

export type UgcSlotInfo = {
  slot: number;
  empty: boolean;
  name: string;
  isAddNew: boolean;
};

export function listUgcSlots(
  player: SavFile,
  kind: UgcKind,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): UgcSlotInfo[] {
  const namesP = entryPayload(player, UGC_NAME_HASHES[kind], `${kind}.names`);
  const out: UgcSlotInfo[] = [];
  const max = UGC_MAX_SLOTS[kind];
  let foundAddSlot = false;

  for (let i = 0; i < max; i++) {
    const fileName = ugcCanvasFileName(kind, i);
    const exists = sidecar.files.has(fileName);
    const nameBuf = namesP.subarray(ARRAY_HEADER + i * 128, ARRAY_HEADER + i * 128 + 128);
    const decoded = decodeUtf16Name(nameBuf);
    const looksFilled = decoded.length > 0;

    if (exists || (sidecar.origin === 'none' && looksFilled)) {
      out.push({ slot: i + 1, empty: false, name: decoded, isAddNew: false });
    } else if (!foundAddSlot) {
      out.push({ slot: i + 1, empty: true, name: '', isAddNew: true });
      foundAddSlot = true;
    }
  }
  return out;
}

export type ExtractUgcResult = {
  bytes: Uint8Array;
  fileName: string;
  itemName: string;
  textures: SidecarFile[];
};

export function extractUgc(
  player: SavFile,
  slot: number,
  kind: UgcKind,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ExtractUgcResult {
  const e = readUgcEntries(player, kind);
  const slotIdx = slot - 1;
  const kindIndex = ugcKindIndex(kind);

  const fields = new Uint8Array(e.fields.length * 4);
  for (let i = 0; i < e.fields.length; i++) {
    const src = e.fields[i].subarray(ARRAY_HEADER + slotIdx * 4, ARRAY_HEADER + slotIdx * 4 + 4);
    fields.set(src, i * 4);
  }
  const vector = e.vector
    ? e.vector.slice(ARRAY_HEADER + slotIdx * 12, ARRAY_HEADER + slotIdx * 12 + 12)
    : new Uint8Array(12);
  const vector2 = e.vector2
    ? e.vector2.slice(ARRAY_HEADER + slotIdx * 8, ARRAY_HEADER + slotIdx * 8 + 8)
    : new Uint8Array(8);
  const name = e.names[0].slice(ARRAY_HEADER + slotIdx * 128, ARRAY_HEADER + slotIdx * 128 + 128);
  const pronounce = e.names[1].slice(
    ARRAY_HEADER + slotIdx * 128,
    ARRAY_HEADER + slotIdx * 128 + 128,
  );

  let goodsText: Uint8Array | undefined;
  let goodsPronounce: Uint8Array | undefined;
  if (kind === 'Goods' && e.names[2] !== undefined && e.names[3] !== undefined) {
    goodsText = e.names[2].slice(ARRAY_HEADER + slotIdx * 64, ARRAY_HEADER + slotIdx * 64 + 64);
    goodsPronounce = e.names[3].slice(
      ARRAY_HEADER + slotIdx * 128,
      ARRAY_HEADER + slotIdx * 128 + 128,
    );
  }

  const canvasName = ugcCanvasFileName(kind, slotIdx);
  const texName = ugcTexFileName(kind, slotIdx);
  const thumbName = ugcThumbFileName(kind, slotIdx);
  const canvasTex = sidecar.files.get(canvasName);
  const ugcTex = sidecar.files.get(texName);
  const thumbTex = sidecar.files.get(thumbName);

  if (!canvasTex || !ugcTex || !thumbTex) {
    throw new ShareMiiError('ugc_missing_textures');
  }

  const ltd: LtdUgc = {
    kindIndex,
    fields,
    vector,
    vector2,
    name,
    pronounce,
    goodsText,
    goodsPronounce,
    canvasTex,
    ugcTex,
    thumbTex,
  };
  const bytes = encodeLtdUgc(ltd);
  const decodedName = decodeUtf16Name(name) || `Ugc${kind}${slotIdx}`;
  const fileName = `${sanitizeFileName(decodedName)}${UGC_FILE_EXTENSIONS[kind]}`;
  return {
    bytes,
    fileName,
    itemName: decodedName,
    textures: [
      { name: canvasName, bytes: canvasTex },
      { name: texName, bytes: ugcTex },
      { name: thumbName, bytes: thumbTex },
    ],
  };
}

export type ApplyUgcResult = {
  textureWrites: SidecarFile[];
};

export function applyUgc(
  player: SavFile,
  slot: number,
  kind: UgcKind,
  ltdBytes: Uint8Array,
  isAdding: boolean,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ApplyUgcResult {
  const decoded = decodeLtdUgc(ltdBytes);
  const expected = ugcKindIndex(kind);
  if (decoded.kindIndex !== expected) {
    throw new ShareMiiError('wrong_ugc_kind', { got: decoded.kindIndex, expected });
  }

  const e = readUgcEntries(player, kind);
  const slotIdx = slot - 1;

  if ((kind === 'Cloth' || kind === 'Goods') && !isAdding) {
    const existing = e.fields[0].subarray(
      ARRAY_HEADER + slotIdx * 4,
      ARRAY_HEADER + slotIdx * 4 + 4,
    );
    const incoming = decoded.fieldsAndVectors.subarray(0, 4);
    if (!buffersEqual(existing, incoming)) {
      throw new ShareMiiError('subtype_mismatch');
    }
  }
  if ((kind === 'Exterior' || kind === 'MapObject') && !isAdding) {
    throw new ShareMiiError('cannot_replace_kind', { kind });
  }

  for (let i = 0; i < e.fields.length; i++) {
    const src = decoded.fieldsAndVectors.subarray(i * 4, i * 4 + 4);
    e.fields[i].set(src, ARRAY_HEADER + slotIdx * 4);
  }

  if (isAdding) {
    e.enable.set([0xf4, 0xad, 0x7f, 0x1d], ARRAY_HEADER + slotIdx * 4);
    const kindOff = expected * 4;
    e.texture.set(UGC_TEX_DATA.subarray(kindOff, kindOff + 4), ARRAY_HEADER + slotIdx * 4);
    e.hashId.set([slotIdx, 0, UGC_HASH_INDICES[kind], 0], ARRAY_HEADER + slotIdx * 4);
  }

  const namesBlock = decoded.namesBlock;
  e.names[0].set(namesBlock.subarray(0, 128), ARRAY_HEADER + slotIdx * 128);
  e.names[1].set(namesBlock.subarray(128, 256), ARRAY_HEADER + slotIdx * 128);
  if (kind === 'Goods' && e.names[2] !== undefined && e.names[3] !== undefined) {
    e.names[2].set(namesBlock.subarray(256, 320), ARRAY_HEADER + slotIdx * 64);
    e.names[3].set(namesBlock.subarray(320, 448), ARRAY_HEADER + slotIdx * 128);
  }

  const fav = decoded.fieldsAndVectors;
  if (e.vector) {
    const vStart = fav.byteLength - 20;
    e.vector.set(fav.subarray(vStart, vStart + 12), ARRAY_HEADER + slotIdx * 12);
  }
  if (e.vector2) {
    const v2Start = fav.byteLength - 8;
    e.vector2.set(fav.subarray(v2Start, v2Start + 8), ARRAY_HEADER + slotIdx * 8);
  }

  const writes: SidecarFile[] = [
    { name: ugcCanvasFileName(kind, slotIdx), bytes: decoded.canvasTex },
    { name: ugcTexFileName(kind, slotIdx), bytes: decoded.ugcTex },
    { name: ugcThumbFileName(kind, slotIdx), bytes: decoded.thumbTex },
  ];
  if (sidecar.origin !== 'none') {
    for (const f of writes) sidecar.files.set(f.name, f.bytes);
  }

  return { textureWrites: writes };
}

export function getUgcSlotName(player: SavFile, kind: UgcKind, slot: number): string {
  try {
    const namesP = entryPayload(player, UGC_NAME_HASHES[kind], `${kind}.names`);
    const slotIdx = slot - 1;
    const buf = namesP.subarray(ARRAY_HEADER + slotIdx * 128, ARRAY_HEADER + slotIdx * 128 + 128);
    return decodeUtf16Name(buf);
  } catch {
    return '';
  }
}

export function renameUgcSlot(
  player: SavFile,
  kind: UgcKind,
  slot: number,
  newName: string,
): Entry {
  const entry = findEntry(player, UGC_NAME_HASHES[kind], `${kind}.names`);
  if (!entry.payload) {
    throw new ShareMiiError('save_format_error', { label: `${kind}.names` });
  }
  const slotIdx = slot - 1;
  const offset = ARRAY_HEADER + slotIdx * 128;
  const encoded = encodeUtf16Name(newName, 128);
  entry.payload.set(encoded, offset);
  return entry;
}

function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
