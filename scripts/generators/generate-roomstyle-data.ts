import { readFileSync } from 'node:fs';

import { parse } from 'yaml';

import {
  GAME_DATA_LIST,
  GAME_LOCALES,
  iconPath,
  rsdb,
  staticOut,
  type GameLocale,
} from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { compareCaseInsensitive, writeMinifiedJson } from '../lib/output.ts';
import { BYML_CUSTOM_TAGS, bymlHashToName, loadSequence } from '../lib/yaml.ts';

const ROOM_STYLE_PARAM = rsdb('RoomStyleParam');
const OUT = staticOut('roomstyles.json');
const ICON_DIR_DST = staticOut('roomstyle-icons');

type Variant = { n: string; i: number; m?: number };
type RoomStyleGroup = {
  g: string;
  l: Partial<Record<GameLocale, string>>;
  v: Variant[];
};

function loadStyleNames(path: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of loadSequence(path)) {
    const key = e.rowKey();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function splitStyleName(styleName: string): { group: string; suffix: number } {
  const m = styleName.match(/^(.*?)(\d+)$/);
  if (!m) return { group: styleName, suffix: 0 };
  return { group: m[1], suffix: Number.parseInt(m[2], 10) };
}

function loadMysteryHashes(path: string): Map<string, number> {
  const INFORMED_NEW_RELEASE = murmur3('InformedNewRelease');

  type InnerEntry = { Hash?: number; Value?: number };
  type StructEntry = { Hash?: number; DefaultValue?: InnerEntry[] };
  const parsed = parse(readFileSync(path, 'utf8'), { customTags: BYML_CUSTOM_TAGS }) as {
    root?: { Data?: { Struct?: StructEntry[] } };
  };

  const structs = parsed?.root?.Data?.Struct ?? [];
  const out = new Map<string, number>();
  for (const entry of structs) {
    const outerHash = typeof entry.Hash === 'number' ? entry.Hash >>> 0 : null;
    if (!outerHash) continue;
    const fullName = bymlHashToName.get(outerHash);
    if (!fullName) continue;
    const name = fullName.split('.').pop()!;
    for (const inner of entry.DefaultValue ?? []) {
      const innerHash = typeof inner.Hash === 'number' ? inner.Hash >>> 0 : null;
      if (innerHash !== INFORMED_NEW_RELEASE) continue;
      const val = typeof inner.Value === 'number' ? inner.Value >>> 0 : null;
      if (val != null) {
        out.set(name, val);
        break;
      }
    }
  }
  return out;
}

const orderedNames = loadStyleNames(ROOM_STYLE_PARAM);
const mysteryHashes = loadMysteryHashes(GAME_DATA_LIST);

const names = loadLocaleMaps('RoomStyleVariation_Name');

const groups = new Map<string, { name: string; suffix: number }[]>();
for (const name of orderedNames) {
  const { group, suffix } = splitStyleName(name);
  let arr = groups.get(group);
  if (!arr) {
    arr = [];
    groups.set(group, arr);
  }
  arr.push({ name, suffix });
}

const result: RoomStyleGroup[] = [];
for (const [groupKey, rawVariants] of groups) {
  const variants = [...rawVariants].sort((a, b) => a.suffix - b.suffix);
  const labelKey = `${groupKey}00`;

  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = names[code]?.get(labelKey);
    if (text) localized[code] = text;
  }

  result.push({
    g: groupKey,
    l: localized,
    v: variants.map((entry, idx) => {
      const m = mysteryHashes.get(entry.name);
      return m == null ? { n: entry.name, i: idx } : { n: entry.name, i: idx, m };
    }),
  });
}

result.sort((a, b) => compareCaseInsensitive(a.l.USen ?? a.g, b.l.USen ?? b.g));

writeMinifiedJson(OUT, result);
const totalVariants = result.reduce((acc, g) => acc + g.v.length, 0);
console.log(`Wrote ${result.length} room style groups (${totalVariants} variants) to ${OUT}`);

ensureDir(ICON_DIR_DST);
const seenIcon = new Set<string>();
const jobs: IconJob[] = [];
for (const group of result) {
  for (const variant of group.v) {
    if (seenIcon.has(variant.n)) continue;
    seenIcon.add(variant.n);
    jobs.push({
      src: iconPath(`Room_Style_${variant.n}`),
      dst: `${ICON_DIR_DST}/${variant.n}.webp`,
    });
  }
}
const conv = convertWebp(jobs);
reportConversion(conv, ICON_DIR_DST);
