import { existsSync } from 'node:fs';

import { GAME_LOCALES, ICON_DIR, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { compareCaseInsensitive, writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const ENCYCLOPEDIA = rsdb('MapObjectEncyclopedia');
const COLOR_GROUP_DATA = rsdb('MapObjeColorVariationGroupData');
const PRICE_PARAM = rsdb('Price');
const OUT = staticOut('items.json');
const ICON_DIR_DST = staticOut('item-icons');

const ITEM_MSBT_FILES = ['MapObjectObj_Name', 'MapObjectFacility_Name', 'Ground_Name'];

type Variant = { n: string; h: number; c: string };
type Item = {
  n: string;
  l: Partial<Record<GameLocale, string>>;
  v: Variant[];
  p: number;
  t: 'f' | 'm';
};

function loadEncyclopedia(path: string): string[] {
  const out: string[] = [];
  for (const e of loadSequence(path)) {
    const key = e.rowKey();
    if (key) out.push(key);
  }
  return out;
}

function loadColorGroups(path: string): Map<string, { name: string; color: string }[]> {
  const out = new Map<string, { name: string; color: string }[]>();
  const re =
    /ActorHash=UInt32\s+0x[0-9a-fA-F]+\s+=>\s+(\w+),\s+Color=UInt32\s+0x[0-9a-fA-F]+\s+=>\s+(\w+)/;
  for (const e of loadSequence(path)) {
    const groupKey = e.rowKey();
    if (!groupKey) continue;
    const variants: { name: string; color: string }[] = [];
    for (const c of e.arrayItemComments('ColorVariation')) {
      if (!c) continue;
      const m = c.match(re);
      if (m) variants.push({ name: m[1], color: m[2] });
    }
    if (variants.length > 0) out.set(groupKey, variants);
  }
  return out;
}

function resolveLocalized(actorName: string, mergedNames: Map<string, string>): string | null {
  if (mergedNames.has(actorName)) return mergedNames.get(actorName) ?? null;
  const base = actorName.replace(/_Road$/, '');
  if (base !== actorName && mergedNames.has(base)) return mergedNames.get(base) ?? null;
  const groundKey = `Ground${base}`;
  if (mergedNames.has(groundKey)) return mergedNames.get(groundKey) ?? null;
  if (base.startsWith('Facility')) {
    const mapKey = base.replace(/^Facility/, 'MapObject');
    const candidates = [
      mapKey,
      `${mapKey}00`,
      mapKey.replace('PawnShop', 'Pawnshop'),
      `${mapKey.replace('PawnShop', 'Pawnshop')}00`,
    ];
    for (const c of candidates) {
      if (mergedNames.has(c)) return mergedNames.get(c) ?? null;
    }
  }
  return null;
}

function loadPrices(path: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of loadSequence(path)) {
    const key = e.rowKey();
    const price = e.num('Price');
    if (key && price != null) out.set(key, price);
  }
  return out;
}

const encyclopedia = loadEncyclopedia(ENCYCLOPEDIA);
const colorGroups = loadColorGroups(COLOR_GROUP_DATA);
const prices = loadPrices(PRICE_PARAM);

const namesByLocale = loadLocaleMaps(ITEM_MSBT_FILES);

const seen = new Set<string>();
const result: Item[] = [];
const skipped: { name: string; reason: string }[] = [];
for (const baseName of encyclopedia) {
  if (seen.has(baseName)) continue;
  seen.add(baseName);

  const variants: Variant[] = (
    colorGroups.get(baseName) ?? [{ name: baseName, color: 'Default' }]
  ).map((v) => ({
    n: v.name,
    h: murmur3(v.name),
    c: v.color,
  }));

  const hasAnyIcon = variants.some((v) => existsSync(`${ICON_DIR}/${v.n}.png`));
  if (!hasAnyIcon) {
    skipped.push({ name: baseName, reason: 'no-icon' });
    continue;
  }

  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const table = namesByLocale[code];
    if (!table) continue;
    const text = resolveLocalized(baseName, table);
    if (text) localized[code] = text;
  }

  const cat: Item['t'] = baseName.startsWith('Facility') ? 'f' : 'm';
  const price = prices.get(baseName) ?? 0;

  result.push({
    n: baseName,
    l: localized,
    v: variants,
    p: price,
    t: cat,
  });
}

result.sort((a, b) => compareCaseInsensitive(a.l.USen ?? a.n, b.l.USen ?? b.n));

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} items to ${OUT} (${skipped.length} skipped)`);

ensureDir(ICON_DIR_DST);
const seenIcon = new Set<string>();
const jobs: IconJob[] = [];
for (const item of result) {
  for (const variant of item.v) {
    if (seenIcon.has(variant.n)) continue;
    seenIcon.add(variant.n);
    jobs.push({
      src: `${ICON_DIR}/${variant.n}.png`,
      dst: `${ICON_DIR_DST}/${variant.n}.webp`,
      label: variant.n,
    });
  }
}
const conv = convertWebp(jobs, { warnMissing: false });
reportConversion(conv, ICON_DIR_DST);
