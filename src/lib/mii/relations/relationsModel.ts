import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import {
  baseRelationTypeLabel,
  listRelationships,
  readMiiName,
  type RelationAvailability,
  type Relationship,
} from './relations';

export const TYPE_COLORS: Record<string, string> = {
  Couple: '#e11d48',
  Lover: '#f43f5e',
  ExLover: '#9f1239',
  Divorce: '#7f1d1d',
  Friend: '#16a34a',
  ExFriend: '#a16207',
  Know: '#94a3b8',
  Other: '#cbd5e1',
  Parent: '#7c3aed',
  Child: '#a855f7',
  BrotherSisterOlder: '#2563eb',
  BrotherSisterYounger: '#0ea5e9',
  GrandParent: '#1d4ed8',
  GrandChild: '#3b82f6',
  Relative: '#0891b2',
  Invalid: '#e5e7eb',
};

export const FALLBACK_COLOR = '#cbd5e1';

export const GROUP_ORDER: Record<string, number> = {
  Couple: 0,
  Lover: 1,
  ExLover: 2,
  Divorce: 3,
  Parent: 4,
  Child: 5,
  BrotherSisterOlder: 6,
  BrotherSisterYounger: 7,
  GrandParent: 8,
  GrandChild: 9,
  Relative: 10,
  Friend: 11,
  ExFriend: 12,
  Know: 13,
  Other: 14,
};

const HIDDEN_TYPES: ReadonlySet<string> = new Set(['Invalid', 'Other']);

export function isHiddenType(label: string): boolean {
  return HIDDEN_TYPES.has(label) || label.startsWith('0x');
}

function colorForType(name: string): string {
  return TYPE_COLORS[name] ?? FALLBACK_COLOR;
}

export type EgoEdge = {
  slot: number;
  otherIndex: number;
  otherName: string;
  outIndex: number;
  inIndex: number;
  outType: number;
  inType: number;
  outTypeName: string;
  inTypeName: string;
  outMeter: number;
  inMeter: number;
  isFight: boolean;
  crushOut: boolean;
  crushIn: boolean;
  typeSetSec: bigint | null;
  colorOut: string;
  colorIn: string;
};

function toEgoEdge(mii: MiiAccessor, r: Relationship, miiIndex: number): EgoEdge {
  const selfIsA = r.a === miiIndex;
  const otherIndex = selfIsA ? r.b : r.a;
  const outIndex = selfIsA ? r.abIndex : r.baIndex;
  const inIndex = selfIsA ? r.baIndex : r.abIndex;
  const outType = selfIsA ? r.typeAtoB : r.typeBtoA;
  const inType = selfIsA ? r.typeBtoA : r.typeAtoB;
  const outTypeName = baseRelationTypeLabel(outType);
  const inTypeName = baseRelationTypeLabel(inType);
  return {
    slot: r.slot,
    otherIndex,
    otherName: readMiiName(mii, otherIndex),
    outIndex,
    inIndex,
    outType,
    inType,
    outTypeName,
    inTypeName,
    outMeter: selfIsA ? r.meterAtoB : r.meterBtoA,
    inMeter: selfIsA ? r.meterBtoA : r.meterAtoB,
    isFight: r.isFight,
    crushOut: selfIsA ? r.crushAtoB : r.crushBtoA,
    crushIn: selfIsA ? r.crushBtoA : r.crushAtoB,
    typeSetSec: r.typeSetSec,
    colorOut: colorForType(outTypeName),
    colorIn: colorForType(inTypeName),
  };
}

export function egoView(mii: MiiAccessor, re: RelationAvailability, miiIndex: number): EgoEdge[] {
  const out: EgoEdge[] = [];
  for (const r of listRelationships(mii, re)) {
    if (r.a !== miiIndex && r.b !== miiIndex) continue;
    out.push(toEgoEdge(mii, r, miiIndex));
  }
  return out;
}

export function compareByOutMeterDesc(a: EgoEdge, b: EgoEdge): number {
  return b.outMeter - a.outMeter;
}

export function compareByGroupThenOutMeter(a: EgoEdge, b: EgoEdge): number {
  const ga = GROUP_ORDER[a.outTypeName] ?? 99;
  const gb = GROUP_ORDER[b.outTypeName] ?? 99;
  if (ga !== gb) return ga - gb;
  return b.outMeter - a.outMeter;
}

export type Pair = {
  a: number;
  b: number;
  nameA: string;
  nameB: string;
  typeAB: string;
  typeBA: string;
  meterAB: number;
  meterBA: number;
  colorAB: string;
  colorBA: string;
  isFight: boolean;
};

export function allPairsView(mii: MiiAccessor, re: RelationAvailability): Pair[] {
  const out: Pair[] = [];
  for (const r of listRelationships(mii, re)) {
    const typeAB = baseRelationTypeLabel(r.typeAtoB);
    const typeBA = baseRelationTypeLabel(r.typeBtoA);
    if (isHiddenType(typeAB) && isHiddenType(typeBA)) continue;
    out.push({
      a: r.a,
      b: r.b,
      nameA: readMiiName(mii, r.a),
      nameB: readMiiName(mii, r.b),
      typeAB,
      typeBA,
      meterAB: r.meterAtoB,
      meterBA: r.meterBtoA,
      colorAB: colorForType(typeAB),
      colorBA: colorForType(typeBA),
      isFight: r.isFight,
    });
  }
  return out;
}
