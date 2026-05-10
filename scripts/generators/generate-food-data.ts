import { GAME_LOCALES, ICON_DIR, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { compareCaseInsensitive, writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const FOOD_PARAM = rsdb('FoodParam');
const OUT = staticOut('foods.json');
const ICON_DIR_DST = staticOut('food-icons');

type Food = {
  h: number;
  n: string;
  t: number;
  i: number;
  l: Partial<Record<GameLocale, string>>;
};

const params = loadSequence(FOOD_PARAM);

const names = loadLocaleMaps('Food_Name', { warnOnError: true });

const seen = new Set<string>();
const result: Food[] = [];
for (const p of params) {
  const name = p.str('Name');
  if (!name || seen.has(name)) continue;
  seen.add(name);
  const textureId = p.num('TextureId');
  const temporaryId = p.num('TemporaryId');
  if (textureId == null) continue;
  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = names[code]?.get(name);
    if (text) localized[code] = text;
  }
  result.push({
    h: murmur3(name),
    n: name,
    t: textureId,
    i: temporaryId ?? -1,
    l: localized,
  });
}

result.sort((a, b) => compareCaseInsensitive(a.l.USen ?? a.n, b.l.USen ?? b.n));

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} foods to ${OUT}`);

ensureDir(ICON_DIR_DST);
const seenTexture = new Set<number>();
const jobs: IconJob[] = [];
for (const food of result) {
  if (seenTexture.has(food.t)) continue;
  seenTexture.add(food.t);
  jobs.push({
    src: `${ICON_DIR}/Food${String(food.t).padStart(3, '0')}.png`,
    dst: `${ICON_DIR_DST}/Food${food.t}.webp`,
    label: food.n,
  });
}
const conv = convertWebp(jobs);
reportConversion(conv, ICON_DIR_DST);
