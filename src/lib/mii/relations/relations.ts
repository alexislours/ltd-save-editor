import { murmur3_x86_32 } from '$lib/sav/hash';
import { enumOptionsFor } from '$lib/sav/knownKeys';
import { MII_SCHEMA } from '$lib/sav/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';

const FRIEND_HASH = murmur3_x86_32('Friend');
const KNOW_HASH = murmur3_x86_32('Know');
const COUPLE_HASH = murmur3_x86_32('Couple');
const LOVER_HASH = murmur3_x86_32('Lover');
const EX_LOVER_HASH = murmur3_x86_32('ExLover');
const DIVORCE_HASH = murmur3_x86_32('Divorce');

const ACTIVE_COUPLE_TYPES: ReadonlySet<number> = new Set([COUPLE_HASH, LOVER_HASH]);
const ROMANTIC_TYPES: ReadonlySet<number> = new Set([
  COUPLE_HASH,
  LOVER_HASH,
  EX_LOVER_HASH,
  DIVORCE_HASH,
]);

const BLOOD_RELATED_NAMES: ReadonlySet<string> = new Set([
  'Parent',
  'Child',
  'BrotherSisterOlder',
  'BrotherSisterYounger',
  'GrandParent',
  'GrandChild',
  'Relative',
]);

export const LOVE_GENDER_OPTIONS = ['Male', 'Female', 'Third'] as const;
export type LoveGenderOption = (typeof LOVE_GENDER_OPTIONS)[number];
const LOVE_GENDER_SET: ReadonlySet<string> = new Set(LOVE_GENDER_OPTIONS);

const CRUSH_BIT = 0x02;

export function isRomanticTypeHash(typeHash: number): boolean {
  return ROMANTIC_TYPES.has(typeHash >>> 0);
}

const ENUM_NAMES_BY_KEY = new Map<number, ReadonlyMap<number, string>>();

function enumNamesFor(keyHash: number): ReadonlyMap<number, string> {
  let cached = ENUM_NAMES_BY_KEY.get(keyHash);
  if (cached) return cached;
  const m = new Map<number, string>();
  const opts = enumOptionsFor(keyHash);
  if (opts) for (const o of opts) m.set(o.hash, o.name);
  cached = m;
  ENUM_NAMES_BY_KEY.set(keyHash, cached);
  return cached;
}

export function baseRelationTypeLabel(valueHash: number): string {
  const h = valueHash >>> 0;
  return (
    enumNamesFor(MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType.hash).get(h) ??
    `0x${h.toString(16).padStart(8, '0')}`
  );
}

export type RelationAvailability = {
  isFight: boolean;
  bitFlag: boolean;
  typeSetTime: boolean;
  bloodType: boolean;
  gender: boolean;
  loveGender: boolean;
};

export function findRelations(mii: MiiAccessor): RelationAvailability | null {
  if (
    !mii.has(MII_SCHEMA.Relation.Info.RelationId.Id_a) ||
    !mii.has(MII_SCHEMA.Relation.Info.RelationId.Id_b) ||
    !mii.has(MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType) ||
    !mii.has(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter) ||
    !mii.has(MII_SCHEMA.Mii.Name.Name)
  ) {
    return null;
  }
  return {
    isFight: mii.has(MII_SCHEMA.Relation.Info.IsFight),
    bitFlag: mii.has(MII_SCHEMA.Relation.Info.DirectionalInfo.BitFlag),
    typeSetTime: mii.has(MII_SCHEMA.Relation.Info.TypeSetTime),
    bloodType: mii.has(MII_SCHEMA.Relation.Info.DirectionalInfo.BloodType),
    gender: mii.has(MII_SCHEMA.Mii.MiiMisc.FaceInfo.Gender),
    loveGender: mii.has(MII_SCHEMA.Mii.MiiMisc.FaceInfo.IsLoveGender),
  };
}

export function readMiiName(mii: MiiAccessor, index: number): string {
  if (!mii.has(MII_SCHEMA.Mii.Name.Name)) return '';
  const arr = mii.get(MII_SCHEMA.Mii.Name.Name);
  return arr[index] ?? '';
}

function readMiiGender(mii: MiiAccessor, miiIndex: number): string | null {
  if (!mii.has(MII_SCHEMA.Mii.MiiMisc.FaceInfo.Gender)) return null;
  const arr = mii.get(MII_SCHEMA.Mii.MiiMisc.FaceInfo.Gender);
  const v = arr[miiIndex];
  if (v === undefined) return null;
  return enumNamesFor(MII_SCHEMA.Mii.MiiMisc.FaceInfo.Gender.hash).get(v) ?? null;
}

export function readIsLoveGender(
  mii: MiiAccessor,
  miiIndex: number,
  target: LoveGenderOption,
): boolean {
  if (!mii.has(MII_SCHEMA.Mii.MiiMisc.FaceInfo.IsLoveGender)) return false;
  const slot = LOVE_GENDER_OPTIONS.indexOf(target);
  if (slot < 0) return false;
  const arr = mii.get(MII_SCHEMA.Mii.MiiMisc.FaceInfo.IsLoveGender);
  return arr[miiIndex * LOVE_GENDER_OPTIONS.length + slot] ?? false;
}

export function writeIsLoveGender(
  mii: MiiAccessor,
  miiIndex: number,
  target: LoveGenderOption,
  value: boolean,
): boolean {
  if (!mii.has(MII_SCHEMA.Mii.MiiMisc.FaceInfo.IsLoveGender)) return false;
  const slot = LOVE_GENDER_OPTIONS.indexOf(target);
  if (slot < 0) return false;
  try {
    mii.setElement(
      MII_SCHEMA.Mii.MiiMisc.FaceInfo.IsLoveGender,
      miiIndex * LOVE_GENDER_OPTIONS.length + slot,
      value,
    );
    return true;
  } catch {
    return false;
  }
}

function isAttractedTo(
  mii: MiiAccessor,
  re: RelationAvailability,
  selfMii: number,
  targetMii: number,
): boolean {
  if (!re.gender || !re.loveGender) return true;
  const targetGender = readMiiGender(mii, targetMii);
  if (!targetGender || !LOVE_GENDER_SET.has(targetGender)) return false;
  return readIsLoveGender(mii, selfMii, targetGender as LoveGenderOption);
}

export type Relationship = {
  slot: number;
  a: number;
  b: number;
  abIndex: number;
  baIndex: number;
  typeAtoB: number;
  typeBtoA: number;
  meterAtoB: number;
  meterBtoA: number;
  isFight: boolean;
  crushAtoB: boolean;
  crushBtoA: boolean;
  typeSetSec: bigint | null;
};

export function listRelationships(mii: MiiAccessor, re: RelationAvailability): Relationship[] {
  const idA = mii.get(MII_SCHEMA.Relation.Info.RelationId.Id_a);
  const idB = mii.get(MII_SCHEMA.Relation.Info.RelationId.Id_b);
  const baseType = mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType);
  const meter = mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.Meter);
  const isFight = re.isFight ? mii.get(MII_SCHEMA.Relation.Info.IsFight) : null;
  const bitFlag = re.bitFlag ? mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.BitFlag) : null;
  const typeSet = re.typeSetTime ? mii.get(MII_SCHEMA.Relation.Info.TypeSetTime) : null;
  const count = idA.length;
  const out: Relationship[] = [];
  for (let i = 0; i < count; i++) {
    const a = idA[i];
    const b = idB[i];
    if (a < 0 || b < 0) continue;
    const abIndex = 2 * i;
    const baIndex = 2 * i + 1;
    out.push({
      slot: i,
      a,
      b,
      abIndex,
      baIndex,
      typeAtoB: baseType[abIndex] ?? 0,
      typeBtoA: baseType[baIndex] ?? 0,
      meterAtoB: meter[abIndex] ?? 0,
      meterBtoA: meter[baIndex] ?? 0,
      isFight: isFight ? !!isFight[i] : false,
      crushAtoB: hasCrushBit(bitFlag, abIndex),
      crushBtoA: hasCrushBit(bitFlag, baIndex),
      typeSetSec: typeSet ? (typeSet[i] ?? null) : null,
    });
  }
  return out;
}

function hasCrushBit(arr: number[] | null, dirIndex: number): boolean {
  if (!arr) return false;
  const v = arr[dirIndex];
  if (v === undefined) return false;
  return ((v >>> 0) & CRUSH_BIT) !== 0;
}

export function setFight(mii: MiiAccessor, slot: number, value: boolean): boolean {
  if (!mii.has(MII_SCHEMA.Relation.Info.IsFight)) return false;
  try {
    mii.setElement(MII_SCHEMA.Relation.Info.IsFight, slot, value);
    return true;
  } catch {
    return false;
  }
}

export function setCrush(mii: MiiAccessor, dirIndex: number, value: boolean): boolean {
  if (!mii.has(MII_SCHEMA.Relation.Info.DirectionalInfo.BitFlag)) return false;
  try {
    const arr = mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.BitFlag);
    const cur = (arr[dirIndex] ?? 0) >>> 0;
    const next = value ? cur | CRUSH_BIT : cur & ~CRUSH_BIT;
    mii.setElement(MII_SCHEMA.Relation.Info.DirectionalInfo.BitFlag, dirIndex, next >>> 0);
    return true;
  } catch {
    return false;
  }
}

export function crushAllowedForType(typeHash: number): boolean {
  const h = typeHash >>> 0;
  return h === FRIEND_HASH || h === KNOW_HASH;
}

export function findCrushTarget(
  mii: MiiAccessor,
  re: RelationAvailability,
  selfMii: number,
): number | null {
  if (!re.bitFlag) return null;
  const idA = mii.get(MII_SCHEMA.Relation.Info.RelationId.Id_a);
  const idB = mii.get(MII_SCHEMA.Relation.Info.RelationId.Id_b);
  const bitFlag = mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.BitFlag);
  const count = idA.length;
  for (let i = 0; i < count; i++) {
    const a = idA[i];
    const b = idB[i];
    if (a < 0 || b < 0) continue;
    if (a === selfMii && hasCrushBit(bitFlag, 2 * i)) return b;
    if (b === selfMii && hasCrushBit(bitFlag, 2 * i + 1)) return a;
  }
  return null;
}

export function setTypeSetSec(mii: MiiAccessor, slot: number, secs: bigint): boolean {
  if (!mii.has(MII_SCHEMA.Relation.Info.TypeSetTime)) return false;
  try {
    const v = secs < 0n ? 0n : secs;
    mii.setElement(MII_SCHEMA.Relation.Info.TypeSetTime, slot, v);
    return true;
  } catch {
    return false;
  }
}

type CoupleBlockReason =
  | 'gender_incompatible'
  | 'blood_related'
  | 'self_already_paired'
  | 'other_already_paired';

export type CoupleBlock = {
  reason: CoupleBlockReason;
  conflictSlot?: number;
};

export type CoupleConstraints = {
  gender: boolean;
  blood: boolean;
  selfActiveSlot: number | null;
  otherActiveSlot: number | null;
};

export function evaluateCoupleConstraints(
  mii: MiiAccessor,
  re: RelationAvailability,
  selfMii: number,
  otherMii: number,
  slot: number,
): CoupleConstraints {
  return {
    gender:
      !isAttractedTo(mii, re, selfMii, otherMii) || !isAttractedTo(mii, re, otherMii, selfMii),
    blood: isBloodRelatedSlot(mii, re, slot),
    selfActiveSlot: findActiveCoupleSlot(mii, selfMii, slot),
    otherActiveSlot: findActiveCoupleSlot(mii, otherMii, slot),
  };
}

export function blockForCandidate(
  c: CoupleConstraints,
  candidateTypeHash: number,
): CoupleBlock | null {
  if (!isRomanticTypeHash(candidateTypeHash)) return null;
  if (c.gender) return { reason: 'gender_incompatible' };
  if (c.blood) return { reason: 'blood_related' };
  if (ACTIVE_COUPLE_TYPES.has(candidateTypeHash >>> 0)) {
    if (c.selfActiveSlot !== null)
      return { reason: 'self_already_paired', conflictSlot: c.selfActiveSlot };
    if (c.otherActiveSlot !== null)
      return { reason: 'other_already_paired', conflictSlot: c.otherActiveSlot };
  }
  return null;
}

export type CrushBlock = { reason: 'gender_incompatible' | 'blood_related' };

export function checkCrushAllowed(
  mii: MiiAccessor,
  re: RelationAvailability,
  selfMii: number,
  otherMii: number,
  slot: number,
): CrushBlock | null {
  if (!isAttractedTo(mii, re, selfMii, otherMii)) return { reason: 'gender_incompatible' };
  if (isBloodRelatedSlot(mii, re, slot)) return { reason: 'blood_related' };
  return null;
}

function isBloodRelatedSlot(mii: MiiAccessor, re: RelationAvailability, slot: number): boolean {
  if (!re.bloodType) return false;
  return isBloodRelatedAtIndex(mii, 2 * slot) || isBloodRelatedAtIndex(mii, 2 * slot + 1);
}

function isBloodRelatedAtIndex(mii: MiiAccessor, dirIndex: number): boolean {
  const arr = mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.BloodType);
  const v = arr[dirIndex];
  if (v === undefined) return false;
  const name = enumNamesFor(MII_SCHEMA.Relation.Info.DirectionalInfo.BloodType.hash).get(v);
  return name ? BLOOD_RELATED_NAMES.has(name) : false;
}

function findActiveCoupleSlot(
  mii: MiiAccessor,
  miiIdx: number,
  excludeSlot: number,
): number | null {
  const idA = mii.get(MII_SCHEMA.Relation.Info.RelationId.Id_a);
  const idB = mii.get(MII_SCHEMA.Relation.Info.RelationId.Id_b);
  const baseType = mii.get(MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType);
  const count = idA.length;
  for (let i = 0; i < count; i++) {
    if (i === excludeSlot) continue;
    const a = idA[i];
    const b = idB[i];
    if (a < 0 || b < 0) continue;
    if (a !== miiIdx && b !== miiIdx) continue;
    const ab = baseType[2 * i] ?? 0;
    const ba = baseType[2 * i + 1] ?? 0;
    if (ACTIVE_COUPLE_TYPES.has(ab) || ACTIVE_COUPLE_TYPES.has(ba)) return i;
  }
  return null;
}

const COUNTERPARTS: Record<string, string[]> = {
  Parent: ['Child'],
  Child: ['Parent'],
  GrandParent: ['GrandChild'],
  GrandChild: ['GrandParent'],
  BrotherSisterOlder: ['BrotherSisterYounger'],
  BrotherSisterYounger: ['BrotherSisterOlder'],
  Other: ['Other', 'Invalid'],
  Invalid: ['Invalid', 'Other'],
};

export function counterpartsFor(typeName: string): string[] {
  return COUNTERPARTS[typeName] ?? [typeName];
}

export function isValidPair(aName: string, bName: string): boolean {
  return counterpartsFor(aName).includes(bName);
}

export { hasFightVariant, subRelationKey, subRelationLevels } from './subRelationLabels';
