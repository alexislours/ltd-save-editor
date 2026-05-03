import type { SavFile } from '../sav/types';
import { entryPayload } from '../shareMii/savAccess';
import { FACEPAINT_HASHES, MII_HASHES } from '../shareMii/ugcKinds';
import { decodeUtf16Name } from '../shareMii/utf16';

const ARRAY_HEADER = 4;
export const FACEPAINT_REAL_SLOTS = 70;
const UNUSED_STATE_MARKER = [0xa5, 0x8a, 0xff, 0xaf];

export type FacepaintInfo = {
  id: number;
  inUse: boolean;
  ownerSlot: number | null;
  ownerName: string;
};

function isUnused(state: Uint8Array, id: number): boolean {
  const off = ARRAY_HEADER + 4 * id;
  for (let i = 0; i < 4; i++) {
    if (state[off + i] !== UNUSED_STATE_MARKER[i]) return false;
  }
  return true;
}

export function listFacepaints(player: SavFile, mii: SavFile | null): FacepaintInfo[] {
  const fpState = entryPayload(player, FACEPAINT_HASHES.state, 'Facepaint.State');
  const facePaintIndex = mii
    ? entryPayload(mii, MII_HASHES.facePaintIndex, 'Mii.FacePaintIndex')
    : null;
  const miiNames = mii ? entryPayload(mii, MII_HASHES.names, 'Mii.Names') : null;

  const ownerByFacepaint = new Map<number, { slot: number; name: string }>();
  if (facePaintIndex && miiNames) {
    for (let s = 0; s < FACEPAINT_REAL_SLOTS; s++) {
      const id = facePaintIndex[ARRAY_HEADER + 4 * s];
      if (id === 0xff) continue;
      if (ownerByFacepaint.has(id)) continue;
      const nameBuf = miiNames.subarray(ARRAY_HEADER + s * 64, ARRAY_HEADER + s * 64 + 64);
      ownerByFacepaint.set(id, { slot: s + 1, name: decodeUtf16Name(nameBuf) });
    }
  }

  const out: FacepaintInfo[] = [];
  for (let id = 0; id < FACEPAINT_REAL_SLOTS; id++) {
    const inUse = !isUnused(fpState, id);
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
