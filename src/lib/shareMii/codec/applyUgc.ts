import { arrayElementSize } from '$lib/sav/codec';
import { DataType } from '$lib/sav/dataType';
import type { Accessor } from '$lib/sav/materialized/accessor';
import { buildHashMap } from '$lib/sav/materialized/schemaIndex';
import { PLAYER_SCHEMA, type SchemaLeaf } from '$lib/sav/schema';
import { decodeLtdUgc, encodeLtdUgc, type LtdUgc } from './codec';
import { ShareMiiError } from './errors';
import { leafByHashOrThrow, type PlayerOnlySaves } from './savAccess';
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
import { EMPTY_SIDECAR, type SidecarFile, type SidecarSource } from '$lib/shareMii/sidecar/sidecar';

const ENABLE_USED = 0x1d7fadf4 >>> 0;

type ScalarFieldType =
  | DataType.IntArray
  | DataType.UIntArray
  | DataType.EnumArray
  | DataType.FloatArray
  | DataType.BoolArray;

type NameType = DataType.WString32Array | DataType.WString64Array;

type UgcLeaves = {
  fields: SchemaLeaf<ScalarFieldType>[];
  names: SchemaLeaf<NameType>[];
  vector: SchemaLeaf<DataType.Vector3Array> | null;
  vector2: SchemaLeaf<DataType.Vector2Array> | null;
  enable: SchemaLeaf<DataType.EnumArray>;
  texture: SchemaLeaf<DataType.EnumArray>;
  hashId: SchemaLeaf<DataType.UIntArray>;
};

function resolveScalarFieldLeaf(hash: number, label: string): SchemaLeaf<ScalarFieldType> {
  const leaf = buildHashMap(PLAYER_SCHEMA).get(hash >>> 0);
  if (!leaf) throw new ShareMiiError('save_format_error', { label });
  const t = leaf.type;
  if (
    t !== DataType.IntArray &&
    t !== DataType.UIntArray &&
    t !== DataType.EnumArray &&
    t !== DataType.FloatArray &&
    t !== DataType.BoolArray
  ) {
    throw new ShareMiiError('save_format_error', { label });
  }
  return leaf as SchemaLeaf<ScalarFieldType>;
}

function resolveNameLeaf(hash: number, label: string): SchemaLeaf<NameType> {
  const leaf = buildHashMap(PLAYER_SCHEMA).get(hash >>> 0);
  if (!leaf) throw new ShareMiiError('save_format_error', { label });
  const t = leaf.type;
  if (t !== DataType.WString32Array && t !== DataType.WString64Array) {
    throw new ShareMiiError('save_format_error', { label });
  }
  return leaf as SchemaLeaf<NameType>;
}

function resolveUgcLeaves(kind: UgcKind): UgcLeaves {
  const h = UGC_HASHES[kind];
  return {
    fields: h.fields.map((hash, i) => resolveScalarFieldLeaf(hash, `${kind}.field[${i}]`)),
    names: h.names.map((hash, i) => resolveNameLeaf(hash, `${kind}.name[${i}]`)),
    vector: h.vector
      ? leafByHashOrThrow(PLAYER_SCHEMA, h.vector, `${kind}.vector`, DataType.Vector3Array)
      : null,
    vector2: h.vector2
      ? leafByHashOrThrow(PLAYER_SCHEMA, h.vector2, `${kind}.vector2`, DataType.Vector2Array)
      : null,
    enable: leafByHashOrThrow(
      PLAYER_SCHEMA,
      UGC_ENABLE_HASHES[kind],
      `${kind}.enable`,
      DataType.EnumArray,
    ),
    texture: leafByHashOrThrow(
      PLAYER_SCHEMA,
      UGC_TEXTURE_HASHES[kind],
      `${kind}.texture`,
      DataType.EnumArray,
    ),
    hashId: leafByHashOrThrow(
      PLAYER_SCHEMA,
      UGC_HASH_ID_HASHES[kind],
      `${kind}.hashId`,
      DataType.UIntArray,
    ),
  };
}

function ugcSlotCapacity(saves: PlayerOnlySaves, leaves: UgcLeaves, kind: UgcKind): number {
  const player = saves.player;
  let cap = UGC_MAX_SLOTS[kind];
  for (const leaf of leaves.fields) cap = Math.min(cap, (player.get(leaf) as unknown[]).length);
  for (const leaf of leaves.names) cap = Math.min(cap, (player.get(leaf) as unknown[]).length);
  if (leaves.vector) cap = Math.min(cap, (player.get(leaves.vector) as unknown[]).length);
  if (leaves.vector2) cap = Math.min(cap, (player.get(leaves.vector2) as unknown[]).length);
  cap = Math.min(cap, (player.get(leaves.enable) as unknown[]).length);
  cap = Math.min(cap, (player.get(leaves.texture) as unknown[]).length);
  cap = Math.min(cap, (player.get(leaves.hashId) as unknown[]).length);
  return cap;
}

function readField4(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<ScalarFieldType>,
  slotIdx: number,
): Uint8Array {
  const out = new Uint8Array(4);
  const dv = new DataView(out.buffer);
  switch (leaf.type) {
    case DataType.IntArray:
      dv.setInt32(0, player.getElement(leaf as SchemaLeaf<DataType.IntArray>, slotIdx) | 0, true);
      return out;
    case DataType.UIntArray:
      dv.setUint32(
        0,
        player.getElement(leaf as SchemaLeaf<DataType.UIntArray>, slotIdx) >>> 0,
        true,
      );
      return out;
    case DataType.EnumArray:
      dv.setUint32(
        0,
        player.getElement(leaf as SchemaLeaf<DataType.EnumArray>, slotIdx) >>> 0,
        true,
      );
      return out;
    case DataType.FloatArray:
      dv.setFloat32(0, player.getElement(leaf as SchemaLeaf<DataType.FloatArray>, slotIdx), true);
      return out;
    case DataType.BoolArray:
      out[0] = player.getElement(leaf as SchemaLeaf<DataType.BoolArray>, slotIdx) ? 1 : 0;
      return out;
  }
}

function writeField4(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<ScalarFieldType>,
  slotIdx: number,
  src: Uint8Array,
): void {
  const dv = new DataView(src.buffer, src.byteOffset, 4);
  switch (leaf.type) {
    case DataType.IntArray:
      player.setElement(leaf as SchemaLeaf<DataType.IntArray>, slotIdx, dv.getInt32(0, true) | 0);
      return;
    case DataType.UIntArray:
      player.setElement(
        leaf as SchemaLeaf<DataType.UIntArray>,
        slotIdx,
        dv.getUint32(0, true) >>> 0,
      );
      return;
    case DataType.EnumArray:
      player.setElement(
        leaf as SchemaLeaf<DataType.EnumArray>,
        slotIdx,
        dv.getUint32(0, true) >>> 0,
      );
      return;
    case DataType.FloatArray:
      player.setElement(leaf as SchemaLeaf<DataType.FloatArray>, slotIdx, dv.getFloat32(0, true));
      return;
    case DataType.BoolArray:
      player.setElement(
        leaf as SchemaLeaf<DataType.BoolArray>,
        slotIdx,
        (src[0] | src[1] | src[2] | src[3]) !== 0,
      );
      return;
  }
}

function nameByteLen(leaf: SchemaLeaf<NameType>): 64 | 128 {
  const sz = arrayElementSize(leaf.type);
  if (sz !== 64 && sz !== 128) {
    throw new ShareMiiError('save_format_error', { label: 'name' });
  }
  return sz as 64 | 128;
}

function readNameBlock(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<NameType>,
  slotIdx: number,
): Uint8Array {
  const str = player.getElement(leaf, slotIdx);
  return encodeUtf16Name(str, nameByteLen(leaf));
}

function writeNameBlock(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<NameType>,
  slotIdx: number,
  src: Uint8Array,
): void {
  player.setElement(leaf, slotIdx, decodeUtf16Name(src));
}

function readVector3(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<DataType.Vector3Array>,
  slotIdx: number,
): Uint8Array {
  const v = player.getElement(leaf, slotIdx);
  const out = new Uint8Array(12);
  const dv = new DataView(out.buffer);
  dv.setFloat32(0, v.x, true);
  dv.setFloat32(4, v.y, true);
  dv.setFloat32(8, v.z, true);
  return out;
}

function writeVector3(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<DataType.Vector3Array>,
  slotIdx: number,
  src: Uint8Array,
): void {
  const dv = new DataView(src.buffer, src.byteOffset, 12);
  player.setElement(leaf, slotIdx, {
    x: dv.getFloat32(0, true),
    y: dv.getFloat32(4, true),
    z: dv.getFloat32(8, true),
  });
}

function readVector2(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<DataType.Vector2Array>,
  slotIdx: number,
): Uint8Array {
  const v = player.getElement(leaf, slotIdx);
  const out = new Uint8Array(8);
  const dv = new DataView(out.buffer);
  dv.setFloat32(0, v.x, true);
  dv.setFloat32(4, v.y, true);
  return out;
}

function writeVector2(
  player: Accessor<'player'>,
  leaf: SchemaLeaf<DataType.Vector2Array>,
  slotIdx: number,
  src: Uint8Array,
): void {
  const dv = new DataView(src.buffer, src.byteOffset, 8);
  player.setElement(leaf, slotIdx, {
    x: dv.getFloat32(0, true),
    y: dv.getFloat32(4, true),
  });
}

export type UgcSlotInfo = {
  slot: number;
  empty: boolean;
  name: string;
  isAddNew: boolean;
};

export function listUgcSlots(
  saves: PlayerOnlySaves,
  kind: UgcKind,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): UgcSlotInfo[] {
  const out: UgcSlotInfo[] = [];
  let max = UGC_MAX_SLOTS[kind];
  let nameLeaf: SchemaLeaf<NameType> | null;
  try {
    const leaves = resolveUgcLeaves(kind);
    nameLeaf = resolveNameLeaf(UGC_NAME_HASHES[kind], `${kind}.names`);
    max = ugcSlotCapacity(saves, leaves, kind);
  } catch {
    nameLeaf = null;
  }

  let foundAddSlot = false;
  for (let i = 0; i < max; i++) {
    const fileName = ugcCanvasFileName(kind, i);
    const exists = sidecar.files.has(fileName);
    const decoded = nameLeaf ? saves.player.getElement(nameLeaf, i) : '';
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
  saves: PlayerOnlySaves,
  slot: number,
  kind: UgcKind,
  sidecar: SidecarSource = EMPTY_SIDECAR,
): ExtractUgcResult {
  const leaves = resolveUgcLeaves(kind);
  const player = saves.player;
  const slotIdx = slot - 1;
  const kindIndex = ugcKindIndex(kind);

  const fields = new Uint8Array(leaves.fields.length * 4);
  for (let i = 0; i < leaves.fields.length; i++) {
    fields.set(readField4(player, leaves.fields[i], slotIdx), i * 4);
  }
  const vector = leaves.vector ? readVector3(player, leaves.vector, slotIdx) : new Uint8Array(12);
  const vector2 = leaves.vector2 ? readVector2(player, leaves.vector2, slotIdx) : new Uint8Array(8);
  const name = readNameBlock(player, leaves.names[0], slotIdx);
  const pronounce = readNameBlock(player, leaves.names[1], slotIdx);

  let goodsText: Uint8Array | undefined;
  let goodsPronounce: Uint8Array | undefined;
  if (kind === 'Goods' && leaves.names[2] !== undefined && leaves.names[3] !== undefined) {
    goodsText = readNameBlock(player, leaves.names[2], slotIdx);
    goodsPronounce = readNameBlock(player, leaves.names[3], slotIdx);
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
  saves: PlayerOnlySaves,
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

  const leaves = resolveUgcLeaves(kind);
  const player = saves.player;
  const slotIdx = slot - 1;
  const capacity = ugcSlotCapacity(saves, leaves, kind);
  if (slotIdx < 0 || slotIdx >= capacity) {
    throw new ShareMiiError('slot_out_of_range', { slot, kind, capacity });
  }

  if ((kind === 'Cloth' || kind === 'Goods') && !isAdding) {
    const existing = readField4(player, leaves.fields[0], slotIdx);
    const incoming = decoded.fieldsAndVectors.subarray(0, 4);
    if (!buffersEqual(existing, incoming)) {
      throw new ShareMiiError('subtype_mismatch');
    }
  }
  if ((kind === 'Exterior' || kind === 'MapObject') && !isAdding) {
    throw new ShareMiiError('cannot_replace_kind', { kind });
  }

  for (let i = 0; i < leaves.fields.length; i++) {
    const src = decoded.fieldsAndVectors.subarray(i * 4, i * 4 + 4);
    writeField4(player, leaves.fields[i], slotIdx, src);
  }

  if (isAdding) {
    player.setElement(leaves.enable, slotIdx, ENABLE_USED);
    const texDv = new DataView(
      UGC_TEX_DATA.buffer,
      UGC_TEX_DATA.byteOffset,
      UGC_TEX_DATA.byteLength,
    );
    const texVal = texDv.getUint32(expected * 4, true) >>> 0;
    player.setElement(leaves.texture, slotIdx, texVal);
    const hashIdVal = ((slotIdx & 0xff) | ((UGC_HASH_INDICES[kind] & 0xff) << 16)) >>> 0;
    player.setElement(leaves.hashId, slotIdx, hashIdVal);
  }

  const namesBlock = decoded.namesBlock;
  writeNameBlock(player, leaves.names[0], slotIdx, namesBlock.subarray(0, 128));
  writeNameBlock(player, leaves.names[1], slotIdx, namesBlock.subarray(128, 256));
  if (kind === 'Goods' && leaves.names[2] !== undefined && leaves.names[3] !== undefined) {
    writeNameBlock(player, leaves.names[2], slotIdx, namesBlock.subarray(256, 320));
    writeNameBlock(player, leaves.names[3], slotIdx, namesBlock.subarray(320, 448));
  }

  const fav = decoded.fieldsAndVectors;
  if (leaves.vector) {
    const vStart = fav.byteLength - 20;
    writeVector3(player, leaves.vector, slotIdx, fav.subarray(vStart, vStart + 12));
  }
  if (leaves.vector2) {
    const v2Start = fav.byteLength - 8;
    writeVector2(player, leaves.vector2, slotIdx, fav.subarray(v2Start, v2Start + 8));
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

function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
