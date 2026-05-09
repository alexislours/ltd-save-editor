import { murmur3_x86_32 } from '$lib/sav/hash';
import { MII_SCHEMA } from '$lib/sav/schema';
import { miiAccessor } from '$lib/mii/miiEditor.svelte';
import {
  baseRelationTypeLabel,
  findRelations,
  listRelationships,
  readMiiName,
  setFight,
} from '$lib/mii/relations/relations';
import { getResident, residentsForHouse } from './residents.svelte';

const FRIEND_HASH = murmur3_x86_32('Friend') >>> 0;
const FRIEND_BUMP_METER = 80;

const AT_LEAST_FRIEND_TYPES: ReadonlySet<string> = new Set([
  'Friend',
  'Couple',
  'Lover',
  'Parent',
  'Child',
  'BrotherSisterOlder',
  'BrotherSisterYounger',
  'GrandParent',
  'GrandChild',
  'Relative',
]);

type LowRoommate = {
  miiIndex: number;
  name: string;
  outTypeName: string;
  inTypeName: string;
  outMeter: number;
  inMeter: number;
};

type RoommateCheck = {
  housemates: number[];
  low: LowRoommate[];
};

function isAtLeastFriendName(name: string): boolean {
  return AT_LEAST_FRIEND_TYPES.has(name);
}

function destinationHousemates(
  mapId: number,
  movingMiiIndex: number,
  excludeMiis: Iterable<number>,
): number[] {
  if (!Number.isFinite(mapId) || mapId < 0) return [];
  const ex = new Set<number>([movingMiiIndex, ...excludeMiis]);
  const out: number[] = [];
  for (const r of residentsForHouse(mapId)) {
    if (!ex.has(r.miiIndex)) out.push(r.miiIndex);
  }
  return out;
}

function checkRoommateFriendships(movingMiiIndex: number, housemates: number[]): RoommateCheck {
  const acc = miiAccessor();
  if (!acc) return { housemates, low: [] };
  const re = findRelations(acc);
  if (!re) return { housemates, low: [] };

  const slots = listRelationships(acc, re);
  const byOther = new Map<number, (typeof slots)[number] & { selfIsA: boolean }>();
  for (const r of slots) {
    if (r.a === movingMiiIndex) byOther.set(r.b, { ...r, selfIsA: true });
    else if (r.b === movingMiiIndex) byOther.set(r.a, { ...r, selfIsA: false });
  }

  const low: LowRoommate[] = [];
  for (const other of housemates) {
    const rel = byOther.get(other);
    if (!rel) {
      low.push({
        miiIndex: other,
        name: readMiiName(acc, other),
        outTypeName: 'Other',
        inTypeName: 'Other',
        outMeter: 0,
        inMeter: 0,
      });
      continue;
    }
    const outName = baseRelationTypeLabel(rel.selfIsA ? rel.typeAtoB : rel.typeBtoA);
    const inName = baseRelationTypeLabel(rel.selfIsA ? rel.typeBtoA : rel.typeAtoB);
    if (isAtLeastFriendName(outName) && isAtLeastFriendName(inName)) continue;
    low.push({
      miiIndex: other,
      name: readMiiName(acc, other),
      outTypeName: outName,
      inTypeName: inName,
      outMeter: rel.selfIsA ? rel.meterAtoB : rel.meterBtoA,
      inMeter: rel.selfIsA ? rel.meterBtoA : rel.meterAtoB,
    });
  }
  return { housemates, low };
}

function bumpToFriend(movingMiiIndex: number, housemates: number[]): number {
  const acc = miiAccessor();
  if (!acc) return 0;
  const re = findRelations(acc);
  if (!re) return 0;

  const targets = new Set(housemates);
  let bumped = 0;
  for (const r of listRelationships(acc, re)) {
    let abIndex: number;
    let baIndex: number;
    if (r.a === movingMiiIndex && targets.has(r.b)) {
      abIndex = r.abIndex;
      baIndex = r.baIndex;
    } else if (r.b === movingMiiIndex && targets.has(r.a)) {
      abIndex = r.baIndex;
      baIndex = r.abIndex;
    } else continue;

    const outName = baseRelationTypeLabel(r.a === movingMiiIndex ? r.typeAtoB : r.typeBtoA);
    const inName = baseRelationTypeLabel(r.a === movingMiiIndex ? r.typeBtoA : r.typeAtoB);
    const outMeter = r.a === movingMiiIndex ? r.meterAtoB : r.meterBtoA;
    const inMeter = r.a === movingMiiIndex ? r.meterBtoA : r.meterAtoB;

    if (isAtLeastFriendName(outName) && isAtLeastFriendName(inName)) continue;

    if (!isAtLeastFriendName(outName)) {
      acc.setElement(
        MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType,
        abIndex,
        FRIEND_HASH,
      );
      if (outMeter < FRIEND_BUMP_METER) {
        acc.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter, abIndex, FRIEND_BUMP_METER);
      }
    }
    if (!isAtLeastFriendName(inName)) {
      acc.setElement(
        MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType,
        baIndex,
        FRIEND_HASH,
      );
      if (inMeter < FRIEND_BUMP_METER) {
        acc.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter, baIndex, FRIEND_BUMP_METER);
      }
    }
    if (re.isFight && r.isFight) setFight(acc, r.slot, false);
    bumped++;
  }
  return bumped;
}

export type MoveImpact = {
  conflicts: Array<{ moving: number; movingName: string; low: LowRoommate[] }>;
};

function currentHouseFor(mii: number): number {
  const r = getResident(mii);
  return r ? r.houseMapId : -1;
}

export function computeMoveImpact(
  aMii: number,
  aDestMapId: number,
  bMii: number | null,
  bDestMapId: number | null,
): MoveImpact {
  const acc = miiAccessor();
  const conflicts: MoveImpact['conflicts'] = [];
  const aMoves = aDestMapId >= 0 && currentHouseFor(aMii) !== aDestMapId;
  if (aMoves) {
    const exA = bMii != null ? [bMii] : [];
    const aHousemates = destinationHousemates(aDestMapId, aMii, exA);
    if (aHousemates.length > 0) {
      const checkA = checkRoommateFriendships(aMii, aHousemates);
      if (checkA.low.length > 0) {
        conflicts.push({
          moving: aMii,
          movingName: acc ? readMiiName(acc, aMii) : '',
          low: checkA.low,
        });
      }
    }
  }
  if (bMii != null && bDestMapId != null && bDestMapId >= 0) {
    const bMoves = currentHouseFor(bMii) !== bDestMapId;
    if (bMoves) {
      const bHousemates = destinationHousemates(bDestMapId, bMii, [aMii]);
      if (bHousemates.length > 0) {
        const checkB = checkRoommateFriendships(bMii, bHousemates);
        if (checkB.low.length > 0) {
          conflicts.push({
            moving: bMii,
            movingName: acc ? readMiiName(acc, bMii) : '',
            low: checkB.low,
          });
        }
      }
    }
  }
  return { conflicts };
}

export function applyImpactBump(impact: MoveImpact): number {
  let total = 0;
  for (const c of impact.conflicts) {
    total += bumpToFriend(
      c.moving,
      c.low.map((l) => l.miiIndex),
    );
  }
  return total;
}
