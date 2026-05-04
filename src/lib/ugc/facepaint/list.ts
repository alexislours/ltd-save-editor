import { DataType } from '$lib/sav/dataType';
import type { Accessor } from '$lib/sav/materialized/accessor';
import { MII_SCHEMA, PLAYER_SCHEMA } from '$lib/sav/schema';
import { FP_STATE_UNUSED } from '$lib/shareMii/codec/applyMii';
import { leafByHashOrThrow } from '$lib/shareMii/codec/savAccess';
import { FACEPAINT_HASHES, MII_HASHES } from '$lib/shareMii/codec/ugcKinds';

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
