import { DataType, type Accessor } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, PLAYER_SCHEMA } from '@alexislours/ltd-savedata/schema';
import {
  FACEPAINT_HASHES,
  FP_STATE_UNUSED,
  MII_HASHES,
  leafByHashOrThrow,
} from '@alexislours/ltd-sharemii';
import type { SidecarSource } from '$lib/shareMii';
import { parseSidecarIds } from '../sidecarParse';

const FACEPAINT_REAL_SLOTS = 70;
const FP_INDEX_UNUSED = -1;

const FP_STATE = leafByHashOrThrow(
  PLAYER_SCHEMA,
  FACEPAINT_HASHES.state,
  'Facepaint.State',
  DataType.EnumArray,
);
const FACE_PAINT_INDEX = leafByHashOrThrow(
  MII_SCHEMA,
  MII_HASHES.facePaintIndex,
  'Mii.FacePaintIndex',
  DataType.IntArray,
);
const NAMES = leafByHashOrThrow(MII_SCHEMA, MII_HASHES.names, 'Mii.Names', DataType.WString32Array);

type FacepaintInfo = {
  id: number;
  inUse: boolean;
  ownerSlot: number | null;
  ownerName: string;
};

export function listFacepaintsFromSidecar(sidecar: SidecarSource): FacepaintInfo[] {
  return parseSidecarIds(sidecar, 'UgcFacePaint').map((id) => ({
    id,
    inUse: true,
    ownerSlot: null,
    ownerName: '',
  }));
}

export function listFacepaints(
  player: Accessor<'player'>,
  mii: Accessor<'mii'> | null,
): FacepaintInfo[] {
  const ownerByFacepaint = new Map<number, { slot: number; name: string }>();
  if (mii) {
    for (let s = 0; s < FACEPAINT_REAL_SLOTS; s++) {
      const id = mii.getElement(FACE_PAINT_INDEX, s);
      if (id === FP_INDEX_UNUSED) continue;
      if (ownerByFacepaint.has(id)) continue;
      ownerByFacepaint.set(id, { slot: s + 1, name: mii.getElement(NAMES, s) });
    }
  }

  const out: FacepaintInfo[] = [];
  for (let id = 0; id < FACEPAINT_REAL_SLOTS; id++) {
    const inUse = player.getElement(FP_STATE, id) !== FP_STATE_UNUSED;
    if (!inUse) continue;
    const owner = ownerByFacepaint.get(id) ?? null;
    out.push({
      id,
      inUse,
      ownerSlot: owner?.slot ?? null,
      ownerName: owner?.name ?? '',
    });
  }
  return out;
}
