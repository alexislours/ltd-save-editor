import { GAME_LOCALES, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { loadLocaleMaps, type LocaleMaps } from '../lib/msbt.ts';
import { writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const WISH_LIST = rsdb('FountainWishListData');
const OUT = staticOut('wishes.json');

type LocalizedMap = Partial<Record<GameLocale, string>>;

const MSBT = {
  Goods_Name: loadLocaleMaps('Goods_Name'),
  Travel_Name: loadLocaleMaps('Travel_Name'),
  HabitUnlockGroup_Name: loadLocaleMaps('HabitUnlockGroup_Name'),
  RoomStyleVariation_Name: loadLocaleMaps('RoomStyleVariation_Name'),
  MapObjectFacility_Name: loadLocaleMaps('MapObjectFacility_Name'),
  MapObjectObj_Name: loadLocaleMaps('MapObjectObj_Name'),
  Ground_Name: loadLocaleMaps('Ground_Name'),
};

function lookup(table: LocaleMaps, key: string | null): LocalizedMap | null {
  if (!key) return null;
  const out: LocalizedMap = {};
  let any = false;
  for (const code of GAME_LOCALES) {
    const text = table[code]?.get(key);
    if (text) {
      out[code] = text;
      any = true;
    }
  }
  return any ? out : null;
}

function mergeLocalized(...sources: (LocalizedMap | null)[]): LocalizedMap | null {
  const merged: LocalizedMap = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src) as [GameLocale, string][]) {
      if (!merged[k]) merged[k] = v;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

const params = loadSequence(WISH_LIST);

type Wish = {
  n: string;
  h: number;
  c: string;
  s: number;
  l?: LocalizedMap;
  jp?: string;
  lv?: number;
  lct?: number;
  ls?: string;
  ac?: true;
  ao?: true;
};

const result: Wish[] = [];
for (const p of params) {
  const rowId = p.str('__RowId');
  if (!rowId) continue;
  const base = (rowId.split('/').pop() ?? '').split('.')[0];
  const category = p.enumLabel('Category');
  const sortIndex = p.num('SortIndex') ?? 0;
  const jpLabel = p.str('Label') ?? '';
  const facilityKey = p.str('WishFacilityKey') ?? '';
  const goodsKey = p.str('WishGoodsKey') ?? '';
  const travelKey = p.str('WishTravelKey') ?? '';
  const habitKey = p.str('WishHabitKey') ?? '';
  const habitGroup = p.enumLabel('WishHabitGroupId');
  const styleGroup = p.enumLabel('WishStyleGroupId');
  const objectKey = p.str('WishObjectKey') ?? '';
  const groundKey = p.str('WishGroundKey') ?? '';
  const wallKey = p.str('WishWallKey') ?? '';
  const floorKey = p.str('WishFloorKey') ?? '';

  let localized: LocalizedMap | null = null;
  switch (category) {
    case 'Goods':
      localized = lookup(MSBT.Goods_Name, goodsKey);
      break;
    case 'Travel':
      localized = mergeLocalized(
        lookup(MSBT.Travel_Name, travelKey ? `Title_${travelKey}` : ''),
        lookup(MSBT.Travel_Name, travelKey),
      );
      break;
    case 'HabitGroup':
      localized = mergeLocalized(
        lookup(MSBT.HabitUnlockGroup_Name, habitGroup),
        lookup(MSBT.HabitUnlockGroup_Name, habitKey),
      );
      break;
    case 'StyleGroup':
      localized = lookup(MSBT.RoomStyleVariation_Name, styleGroup);
      break;
    case 'Facility': {
      const stripped = facilityKey ? facilityKey.replace(/^Facility/, '') : '';
      const familyRestaurant = stripped === 'Restaurant' ? 'FamilyRestaurant' : null;
      localized = mergeLocalized(
        lookup(MSBT.MapObjectFacility_Name, facilityKey),
        stripped ? lookup(MSBT.MapObjectFacility_Name, `MapObject${stripped}00`) : null,
        stripped ? lookup(MSBT.MapObjectFacility_Name, `MapObject${stripped}`) : null,
        familyRestaurant
          ? lookup(MSBT.MapObjectFacility_Name, `MapObject${familyRestaurant}`)
          : null,
        familyRestaurant
          ? lookup(MSBT.MapObjectFacility_Name, `MapObject${familyRestaurant}00`)
          : null,
      );
      break;
    }
    case 'Object': {
      const stripped = objectKey ? objectKey.replace(/_\d+$/, '') : '';
      localized = mergeLocalized(
        lookup(MSBT.MapObjectObj_Name, objectKey),
        stripped ? lookup(MSBT.MapObjectObj_Name, stripped) : null,
        objectKey ? lookup(MSBT.MapObjectObj_Name, `${objectKey}00`) : null,
      );
      break;
    }
    case 'Ground':
      localized = mergeLocalized(
        groundKey ? lookup(MSBT.Ground_Name, `Ground${groundKey}`) : null,
        lookup(MSBT.Ground_Name, groundKey),
        lookup(MSBT.Ground_Name, wallKey),
        lookup(MSBT.Ground_Name, floorKey),
      );
      break;
    default:
      break;
  }

  const fountainLevel = p.num('FountainLevel') ?? 0;
  const isLiftByCount = p.bool('IsLiftByComeTrueCount');
  const liftComeTrueCount = p.num('LiftComeTrueCount') ?? 0;
  const isLiftBySeason = p.bool('IsLiftBySeason');
  const liftSeason = p.enumLabel('LiftSeasonId');
  const isAutoComeTrue = p.bool('IsAutoComeTrue');
  const isAutoOwn = p.bool('IsAutoOwn');

  const entry: Wish = {
    n: base,
    h: murmur3(base),
    c: category ?? 'Unknown',
    s: sortIndex,
  };
  if (localized) entry.l = localized;
  if (jpLabel) entry.jp = jpLabel;
  if (fountainLevel >= 0) entry.lv = fountainLevel;
  if (isLiftByCount && liftComeTrueCount > 0) entry.lct = liftComeTrueCount;
  if (isLiftBySeason && liftSeason) entry.ls = liftSeason;
  if (isAutoComeTrue) entry.ac = true;
  if (isAutoOwn) entry.ao = true;
  result.push(entry);
}

result.sort((a, b) => {
  if (a.c !== b.c) return a.c < b.c ? -1 : 1;
  if (a.s !== b.s) return a.s - b.s;
  return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
});

writeMinifiedJson(OUT, result);

const localizedCount = result.filter((r) => r.l).length;
console.log(
  `Wrote ${result.length} wishes to ${OUT} (${localizedCount} with at least one MSBT label)`,
);
