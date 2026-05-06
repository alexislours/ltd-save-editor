import { enumOptionName, enumOptionsFor } from '$lib/sav/knownKeys';
import { MII_SCHEMA } from '$lib/sav/schema';
import {
  genderLabel,
  pronounLabel,
  relationTypeLabel,
  subRelationLabel,
} from './miiLabelList.svelte';
import type { MiiAccessor } from './miiEditor.svelte';
import { MII_SECTIONS, type MiiField } from './miiFields';
import { populatedMiiIndices } from './ownership/populated';
import {
  baseRelationTypeLabel,
  findRelations,
  hasFightVariant,
  listRelationships,
  LOVE_GENDER_OPTIONS,
  readIsLoveGender,
  readMiiName,
  subRelationKey,
  type LoveGenderOption,
  type RelationAvailability,
} from './relations/relations';

function fieldEnumLabel(field: MiiField, value: string, uiLocale: string | null): string | null {
  if (field.leaf === MII_SCHEMA.Mii.Name.PronounType) {
    const t = pronounLabel(value, uiLocale);
    if (t) return t;
  }
  if (field.leaf === MII_SCHEMA.Mii.MiiMisc.FaceInfo.Gender) {
    const t = genderLabel(value, uiLocale);
    if (t) return t;
  }
  const opts = enumOptionsFor(field.leaf.hash);
  const opt = opts?.find((o) => o.name === value);
  return opt?.label ?? null;
}

function loveGenderText(value: LoveGenderOption, uiLocale: string | null): string {
  return genderLabel(value, uiLocale) ?? value;
}

function typeSetSecText(value: string | null, uiLocale: string | null): string | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const tag = uiLocale ?? undefined;
    return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'medium' }).format(d);
  } catch {
    return d.toISOString();
  }
}

const EXPORT_SCHEMA = 'ltd-mii-export/v1';

type MiiSnapshot = {
  index: number;
  name: string;
  fields: Record<string, string | number | null>;
  attractedTo: LoveGenderOption[];
  attractedToLabels: string[];
};

type RelationshipSnapshot = {
  slot: number;
  a: { index: number; name: string };
  b: { index: number; name: string };
  isFight: boolean;
  typeSetSec: string | null;
  typeSetSecLabel: string | null;
  atob: DirectionalSnapshot;
  btoa: DirectionalSnapshot;
};

type DirectionalSnapshot = {
  type: string;
  typeLabel: string | null;
  meter: number;
  crush: boolean;
  subRelation: string | null;
  subRelationLabel: string | null;
};

type MiiExport = {
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  appVersion: string;
  saveFile: string;
  miis: MiiSnapshot[];
  relationships: RelationshipSnapshot[];
};

type BuildOptions = {
  appVersion: string;
  saveFile: string;
  exportedAt?: string;
  uiLocale?: string | null;
};

export function buildMiiExport(mii: MiiAccessor, opts: BuildOptions): MiiExport {
  const indices = populatedMiiIndices(mii);
  const re = findRelations(mii);
  const uiLocale = opts.uiLocale ?? null;

  const miis = indices.map((index) => snapshotMii(index, mii, re, uiLocale));
  const relationships = re ? snapshotRelationships(mii, re, uiLocale) : [];

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
  mii: MiiAccessor,
  re: RelationAvailability | null,
  uiLocale: string | null,
): MiiSnapshot {
  const fields: Record<string, string | number | null> = {};
  let name = '';

  for (const section of MII_SECTIONS) {
    for (const field of section.fields) collectField(field, index, mii, fields, uiLocale);
    for (const field of section.spoilerFields ?? [])
      collectField(field, index, mii, fields, uiLocale);
    for (const field of section.postSpoilerFields ?? []) {
      collectField(field, index, mii, fields, uiLocale);
    }
  }

  if (re) name = readMiiName(mii, index);
  if (!name && typeof fields.name === 'string') name = fields.name;

  const attractedTo: LoveGenderOption[] = [];
  if (re?.loveGender) {
    for (const opt of LOVE_GENDER_OPTIONS) {
      if (readIsLoveGender(mii, index, opt)) attractedTo.push(opt);
    }
  }
  const attractedToLabels = attractedTo.map((opt) => loveGenderText(opt, uiLocale));

  return { index, name, fields, attractedTo, attractedToLabels };
}

function collectField(
  field: MiiField,
  index: number,
  mii: MiiAccessor,
  out: Record<string, string | number | null>,
  uiLocale: string | null,
): void {
  if (!mii.has(field.leaf)) return;
  try {
    const value = readFieldValue(mii, index, field);
    out[field.labelKey] = value;
    if (field.kind === 'enum' && typeof value === 'string') {
      const label = fieldEnumLabel(field, value, uiLocale);
      if (label !== null) out[`${field.labelKey}_label`] = label;
    }
  } catch {
    /* skip */
  }
}

function readFieldValue(mii: MiiAccessor, index: number, field: MiiField): string | number | null {
  switch (field.kind) {
    case 'string':
      return mii.getElement(field.leaf, index) as string;
    case 'int': {
      const raw = mii.getElement(field.leaf, index) as number;
      return raw + (field.displayOffset ?? 0);
    }
    case 'uint':
      return (mii.getElement(field.leaf, index) as number) >>> 0;
    case 'enum':
      return enumOptionName(mii.getElement(field.leaf, index) as number) ?? null;
    case 'binary':
      return null;
  }
}

function snapshotRelationships(
  mii: MiiAccessor,
  re: RelationAvailability,
  uiLocale: string | null,
): RelationshipSnapshot[] {
  return listRelationships(mii, re).map((r) => {
    const aName = readMiiName(mii, r.a);
    const bName = readMiiName(mii, r.b);
    const typeSetSec = r.typeSetSec === null ? null : r.typeSetSec.toString();
    return {
      slot: r.slot,
      a: { index: r.a, name: aName },
      b: { index: r.b, name: bName },
      isFight: r.isFight,
      typeSetSec,
      typeSetSecLabel: typeSetSecText(typeSetSec, uiLocale),
      atob: directional(r.typeAtoB, r.meterAtoB, r.crushAtoB, r.isFight, uiLocale),
      btoa: directional(r.typeBtoA, r.meterBtoA, r.crushBtoA, r.isFight, uiLocale),
    };
  });
}

function directional(
  typeHash: number,
  meter: number,
  crush: boolean,
  isFight: boolean,
  uiLocale: string | null,
): DirectionalSnapshot {
  const typeName = baseRelationTypeLabel(typeHash);
  const sub = subRelationKey(typeName, meter, isFight && hasFightVariant(typeName));
  const subKey = sub?.key ?? null;
  return {
    type: typeName,
    typeLabel: relationTypeLabel(typeName, uiLocale),
    meter,
    crush,
    subRelation: subKey,
    subRelationLabel: subKey === null ? null : subRelationLabel(subKey, uiLocale),
  };
}

function serializeMiiExportJson(data: MiiExport): string {
  return JSON.stringify(data, null, 2);
}

const COMPUTED_MII_COLUMNS: { header: string; pick: (m: MiiSnapshot) => string | number | null }[] =
  [
    { header: 'index', pick: (m) => m.index },
    { header: 'name', pick: (m) => m.name },
    { header: 'attracted_to', pick: (m) => m.attractedTo.join('|') },
    { header: 'attracted_to_label', pick: (m) => m.attractedToLabels.join('|') },
  ];

const MII_FIELD_COLUMNS: string[] = (() => {
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
      if (f.kind === 'enum') keys.push(`${f.labelKey}_label`);
    }
  }
  return keys;
})();

function serializeMiisCsv(data: MiiExport): string {
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
  'relation_type_label',
  'meter',
  'crush',
  'sub_relation',
  'sub_relation_label',
  'is_fight',
  'type_set_sec',
  'type_set_sec_label',
  'slot',
];

function serializeRelationshipsCsv(data: MiiExport): string {
  const rows: (string | number | null)[][] = [REL_CSV_HEADER];
  for (const r of data.relationships) {
    rows.push(directionalRow(r, 'atob'));
    rows.push(directionalRow(r, 'btoa'));
  }
  return encodeCsv(rows);
}

export type MiiExportFormat = 'json' | 'miis-csv' | 'relationships-csv';

type MiiExportFile = {
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
    dir.typeLabel,
    dir.meter,
    dir.crush ? 'true' : 'false',
    dir.subRelation,
    dir.subRelationLabel,
    r.isFight ? 'true' : 'false',
    r.typeSetSec,
    r.typeSetSecLabel,
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
