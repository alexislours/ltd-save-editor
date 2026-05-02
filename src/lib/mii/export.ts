import { arrGetEnum, arrGetInt, arrGetString, arrGetUInt } from '../sav/codec';
import { enumOptionName } from '../sav/knownKeys';
import type { Entry } from '../sav/types';
import { MII_SECTIONS, type MiiField } from './miiFields';
import { populatedMiiIndices } from './populated';
import {
  baseRelationTypeLabel,
  findRelationEntries,
  hasFightVariant,
  listRelationships,
  LOVE_GENDER_OPTIONS,
  readIsLoveGender,
  readMiiName,
  subRelationKey,
  type LoveGenderOption,
  type RelationEntries,
} from './relations';

export const EXPORT_SCHEMA = 'ltd-mii-export/v1';

export type MiiSnapshot = {
  index: number;
  name: string;
  fields: Record<string, string | number | null>;
  attractedTo: LoveGenderOption[];
};

export type RelationshipSnapshot = {
  slot: number;
  a: { index: number; name: string };
  b: { index: number; name: string };
  isFight: boolean;
  typeSetSec: string | null;
  atob: DirectionalSnapshot;
  btoa: DirectionalSnapshot;
};

export type DirectionalSnapshot = {
  type: string;
  meter: number;
  crush: boolean;
  subRelation: string | null;
};

export type MiiExport = {
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  appVersion: string;
  saveFile: string;
  miis: MiiSnapshot[];
  relationships: RelationshipSnapshot[];
};

export type BuildOptions = {
  appVersion: string;
  saveFile: string;
  exportedAt?: string;
};

export function buildMiiExport(entries: Entry[], opts: BuildOptions): MiiExport {
  const byHash = new Map<number, Entry>();
  for (const e of entries) byHash.set(e.hash, e);

  const indices = populatedMiiIndices(byHash);
  const relEntries = findRelationEntries(byHash);

  const miis = indices.map((index) => snapshotMii(index, byHash, relEntries));
  const relationships = relEntries ? snapshotRelationships(relEntries) : [];

  return {
    schema: EXPORT_SCHEMA,
    exportedAt: opts.exportedAt ?? new Date().toISOString(),
    appVersion: opts.appVersion,
    saveFile: opts.saveFile,
    miis,
    relationships,
  };
}

function snapshotMii(
  index: number,
  byHash: Map<number, Entry>,
  relEntries: RelationEntries | null,
): MiiSnapshot {
  const fields: Record<string, string | number | null> = {};
  let name = '';

  for (const section of MII_SECTIONS) {
    for (const field of section.fields) collectField(field, index, byHash, fields);
    for (const field of section.spoilerFields ?? []) collectField(field, index, byHash, fields);
    for (const field of section.postSpoilerFields ?? []) {
      collectField(field, index, byHash, fields);
    }
  }

  if (relEntries) name = readMiiName(relEntries.name, index);
  if (!name && typeof fields.name === 'string') name = fields.name;

  const attractedTo: LoveGenderOption[] = [];
  if (relEntries?.loveGender) {
    for (const opt of LOVE_GENDER_OPTIONS) {
      if (readIsLoveGender(relEntries.loveGender, index, opt)) attractedTo.push(opt);
    }
  }

  return { index, name, fields, attractedTo };
}

function collectField(
  field: MiiField,
  index: number,
  byHash: Map<number, Entry>,
  out: Record<string, string | number | null>,
): void {
  const entry = byHash.get(field.hash);
  if (!entry || entry.type !== field.expectedType) return;
  try {
    out[field.labelKey] = readFieldValue(entry, index, field);
  } catch {
    /* skip */
  }
}

function readFieldValue(entry: Entry, index: number, field: MiiField): string | number | null {
  switch (field.kind) {
    case 'string':
      return arrGetString(entry, index);
    case 'int': {
      const raw = arrGetInt(entry, index);
      return raw + (field.displayOffset ?? 0);
    }
    case 'uint':
      return arrGetUInt(entry, index);
    case 'enum':
      return enumOptionName(arrGetEnum(entry, index)) ?? null;
  }
}

function snapshotRelationships(re: RelationEntries): RelationshipSnapshot[] {
  return listRelationships(re).map((r) => {
    const aName = readMiiName(re.name, r.a);
    const bName = readMiiName(re.name, r.b);
    return {
      slot: r.slot,
      a: { index: r.a, name: aName },
      b: { index: r.b, name: bName },
      isFight: r.isFight,
      typeSetSec: r.typeSetSec === null ? null : r.typeSetSec.toString(),
      atob: directional(r.typeAtoB, r.meterAtoB, r.crushAtoB, r.isFight),
      btoa: directional(r.typeBtoA, r.meterBtoA, r.crushBtoA, r.isFight),
    };
  });
}

function directional(
  typeHash: number,
  meter: number,
  crush: boolean,
  isFight: boolean,
): DirectionalSnapshot {
  const typeName = baseRelationTypeLabel(typeHash);
  const sub = subRelationKey(typeName, meter, isFight && hasFightVariant(typeName));
  return { type: typeName, meter, crush, subRelation: sub?.key ?? null };
}

export function serializeMiiExportJson(data: MiiExport): string {
  return JSON.stringify(data, null, 2);
}

const COMPUTED_MII_COLUMNS: { header: string; pick: (m: MiiSnapshot) => string | number | null }[] =
  [
    { header: 'index', pick: (m) => m.index },
    { header: 'name', pick: (m) => m.name },
    { header: 'attracted_to', pick: (m) => m.attractedTo.join('|') },
  ];

export const MII_FIELD_COLUMNS: string[] = (() => {
  const seen = new Set<string>(['name']);
  const keys: string[] = [];
  for (const section of MII_SECTIONS) {
    const all = [
      ...section.fields,
      ...(section.spoilerFields ?? []),
      ...(section.postSpoilerFields ?? []),
    ];
    for (const f of all) {
      if (seen.has(f.labelKey)) continue;
      seen.add(f.labelKey);
      keys.push(f.labelKey);
    }
  }
  return keys;
})();

export function serializeMiisCsv(data: MiiExport): string {
  const headers = [...COMPUTED_MII_COLUMNS.map((c) => c.header), ...MII_FIELD_COLUMNS];
  const rows: (string | number | null)[][] = [headers];
  for (const m of data.miis) {
    const row: (string | number | null)[] = [];
    for (const c of COMPUTED_MII_COLUMNS) row.push(c.pick(m));
    for (const k of MII_FIELD_COLUMNS) row.push(m.fields[k] ?? null);
    rows.push(row);
  }
  return encodeCsv(rows);
}

const REL_CSV_HEADER = [
  'source_index',
  'source_name',
  'target_index',
  'target_name',
  'relation_type',
  'meter',
  'crush',
  'sub_relation',
  'is_fight',
  'type_set_sec',
  'slot',
];

export function serializeRelationshipsCsv(data: MiiExport): string {
  const rows: (string | number | null)[][] = [REL_CSV_HEADER];
  for (const r of data.relationships) {
    rows.push(directionalRow(r, 'atob'));
    rows.push(directionalRow(r, 'btoa'));
  }
  return encodeCsv(rows);
}

export type MiiExportFormat = 'json' | 'miis-csv' | 'relationships-csv';

export type MiiExportFile = {
  filename: string;
  mime: string;
  content: string;
};

export function buildMiiExportFile(
  data: MiiExport,
  format: MiiExportFormat,
  stamp: string,
): MiiExportFile {
  switch (format) {
    case 'json':
      return {
        filename: `mii-export_${stamp}.json`,
        mime: 'application/json',
        content: serializeMiiExportJson(data),
      };
    case 'miis-csv':
      return {
        filename: `miis_${stamp}.csv`,
        mime: 'text/csv',
        content: serializeMiisCsv(data),
      };
    case 'relationships-csv':
      return {
        filename: `mii-relationships_${stamp}.csv`,
        mime: 'text/csv',
        content: serializeRelationshipsCsv(data),
      };
  }
}

export function exportTimestamp(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function directionalRow(
  r: RelationshipSnapshot,
  direction: 'atob' | 'btoa',
): (string | number | null)[] {
  const source = direction === 'atob' ? r.a : r.b;
  const target = direction === 'atob' ? r.b : r.a;
  const dir = r[direction];
  return [
    source.index,
    source.name,
    target.index,
    target.name,
    dir.type,
    dir.meter,
    dir.crush ? 'true' : 'false',
    dir.subRelation,
    r.isFight ? 'true' : 'false',
    r.typeSetSec,
    r.slot,
  ];
}

function encodeCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function csvCell(v: string | number | null): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
