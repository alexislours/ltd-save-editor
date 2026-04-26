import {
  arrGetEnum,
  arrGetInt,
  arrGetString,
  arrGetBool,
  arrSetBool,
  arrGetUInt,
  arrSetUInt,
  arrGetInt64,
  arrSetInt64,
  arrGetUInt64,
  arrSetUInt64,
  arrayCount,
} from '../sav/codec';
import { DataType } from '../sav/dataType';
import { murmur3_x86_32 } from '../sav/hash';
import { enumOptionsFor } from '../sav/knownKeys';
import type { Entry } from '../sav/types';

const H_ID_A = murmur3_x86_32('Relation.Info.RelationId.Id_a') >>> 0;
const H_ID_B = murmur3_x86_32('Relation.Info.RelationId.Id_b') >>> 0;
const H_BASE = murmur3_x86_32('Relation.Info.DirectionalInfo.BaseRelationType') >>> 0;
const H_METER = murmur3_x86_32('Relation.Info.DirectionalInfo.Meter') >>> 0;
const H_FIGHT = murmur3_x86_32('Relation.Info.IsFight') >>> 0;
const H_BITFLAG = murmur3_x86_32('Relation.Info.DirectionalInfo.BitFlag') >>> 0;
const H_TYPE_SET_TIME = murmur3_x86_32('Relation.Info.TypeSetTime') >>> 0;
const H_NAME = murmur3_x86_32('Mii.Name.Name') >>> 0;

const FRIEND_HASH = murmur3_x86_32('Friend') >>> 0;
const KNOW_HASH = murmur3_x86_32('Know') >>> 0;

export const CRUSH_BIT = 0x02;

export type RelationEntries = {
  idA: Entry;
  idB: Entry;
  baseType: Entry;
  meter: Entry;
  isFight: Entry | null;
  bitFlag: Entry | null;
  typeSetTime: Entry | null;
  name: Entry;
};

export function findRelationEntries(byHash: Map<number, Entry>): RelationEntries | null {
  const idA = byHash.get(H_ID_A);
  const idB = byHash.get(H_ID_B);
  const baseType = byHash.get(H_BASE);
  const meter = byHash.get(H_METER);
  const name = byHash.get(H_NAME);
  if (!idA || !idB || !baseType || !meter || !name) return null;
  const isFight = byHash.get(H_FIGHT) ?? null;
  const bitFlag = byHash.get(H_BITFLAG) ?? null;
  const typeSetTime = byHash.get(H_TYPE_SET_TIME) ?? null;
  return { idA, idB, baseType, meter, isFight, bitFlag, typeSetTime, name };
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
      isFight: re.isFight ? safeBool(re.isFight, i) : false,
      crushAtoB: hasCrush(re.bitFlag, abIndex),
      crushBtoA: hasCrush(re.bitFlag, baIndex),
      typeSetSec: getTypeSetSec(re.typeSetTime, i),
    });
  }
  return out;
}

function safeBool(e: Entry, i: number): boolean {
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

function readBitFlag(e: Entry, i: number): number {
  if (e.type === DataType.UIntArray) return arrGetUInt(e, i);
  if (e.type === DataType.IntArray) return arrGetInt(e, i) >>> 0;
  if (e.type === DataType.EnumArray) return arrGetEnum(e, i);
  throw new Error(`Unsupported BitFlag type ${e.type}`);
}

function writeBitFlag(e: Entry, i: number, v: number): void {
  const u = v >>> 0;
  if (e.type === DataType.UIntArray) arrSetUInt(e, i, u);
  else if (e.type === DataType.IntArray) arrSetUInt(e, i, u);
  else if (e.type === DataType.EnumArray) arrSetUInt(e, i, u);
  else throw new Error(`Unsupported BitFlag type ${e.type}`);
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
    const next = value ? cur | CRUSH_BIT : cur & ~CRUSH_BIT;
    writeBitFlag(re.bitFlag, dirIndex, next);
    return true;
  } catch {
    return false;
  }
}

export function crushAllowedForType(typeHash: number): boolean {
  const h = typeHash >>> 0;
  return h === FRIEND_HASH || h === KNOW_HASH;
}

function getTypeSetSec(e: Entry | null, slot: number): bigint | null {
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

export function baseRelationTypeLabel(valueHash: number): string {
  if (!BASE_TYPE_BY_HASH) {
    BASE_TYPE_BY_HASH = new Map();
    const opts = enumOptionsFor(H_BASE);
    if (opts) for (const o of opts) BASE_TYPE_BY_HASH.set(o.hash, o.name);
  }
  return BASE_TYPE_BY_HASH.get(valueHash) ?? `0x${(valueHash >>> 0).toString(16).padStart(8, '0')}`;
}

let BASE_TYPE_BY_HASH: Map<number, string> | null = null;

export function readMiiName(nameEntry: Entry, index: number): string {
  try {
    return arrGetString(nameEntry, index);
  } catch {
    return '';
  }
}

export {
  subRelationKey,
  subRelationLevels,
  subRelationLevelIndex,
  hasFightVariant,
} from './subRelationLabels';
export type { SubRelationLevel, SubRelationKey } from './subRelationLabels';

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

export function populatedMiiIndices(nameEntry: Entry): number[] {
  const count = arrayCount(nameEntry);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const n = readMiiName(nameEntry, i);
    if (n.length > 0) out.push(i);
  }
  return out;
}
