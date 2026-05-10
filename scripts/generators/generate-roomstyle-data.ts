import { readFileSync } from 'node:fs';

import {
  GAME_DATA_LIST,
  GAME_LOCALES,
  ICON_DIR,
  rsdb,
  staticOut,
  type GameLocale,
} from '../lib/config.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { compareCaseInsensitive, writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

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
  const txt = readFileSync(path, 'utf8');
  const out = new Map<string, number>();
  const re =
    /# Hash=UInt32 0x73adc433 => InformedNewRelease, Value=UInt32 0x([0-9a-f]+) => Player\.InteriorRoomStyleInfo\.([A-Z][A-Za-z0-9]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt)) !== null) {
    out.set(m[2], Number.parseInt(m[1], 16) >>> 0);
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
      src: `${ICON_DIR}/Room_Style_${variant.n}.png`,
      dst: `${ICON_DIR_DST}/${variant.n}.webp`,
    });
  }
}
const conv = convertWebp(jobs);
reportConversion(conv, ICON_DIR_DST);
