import { MII_SCHEMA } from '$lib/sav/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import {
  baseRelationTypeLabel,
  blockForCandidate,
  checkCrushAllowed,
  counterpartsFor,
  crushAllowedForType,
  evaluateCoupleConstraints,
  hasFightVariant,
  isRomanticTypeHash,
  isValidPair,
  listRelationships,
  setCrush,
  setFight,
  setTypeSetSec,
  type RelationAvailability,
} from './relations';
import {
  blockReasonMessage,
  dateTimeLocalToUnixSecs,
  FIXED_METER_TYPES,
  type Translator,
} from './relationsTableHelpers';

type CommitResult = { ok: true; applied: boolean } | { ok: false; error: string };

export function commitMeter(mii: MiiAccessor, directionalIndex: number, raw: string): void {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return;
  mii.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter, directionalIndex, n | 0);
}

type CommitTypeArgs = {
  mii: MiiAccessor;
  re: RelationAvailability;
  miiIndex: number;
  changedIndex: number;
  otherIndex: number;
  otherMiiIndex: number;
  otherType: number;
  rawHash: string;
  slot: number;
  nameToHash: ReadonlyMap<string, number>;
  t: Translator;
};

export function commitType(args: CommitTypeArgs): CommitResult {
  const {
    mii,
    re,
    miiIndex,
    changedIndex,
    otherIndex,
    otherMiiIndex,
    otherType,
    rawHash,
    slot,
    nameToHash,
    t,
  } = args;
  const n = Number.parseInt(rawHash, 10);
  if (!Number.isFinite(n)) return { ok: true, applied: false };
  const newHash = n >>> 0;

  if (isRomanticTypeHash(newHash)) {
    const c = evaluateCoupleConstraints(mii, re, miiIndex, otherMiiIndex, slot);
    const block = blockForCandidate(c, newHash);
    if (block) return { ok: false, error: blockReasonMessage(block.reason, t) };
  }

  mii.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType, changedIndex, newHash);

  const newName = baseRelationTypeLabel(newHash);
  const otherName = baseRelationTypeLabel(otherType);
  let finalOtherName = otherName;
  if (!isValidPair(newName, otherName)) {
    const canonical = counterpartsFor(newName)[0];
    const canonicalHash = nameToHash.get(canonical);
    if (canonicalHash !== undefined) {
      mii.setElement(
        MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType,
        otherIndex,
        canonicalHash,
      );
      finalOtherName = canonical;
    }
  }

  if (FIXED_METER_TYPES.has(newName)) {
    mii.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter, changedIndex, 100);
  }
  if (FIXED_METER_TYPES.has(finalOtherName)) {
    mii.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter, otherIndex, 100);
  }

  if (re.bitFlag) {
    if (!crushAllowedForType(newHash)) setCrush(mii, changedIndex, false);
    const otherFinalHash = nameToHash.get(finalOtherName);
    if (otherFinalHash !== undefined && !crushAllowedForType(otherFinalHash)) {
      setCrush(mii, otherIndex, false);
    }
  }

  if (re.isFight && !hasFightVariant(newName) && !hasFightVariant(finalOtherName)) {
    const slotIdx = changedIndex >>> 1;
    setFight(mii, slotIdx, false);
  }

  return { ok: true, applied: true };
}

export function commitTypeSetTime(
  mii: MiiAccessor,
  re: RelationAvailability,
  slot: number,
  raw: string,
): void {
  if (!re.typeSetTime) return;
  const secs = dateTimeLocalToUnixSecs(raw);
  if (secs === null) return;
  setTypeSetSec(mii, slot, secs);
}

type CommitCrushArgs = {
  mii: MiiAccessor;
  re: RelationAvailability;
  miiIndex: number;
  dirIndex: number;
  otherIndex: number;
  value: boolean;
  slot: number;
  existingCrushTarget: number | null;
  t: Translator;
};

export function commitCrush(args: CommitCrushArgs): CommitResult {
  const { mii, re, miiIndex, dirIndex, otherIndex, value, slot, existingCrushTarget, t } = args;
  if (!re.bitFlag) return { ok: true, applied: false };
  if (value) {
    const block = checkCrushAllowed(mii, re, miiIndex, otherIndex, slot);
    if (block) {
      const error =
        block.reason === 'gender_incompatible'
          ? t('mii.relations.crush_blocked_gender')
          : t('mii.relations.crush_blocked_blood');
      return { ok: false, error };
    }
  }
  const prevCrushSlots: number[] = [];
  if (value && existingCrushTarget !== null && existingCrushTarget !== otherIndex) {
    for (const r of listRelationships(mii, re)) {
      if (r.a === miiIndex && r.crushAtoB) {
        setCrush(mii, r.abIndex, false);
        prevCrushSlots.push(r.slot);
      } else if (r.b === miiIndex && r.crushBtoA) {
        setCrush(mii, r.baIndex, false);
        prevCrushSlots.push(r.slot);
      }
    }
  }
  if (!setCrush(mii, dirIndex, value)) return { ok: true, applied: false };

  if (value) {
    if (re.isFight) setFight(mii, slot, false);
  } else {
    maybeClearFightForSlot(mii, re, slot);
  }
  for (const s of prevCrushSlots) maybeClearFightForSlot(mii, re, s);
  return { ok: true, applied: true };
}

function maybeClearFightForSlot(mii: MiiAccessor, re: RelationAvailability, slot: number): void {
  if (!re.isFight) return;
  const r = listRelationships(mii, re).find((x) => x.slot === slot);
  if (!r || !r.isFight) return;
  const outName = baseRelationTypeLabel(r.typeAtoB);
  const inName = baseRelationTypeLabel(r.typeBtoA);
  if (hasFightVariant(outName) || hasFightVariant(inName)) return;
  setFight(mii, slot, false);
}

type AcquaintArgs = {
  mii: MiiAccessor;
  re: RelationAvailability;
  miiIndex: number;
  nameToHash: ReadonlyMap<string, number>;
  t: Translator;
};

const KNOW_3_METER = 80;

export function applyAcquaintAllStrangers(args: AcquaintArgs): void {
  const { mii, re, miiIndex, nameToHash, t } = args;
  const knowHash = nameToHash.get('Know');
  if (knowHash === undefined) return;
  for (const r of listRelationships(mii, re)) {
    if (r.a !== miiIndex && r.b !== miiIndex) continue;
    const selfIsA = r.a === miiIndex;
    const outIndex = selfIsA ? r.abIndex : r.baIndex;
    const inIndex = selfIsA ? r.baIndex : r.abIndex;
    const outType = selfIsA ? r.typeAtoB : r.typeBtoA;
    const inType = selfIsA ? r.typeBtoA : r.typeAtoB;
    if (baseRelationTypeLabel(outType) !== 'Other') continue;
    const otherMiiIndex = selfIsA ? r.b : r.a;
    commitType({
      mii,
      re,
      miiIndex,
      changedIndex: outIndex,
      otherIndex: inIndex,
      otherMiiIndex,
      otherType: inType,
      rawHash: String(knowHash),
      slot: r.slot,
      nameToHash,
      t,
    });
    commitMeter(mii, outIndex, String(KNOW_3_METER));
    commitMeter(mii, inIndex, String(KNOW_3_METER));
  }
}
