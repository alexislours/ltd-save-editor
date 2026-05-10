import { GAME_LOCALES, ICON_DIR, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { convertWebp, ensureDir, reportConversion, type IconJob } from '../lib/icons.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const COORD = rsdb('Coordinate');
const COORD_CLOTH = rsdb('CoordinateClothInfo');
const COORD_ATTR = rsdb('CoordinateAttribute');
const OUT = staticOut('coordinates.json');
const ICON_DIR_DST = staticOut('coordinate-icons');

const USAGE_CLOTH = murmur3('Cloth');
const GENDER_WOMEN = murmur3('Women');

type ClothSlots = {
  Tops: number;
  Topslong: number;
  BottomsA: number;
  BottomsB: number;
  Shoes: number;
  Headwear: number;
  Accessory: number;
  All: number;
};

type Coordinate = {
  n: string;
  k: number;
  s: number;
  cat: string;
  g: 'Unisex' | 'Women';
  ki: boolean;
  sw: boolean;
  cc: number;
  pc: ClothSlots;
  ti: boolean;
  l: Partial<Record<GameLocale, string>>;
};

const coords = loadSequence(COORD);
const coordCloths = loadSequence(COORD_CLOTH);
const coordAttrs = loadSequence(COORD_ATTR);

const ccByRowHash = new Map<number, (typeof coordCloths)[number]>();
for (const cc of coordCloths) {
  const hash = cc.uint('__RowId');
  if (hash) ccByRowHash.set(hash, cc);
}
const caByRowHash = new Map<number, (typeof coordAttrs)[number]>();
for (const ca of coordAttrs) {
  const hash = ca.uint('__RowId');
  if (hash) caByRowHash.set(hash, ca);
}

const names = loadLocaleMaps('Coordinate_Name', { warnEmpty: true, warnLabel: 'coordinate names' });

const result: Coordinate[] = [];
for (const c of coords) {
  const rowKey = c.rowKey();
  if (!rowKey) continue;
  if (c.uint('Usage') !== USAGE_CLOTH) continue;

  const refs = c.nested<number>('ComponentsHash');
  const ccRef = refs?.CoordinateClothInfoRef ?? 0;
  const caRef = refs?.CoordinateAttributeRef ?? 0;
  const cc = ccRef ? ccByRowHash.get(ccRef) : null;
  const ca = caRef ? caByRowHash.get(caRef) : null;

  const pc: ClothSlots = {
    Tops: cc?.uint('TopsHash') ?? 0,
    Topslong: cc?.uint('TopslongHash') ?? 0,
    BottomsA: cc?.uint('BottomsAHash') ?? 0,
    BottomsB: cc?.uint('BottomsBHash') ?? 0,
    Shoes: cc?.uint('ShoesHash') ?? 0,
    Headwear: cc?.uint('HeadwearHash') ?? 0,
    Accessory: cc?.uint('AccessoryHash') ?? 0,
    All: cc?.uint('AllHash') ?? 0,
  };
  const colorCount = cc ? cc.arrayLength('Color') : 0;
  const topsIn = cc?.bool('TopsIn') ?? false;

  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = names[code]?.get(rowKey);
    if (text) localized[code] = text;
  }

  const genderRaw = ca?.uint('Gender') ?? 0;
  const gender: Coordinate['g'] = genderRaw === GENDER_WOMEN ? 'Women' : 'Unisex';
  const isKids = ca?.bool('IsKids') ?? false;
  const isSwimwear = ca?.bool('IsSwimwear') ?? false;

  const saveIndex = c.num('SaveIndex') ?? -1;
  const category = c.str('Category') ?? '';

  result.push({
    n: rowKey,
    k: murmur3(rowKey),
    s: saveIndex,
    cat: category,
    g: gender,
    ki: isKids,
    sw: isSwimwear,
    cc: Math.max(1, colorCount),
    pc,
    ti: topsIn,
    l: localized,
  });
}

result.sort((a, b) => a.s - b.s);

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} coordinates to ${OUT}`);

ensureDir(ICON_DIR_DST);
const jobs: IconJob[] = [];
for (const coord of result) {
  for (let i = 0; i < coord.cc; i++) {
    const suffix = `_${String(i).padStart(2, '0')}`;
    jobs.push({
      src: `${ICON_DIR}/${coord.n}${suffix}.png`,
      dst: `${ICON_DIR_DST}/${coord.n}${suffix}.webp`,
      skipIfExists: true,
    });
  }
}
const conv = convertWebp(jobs, { warnMissing: false });
reportConversion(conv, ICON_DIR_DST);
