import { GAME_LOCALES, ICON_DIR, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { compareCaseInsensitive, writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const GOODS_PARAM = rsdb('GoodsParam');
const OUT = staticOut('treasures.json');
const ICON_DIR_DST = staticOut('treasure-icons');

type Treasure = {
  n: string;
  icon: string;
  t: 'Treasure' | 'Levelup';
  l: Partial<Record<GameLocale, string>>;
};

const params = loadSequence(GOODS_PARAM);

const names = loadLocaleMaps('Goods_Name');

const seen = new Set<string>();
const result: Treasure[] = [];
for (const p of params) {
  const name = p.str('Name');
  const icon = p.str('IconName');
  const type = p.enumLabel('Type');
  if (!name || seen.has(name)) continue;
  if (type !== 'Treasure' && type !== 'Levelup') continue;
  seen.add(name);

  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = names[code]?.get(name);
    if (text) localized[code] = text;
  }

  result.push({
    n: name,
    icon: icon ?? name,
    t: type,
    l: localized,
  });
}

result.sort((a, b) => compareCaseInsensitive(a.l.USen ?? a.n, b.l.USen ?? b.n));

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} treasures to ${OUT}`);

ensureDir(ICON_DIR_DST);
const seenIcon = new Set<string>();
const jobs: IconJob[] = [];
for (const t of result) {
  if (seenIcon.has(t.icon)) continue;
  seenIcon.add(t.icon);
  jobs.push({
    src: `${ICON_DIR}/${t.icon}.png`,
    dst: `${ICON_DIR_DST}/${t.icon}.webp`,
    label: t.n,
  });
}
const conv = convertWebp(jobs);
reportConversion(conv, ICON_DIR_DST);
