import { existsSync } from 'node:fs';

import { GAME_LOCALES, ICON_DIR, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { compareCaseInsensitive, writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const CLOTH = rsdb('Cloth');
const CLOTH_MODEL = rsdb('ClothModelParam');
const OUT = staticOut('clothes.json');
const ICON_DIR_DST = staticOut('cloth-icons');

const CLOTH_MSBT_FILES = [
  'ClothAccessory_Name',
  'ClothAll_Name',
  'ClothBottomsA_Name',
  'ClothBottomsB_Name',
  'ClothHeadwear_Name',
  'ClothShoes_Name',
  'ClothTops_Name',
  'ClothTopslong_Name',
];

type Cloth = {
  i: number;
  n: string;
  c: number;
  l: Partial<Record<GameLocale, string>>;
};

const cloths = loadSequence(CLOTH);
const models = loadSequence(CLOTH_MODEL);

const colorByRowKey = new Map<string, number>();
for (const m of models) {
  const key = m.rowKey();
  if (!key) continue;
  colorByRowKey.set(key, m.arrayLength('ColorVariation'));
}

const names = loadLocaleMaps(CLOTH_MSBT_FILES, { warnEmpty: true, warnLabel: 'cloth names' });

const result: Cloth[] = [];
const seen = new Set<string>();
for (const c of cloths) {
  const rowKey = c.rowKey();
  if (!rowKey || seen.has(rowKey)) continue;
  const clothIndex = c.num('ClothIndex');
  if (clothIndex == null || clothIndex < 0) continue;
  seen.add(rowKey);

  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = names[code]?.get(rowKey);
    if (text) localized[code] = text;
  }

  let colorCount = 0;
  if (existsSync(`${ICON_DIR}/${rowKey}_00.png`)) {
    colorCount = 1;
    for (let i = 1; i < 32; i++) {
      if (!existsSync(`${ICON_DIR}/${rowKey}_${String(i).padStart(2, '0')}.png`)) break;
      colorCount = i + 1;
    }
  } else {
    colorCount = colorByRowKey.get(rowKey) ?? 1;
  }

  result.push({
    i: clothIndex,
    n: rowKey,
    c: colorCount,
    l: localized,
  });
}

result.sort((a, b) => compareCaseInsensitive(a.l.USen ?? a.n, b.l.USen ?? b.n));

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} clothes to ${OUT}`);

ensureDir(ICON_DIR_DST);
const jobs: IconJob[] = [];
for (const cloth of result) {
  for (let i = 0; i < cloth.c; i++) {
    const suffix = `_${String(i).padStart(2, '0')}`;
    jobs.push({
      src: `${ICON_DIR}/${cloth.n}${suffix}.png`,
      dst: `${ICON_DIR_DST}/${cloth.n}${suffix}.webp`,
    });
  }
}
const conv = convertWebp(jobs, { warnMissing: false });
reportConversion(conv, ICON_DIR_DST);
