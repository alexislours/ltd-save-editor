import { murmur3_x86_32 } from '$lib/sav/hash';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { clearTroubleField, TARGET_FIELD_KEYS, TROUBLE_FIELDS } from './troubleFields';
import { nowSeconds } from './troubleTime';

type FightSpec = { hash: number; endMinute: number };

function spec(name: string, endMinute: number): FightSpec {
  return { hash: murmur3_x86_32(name) >>> 0, endMinute };
}

const FIGHT_COUPLE = spec('FightCouple', 1440);
const FIGHT_LOVER = spec('FightLover', 1440);
const FIGHT_FRIEND = spec('FightFriend', 1440);
const FIGHT_BASE = spec('FightBase', 180);

const FIGHT_TROUBLE_HASHES: ReadonlySet<number> = new Set([
  FIGHT_COUPLE.hash,
  FIGHT_LOVER.hash,
  FIGHT_FRIEND.hash,
  FIGHT_BASE.hash,
]);

function fightSpecForTypes(outName: string, inName: string): FightSpec {
  const has = (n: string) => outName === n || inName === n;
  if (has('Couple')) return FIGHT_COUPLE;
  if (has('Lover')) return FIGHT_LOVER;
  if (has('Friend')) return FIGHT_FRIEND;
  return FIGHT_BASE;
}

function isFightTroubleId(hash: number): boolean {
  return FIGHT_TROUBLE_HASHES.has(hash >>> 0);
}

function troubleIdOf(mii: MiiAccessor, miiIndex: number): number {
  if (!mii.has(TROUBLE_FIELDS.id.leaf)) return 0;
  try {
    return (mii.getElement(TROUBLE_FIELDS.id.leaf, miiIndex) as number) >>> 0;
  } catch {
    return 0;
  }
}

function targetMiiOf(mii: MiiAccessor, miiIndex: number): number {
  const f = TROUBLE_FIELDS.targetMii;
  if (!mii.has(f.leaf)) return -1;
  try {
    return mii.getElement(f.leaf, miiIndex * f.perMii) as number;
  } catch {
    return -1;
  }
}

function clearTroubleSlot(mii: MiiAccessor, host: number): void {
  if (mii.has(TROUBLE_FIELDS.id.leaf)) mii.setElement(TROUBLE_FIELDS.id.leaf, host, 0);
  for (const fk of TARGET_FIELD_KEYS) clearTroubleField(mii, host, fk);
  if (mii.has(TROUBLE_FIELDS.nextGameTime.leaf)) {
    mii.setElement(TROUBLE_FIELDS.nextGameTime.leaf, host, 0n);
  }
  if (mii.has(TROUBLE_FIELDS.endGameTime.leaf)) {
    mii.setElement(TROUBLE_FIELDS.endGameTime.leaf, host, 0n);
  }
  if (mii.has(TROUBLE_FIELDS.isFirstDemoDone.leaf)) {
    mii.setElement(TROUBLE_FIELDS.isFirstDemoDone.leaf, host, false);
  }
}

export function clearFightTroubleBetween(mii: MiiAccessor, a: number, b: number): void {
  for (const [host, other] of [
    [a, b],
    [b, a],
  ] as const) {
    if (isFightTroubleId(troubleIdOf(mii, host)) && targetMiiOf(mii, host) === other) {
      clearTroubleSlot(mii, host);
    }
  }
}

function detachForeignFight(mii: MiiAccessor, host: number, keepTarget: number): void {
  if (!isFightTroubleId(troubleIdOf(mii, host))) return;
  const prev = targetMiiOf(mii, host);
  if (prev < 0 || prev === keepTarget) return;
  if (isFightTroubleId(troubleIdOf(mii, prev)) && targetMiiOf(mii, prev) === host) {
    clearTroubleSlot(mii, prev);
  }
}

function writeFightTroubleOn(
  mii: MiiAccessor,
  host: number,
  target: number,
  fight: FightSpec,
  now: bigint,
): void {
  mii.setElement(TROUBLE_FIELDS.id.leaf, host, fight.hash);
  for (const fk of TARGET_FIELD_KEYS) {
    if (fk !== 'targetMii') clearTroubleField(mii, host, fk);
  }
  const tf = TROUBLE_FIELDS.targetMii;
  if (mii.has(tf.leaf)) {
    for (let s = 0; s < tf.perMii; s++) {
      try {
        mii.setElement(tf.leaf, host * tf.perMii + s, (s === 0 ? target : -1) as never);
      } catch {
        /* skip */
      }
    }
  }
  if (mii.has(TROUBLE_FIELDS.nextGameTime.leaf)) {
    mii.setElement(TROUBLE_FIELDS.nextGameTime.leaf, host, now);
  }
  if (mii.has(TROUBLE_FIELDS.endGameTime.leaf)) {
    mii.setElement(TROUBLE_FIELDS.endGameTime.leaf, host, now + BigInt(fight.endMinute * 60));
  }
  if (mii.has(TROUBLE_FIELDS.isFirstDemoDone.leaf)) {
    mii.setElement(TROUBLE_FIELDS.isFirstDemoDone.leaf, host, false);
  }
}

export function setFightTroubleBetween(
  mii: MiiAccessor,
  egoMii: number,
  otherMii: number,
  outTypeName: string,
  inTypeName: string,
): boolean {
  if (!mii.has(TROUBLE_FIELDS.id.leaf)) return false;
  const fight = fightSpecForTypes(outTypeName, inTypeName);
  clearFightTroubleBetween(mii, egoMii, otherMii);
  detachForeignFight(mii, egoMii, otherMii);
  detachForeignFight(mii, otherMii, egoMii);

  const now = nowSeconds();
  writeFightTroubleOn(mii, egoMii, otherMii, fight, now);
  writeFightTroubleOn(mii, otherMii, egoMii, fight, now);
  return true;
}
