import {
  arrayCount,
  arrGetBool,
  arrGetEnum,
  arrGetInt,
  arrGetInt64,
  arrGetString,
  arrGetUInt,
  arrGetUInt64,
  arrSetBool,
  arrSetEnum,
  arrSetInt,
  arrSetInt64,
  arrSetUInt,
  arrSetUInt64,
} from '../sav/codec';
import { DataType } from '../sav/dataType';
import { murmur3_x86_32 } from '../sav/hash';
import { enumOptionsFor } from '../sav/knownKeys';
import type { Entry } from '../sav/types';

const H_ID_A = murmur3_x86_32('Relation.Info.RelationId.Id_a');
const H_ID_B = murmur3_x86_32('Relation.Info.RelationId.Id_b');
const H_BASE = murmur3_x86_32('Relation.Info.DirectionalInfo.BaseRelationType');
const H_METER = murmur3_x86_32('Relation.Info.DirectionalInfo.Meter');
const H_FIGHT = murmur3_x86_32('Relation.Info.IsFight');
const H_BITFLAG = murmur3_x86_32('Relation.Info.DirectionalInfo.BitFlag');
const H_TYPE_SET_TIME = murmur3_x86_32('Relation.Info.TypeSetTime');
const H_BLOOD = murmur3_x86_32('Relation.Info.DirectionalInfo.BloodType');
const H_NAME = murmur3_x86_32('Mii.Name.Name');
const H_GENDER = murmur3_x86_32('Mii.MiiMisc.FaceInfo.Gender');
const H_LOVE_GENDER = murmur3_x86_32('Mii.MiiMisc.FaceInfo.IsLoveGender');

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

// IsLoveGender packs 3 bits per Mii (Male, Female, Third); the full Gender
// enum's `Invalid` slot is intentionally absent.
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
  return enumNamesFor(H_BASE).get(h) ?? `0x${h.toString(16).padStart(8, '0')}`;
}

export type RelationEntries = {
  idA: Entry;
  idB: Entry;
  baseType: Entry;
  meter: Entry;
  isFight: Entry | null;
  bitFlag: Entry | null;
  typeSetTime: Entry | null;
  bloodType: Entry | null;
  name: Entry;
  gender: Entry | null;
  loveGender: Entry | null;
};

export function findRelationEntries(byHash: Map<number, Entry>): RelationEntries | null {
  const idA = byHash.get(H_ID_A);
  const idB = byHash.get(H_ID_B);
  const baseType = byHash.get(H_BASE);
  const meter = byHash.get(H_METER);
  const name = byHash.get(H_NAME);
  if (!idA || !idB || !baseType || !meter || !name) return null;
  return {
    idA,
    idB,
    baseType,
    meter,
    name,
    isFight: byHash.get(H_FIGHT) ?? null,
    bitFlag: byHash.get(H_BITFLAG) ?? null,
    typeSetTime: byHash.get(H_TYPE_SET_TIME) ?? null,
    bloodType: byHash.get(H_BLOOD) ?? null,
    gender: byHash.get(H_GENDER) ?? null,
    loveGender: byHash.get(H_LOVE_GENDER) ?? null,
  };
}

function readBitFlag(e: Entry, i: number): number {
  switch (e.type) {
    case DataType.UIntArray:
      return arrGetUInt(e, i);
    case DataType.IntArray:
      return arrGetInt(e, i) >>> 0;
    case DataType.EnumArray:
      return arrGetEnum(e, i);
    default:
      throw new Error(`Unsupported BitFlag type ${e.type}`);
  }
}

function writeBitFlag(e: Entry, i: number, v: number): void {
  const u = v >>> 0;
  switch (e.type) {
    case DataType.UIntArray:
      arrSetUInt(e, i, u);
      return;
    case DataType.IntArray:
      arrSetInt(e, i, u | 0);
      return;
    case DataType.EnumArray:
      arrSetEnum(e, i, u);
      return;
    default:
      throw new Error(`Unsupported BitFlag type ${e.type}`);
  }
}

export function readMiiName(nameEntry: Entry, index: number): string {
  try {
    return arrGetString(nameEntry, index);
  } catch {
    return '';
  }
}

export function readMiiGender(genderEntry: Entry | null, miiIndex: number): string | null {
  if (!genderEntry) return null;
  try {
    return enumNamesFor(H_GENDER).get(arrGetEnum(genderEntry, miiIndex)) ?? null;
  } catch {
    return null;
  }
}

export function readIsLoveGender(
  loveEntry: Entry | null,
  miiIndex: number,
  target: LoveGenderOption,
): boolean {
  if (!loveEntry) return false;
  const slot = LOVE_GENDER_OPTIONS.indexOf(target);
  if (slot < 0) return false;
  try {
    return arrGetBool(loveEntry, miiIndex * LOVE_GENDER_OPTIONS.length + slot);
  } catch {
    return false;
  }
}

export function writeIsLoveGender(
  loveEntry: Entry,
  miiIndex: number,
  target: LoveGenderOption,
  value: boolean,
): boolean {
  const slot = LOVE_GENDER_OPTIONS.indexOf(target);
  if (slot < 0) return false;
  try {
    arrSetBool(loveEntry, miiIndex * LOVE_GENDER_OPTIONS.length + slot, value);
    return true;
  } catch {
    return false;
  }
}

// Returns true when gender / love-gender data is absent so we don't enforce a
// rule we can't actually read — saves without these fields just permit anyone.
function isAttractedTo(re: RelationEntries, selfMii: number, targetMii: number): boolean {
  if (!re.gender || !re.loveGender) return true;
  const targetGender = readMiiGender(re.gender, targetMii);
  if (!targetGender || !LOVE_GENDER_SET.has(targetGender)) return false;
  return readIsLoveGender(re.loveGender, selfMii, targetGender as LoveGenderOption);
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

export function listRelationships(re: RelationEntries): Relationship[] {
  const count = arrayCount(re.idA);
  const out: Relationship[] = [];
  for (let i = 0; i < count; i++) {
    const a = arrGetInt(re.idA, i);
    const b = arrGetInt(re.idB, i);
    if (a < 0 || b < 0) continue;
    const abIndex = 2 * i;
    const baIndex = 2 * i + 1;
    out.push({
      slot: i,
      a,
      b,
      abIndex,
      baIndex,
      typeAtoB: arrGetEnum(re.baseType, abIndex),
      typeBtoA: arrGetEnum(re.baseType, baIndex),
      meterAtoB: arrGetInt(re.meter, abIndex),
      meterBtoA: arrGetInt(re.meter, baIndex),
      isFight: re.isFight ? readBoolSafe(re.isFight, i) : false,
      crushAtoB: hasCrush(re.bitFlag, abIndex),
      crushBtoA: hasCrush(re.bitFlag, baIndex),
      typeSetSec: readTypeSetSec(re.typeSetTime, i),
    });
  }
  return out;
}

function readBoolSafe(e: Entry, i: number): boolean {
  try {
    return arrGetBool(e, i);
  } catch {
    return false;
  }
}

export function setFight(re: RelationEntries, slot: number, value: boolean): boolean {
  if (!re.isFight) return false;
  try {
    arrSetBool(re.isFight, slot, value);
    return true;
  } catch {
    return false;
  }
}

export function hasCrush(e: Entry | null, dirIndex: number): boolean {
  if (!e) return false;
  try {
    return (readBitFlag(e, dirIndex) & CRUSH_BIT) !== 0;
  } catch {
    return false;
  }
}

export function setCrush(re: RelationEntries, dirIndex: number, value: boolean): boolean {
  if (!re.bitFlag) return false;
  try {
    const cur = readBitFlag(re.bitFlag, dirIndex);
    writeBitFlag(re.bitFlag, dirIndex, value ? cur | CRUSH_BIT : cur & ~CRUSH_BIT);
    return true;
  } catch {
    return false;
  }
}

export function crushAllowedForType(typeHash: number): boolean {
  const h = typeHash >>> 0;
  return h === FRIEND_HASH || h === KNOW_HASH;
}

export function findCrushTarget(re: RelationEntries, selfMii: number): number | null {
  if (!re.bitFlag) return null;
  const count = arrayCount(re.idA);
  for (let i = 0; i < count; i++) {
    const a = arrGetInt(re.idA, i);
    const b = arrGetInt(re.idB, i);
    if (a < 0 || b < 0) continue;
    if (a === selfMii && hasCrush(re.bitFlag, 2 * i)) return b;
    if (b === selfMii && hasCrush(re.bitFlag, 2 * i + 1)) return a;
  }
  return null;
}

function readTypeSetSec(e: Entry | null, slot: number): bigint | null {
  if (!e) return null;
  try {
    if (e.type === DataType.UInt64Array) return arrGetUInt64(e, slot);
    if (e.type === DataType.Int64Array) return arrGetInt64(e, slot);
  } catch {
    return null;
  }
  return null;
}

export function setTypeSetSec(re: RelationEntries, slot: number, secs: bigint): boolean {
  const e = re.typeSetTime;
  if (!e) return false;
  try {
    if (e.type === DataType.UInt64Array) {
      arrSetUInt64(e, slot, secs < 0n ? 0n : secs);
      return true;
    }
    if (e.type === DataType.Int64Array) {
      arrSetInt64(e, slot, secs);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export type CoupleBlockReason =
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
  re: RelationEntries,
  selfMii: number,
  otherMii: number,
  slot: number,
): CoupleConstraints {
  return {
    gender: !isAttractedTo(re, selfMii, otherMii) || !isAttractedTo(re, otherMii, selfMii),
    blood: isBloodRelatedSlot(re, slot),
    selfActiveSlot: findActiveCoupleSlot(re, selfMii, slot),
    otherActiveSlot: findActiveCoupleSlot(re, otherMii, slot),
  };
}

// Gender + blood apply to every romantic type. Already-paired only fires for
// active types (Lover, Couple) since a Mii can carry multiple exes at once.
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
  re: RelationEntries,
  selfMii: number,
  otherMii: number,
  slot: number,
): CrushBlock | null {
  if (!isAttractedTo(re, selfMii, otherMii)) return { reason: 'gender_incompatible' };
  if (isBloodRelatedSlot(re, slot)) return { reason: 'blood_related' };
  return null;
}

function isBloodRelatedSlot(re: RelationEntries, slot: number): boolean {
  if (!re.bloodType) return false;
  return (
    isBloodRelatedAtIndex(re.bloodType, 2 * slot) ||
    isBloodRelatedAtIndex(re.bloodType, 2 * slot + 1)
  );
}

function isBloodRelatedAtIndex(bloodEntry: Entry, dirIndex: number): boolean {
  try {
    const name = enumNamesFor(H_BLOOD).get(arrGetEnum(bloodEntry, dirIndex));
    return name ? BLOOD_RELATED_NAMES.has(name) : false;
  } catch {
    return false;
  }
}

function findActiveCoupleSlot(
  re: RelationEntries,
  mii: number,
  excludeSlot: number,
): number | null {
  const count = arrayCount(re.idA);
  for (let i = 0; i < count; i++) {
    if (i === excludeSlot) continue;
    const a = arrGetInt(re.idA, i);
    const b = arrGetInt(re.idB, i);
    if (a < 0 || b < 0) continue;
    if (a !== mii && b !== mii) continue;
    const ab = arrGetEnum(re.baseType, 2 * i);
    const ba = arrGetEnum(re.baseType, 2 * i + 1);
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

export {
  hasFightVariant,
  subRelationKey,
  subRelationLevelIndex,
  subRelationLevels,
} from './subRelationLabels';
export type { SubRelationKey, SubRelationLevel } from './subRelationLabels';
