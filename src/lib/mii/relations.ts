import { arrGetEnum, arrGetInt, arrGetString, arrGetBool, arrayCount } from '../sav/codec';
import { murmur3_x86_32 } from '../sav/hash';
import { enumOptionsFor } from '../sav/knownKeys';
import type { Entry } from '../sav/types';

const H_ID_A = murmur3_x86_32('Relation.Info.RelationId.Id_a') >>> 0;
const H_ID_B = murmur3_x86_32('Relation.Info.RelationId.Id_b') >>> 0;
const H_BASE = murmur3_x86_32('Relation.Info.DirectionalInfo.BaseRelationType') >>> 0;
const H_METER = murmur3_x86_32('Relation.Info.DirectionalInfo.Meter') >>> 0;
const H_FIGHT = murmur3_x86_32('Relation.Info.IsFight') >>> 0;
const H_NAME = murmur3_x86_32('Mii.Name.Name') >>> 0;

export type RelationEntries = {
  idA: Entry;
  idB: Entry;
  baseType: Entry;
  meter: Entry;
  isFight: Entry | null;
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
  return { idA, idB, baseType, meter, isFight, name };
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

export { subRelationLabel, subRelationLevels, subRelationLevelIndex } from './subRelationLabels';
export type { SubRelationLevel } from './subRelationLabels';

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
