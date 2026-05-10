import { GAME_LOCALES, localeProgramMsg, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { loadMsbt } from '../lib/msbt.ts';
import { writeMinifiedJson } from '../lib/output.ts';
import { loadSequence, type YamlEntry } from '../lib/yaml.ts';

const TROUBLE_PARAM = rsdb('TroubleParam');
const OUT = staticOut('troubles.json');

const SUBSTITUTION_TAGS = new Map<string, string>([
  ['Mii.Nickname', 'MiiName'],
  ['Mii.ThirdPersonPronoun', 'PronounSubj'],
  ['Mii.ThirdPersonWord', 'PronounAttr'],
  ['Mii.FirstPerson', 'I'],
  ['Player.PlayerNicknameByMii', 'PlayerName'],
  ['Replace.Island', 'IslandName'],
  ['Replace.MapObject', 'MapObjectName'],
  ['Replace.Goods', 'TreasureName'],
  ['Replace.WordAttrMessage', 'AttrName'],
]);

function cleanPreview(raw: string): string {
  let s = raw.split('<System.PageBreak>')[0];
  for (const [tag, placeholder] of SUBSTITUTION_TAGS) {
    s = s.replaceAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'), `<${placeholder}>`);
  }
  s = s.replace(/<(?!\/?[A-Z][A-Za-z]*>)[^>]*>/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

function loadTroubleMsbt(path: string): Map<string, string> {
  return loadMsbt(path, {
    keyTransform: (k) => (k.endsWith('_00') ? k.slice(0, -3) : null),
    transform: cleanPreview,
  });
}

const METHOD_TARGETS: Record<string, string[]> = {
  Hungry: [],
  HungryAttr: [],
  HungryUgc: [],

  Cloth: [],
  ClothLover: ['targetMii'],
  ClothPTops: [],
  ClothPTopsBottomsA: [],
  ClothPShoes: [],
  ClothPAccessory: [],
  ClothEvent: [],
  ClothSeason: [],
  ClothTutorial: [],

  Goods: [],
  GoodsAttr: [],
  GoodsBook: [],
  GoodsCD: [],
  GoodsDVD: [],
  GoodsGame: [],
  GoodsPet: [],
  GoodsSurprise: [],
  GoodsMatched: [],
  GoodsDesire: [],

  Friend: ['targetMii'],
  FriendCupid: ['targetMii'],
  FriendOther: ['targetMii'],
  FriendUgc: ['targetMii', 'targetUgcText'],
  Confession: ['targetMii'],
  ChallengeConfession: ['targetMii'],
  ReturnConfession: ['targetMii'],
  Proposal: ['targetMii'],
  Divorce: ['targetMii'],
  Separate: ['targetMii'],
  LiveTogether: ['targetMii'],
  LiveTogetherQuestion: ['targetMii'],
  LiveTogetherThanks: ['targetMii'],
  LiveTogetherNewsHouse: ['targetMii'],
  LiveApart: ['targetMii'],
  ChildBirth: ['targetMii'],
  ChildGrowth: ['targetMii'],
  FallInOneSideLove: ['targetMii'],
  ChangeOneSideLove: ['targetMii'],
  CoolDownOneSideLove: ['targetMii'],
  GiveUpOneSideLove: ['targetMii'],
  KnownOneSideLove: ['targetMii'],
  LoverWanted: ['targetMii'],
  DatePlace: ['targetMii', 'targetMapObject'],

  Fight: ['targetMii'],
  FightCouple: ['targetMii'],
  FightFriend: ['targetMii'],
  FightJoint: ['targetMii'],
  FightLover: ['targetMii'],
  FightNonreconciliation: ['targetMii'],
  FightReconciliation: ['targetMii'],
  FightRivalConfession: ['targetMii'],

  Depress: ['targetMii'],
  DepressDivorce: ['targetMii'],
  DepressLove: ['targetMii'],
  DepressFight: ['targetMii'],
  DepressSeparate: ['targetMii'],
  DepressGiveUpOneSideLove: ['targetMii'],
  DepressRevengeConfession: ['targetMii'],
  DepressStopConfession: ['targetMii'],
  PostDepress: ['targetMii'],

  IslandEdit: ['targetItemType', 'targetMapObject'],
  IslandEditObject: ['targetMapObject'],
  IslandEditRoadToFacility: ['targetMapObject'],
  IslandEditRoadToMany: ['targetMapObject'],
  IslandEditRoadToMii: ['targetMii', 'targetMapObject'],
  IslandEditTutorial00: ['targetMapObject'],
  IslandEditTutorial01: ['targetMapObject'],

  ChangeHair: [],
  Reform: ['targetMapObject'],

  AskPlayerFellowship: [],
  AskUgcWord: ['targetUgcText'],
  Introduction: ['targetMapObject'],
  IntroductionAlone: [],
  IntroductionFirstFriend: ['targetMii'],
  FirstFriend: ['targetMii'],
  SecondFriend: ['targetMii'],
  IntroductionSecondFriend: ['targetMii'],
  IntroductionFirstHungry: [],
  IntroductionSecondHungry: [],
  IntroductionUgcHungry: [],
  IntroductionFirstDressUp: [],
  IntroductionFirstInterior: ['targetMapObject'],

  DepressRevengeConfessionAfter: ['targetMii'],
  LiveTogetherNewHouse: ['targetMii'],
  Dummy: [],
  InsideHead: [],
};

const params = loadSequence(TROUBLE_PARAM);

const previews: Partial<Record<GameLocale, Map<string, string>>> = {};
for (const code of GAME_LOCALES) {
  try {
    previews[code] = loadTroubleMsbt(localeProgramMsg(code, 'Trouble/Trouble'));
  } catch (err) {
    console.warn(`[${code}] skipped (${err instanceof Error ? err.message : String(err)})`);
  }
}

const UNSET = new Set(['None', 'Invalid']);
function readEnum(p: YamlEntry, key: string): string | null {
  const label = p.enumLabel(key);
  if (!label || UNSET.has(label)) return null;
  return label;
}

type Trouble = {
  h: number;
  n: string;
  c: string;
  g: number;
  k: string;
  r: string[] | null;
  l: Partial<Record<GameLocale, string>>;
  mn: number;
  em: number;
  nm: number;
  rd: number;
  ei: string | null;
  fa: string | null;
  ga: string | null;
  ct: string | null;
  cet: string | null;
  cst: string | null;
  iet: string | null;
  iemc: string | null;
  iel: string | null;
  bt: string | null;
  ft: string | null;
  fft: string | null;
  pr: string | null;
  rp: string | null;
  bal: string | null;
  flags: string[];
  ipa: number[];
};

const seen = new Set<string>();
const result: Trouble[] = [];

for (const p of params) {
  const name = p.str('Name');
  if (!name || seen.has(name)) continue;
  seen.add(name);
  const methodKey = p.str('MethodKey') || name;

  const localized: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = previews[code]?.get(name);
    if (text) localized[code] = text;
  }

  const targetMiiNum = p.num('TargetMiiNum') ?? 0;

  let relevantTargets = METHOD_TARGETS[methodKey] ?? null;
  if (targetMiiNum > 0) {
    const list = relevantTargets ? [...relevantTargets] : [];
    if (!list.includes('targetMii')) list.unshift('targetMii');
    relevantTargets = list;
  }

  const flags: string[] = [];
  if (p.bool('IsLove')) flags.push('isLove');
  if (p.bool('IsConfession')) flags.push('isConfession');
  if (p.bool('IsFightReconcile')) flags.push('isFightReconcile');
  if (p.bool('IsTargetMiiSetLater')) flags.push('isTargetMiiSetLater');

  result.push({
    h: murmur3(name),
    n: name,
    c: p.str('CategoryId') || 'Other',
    g: p.num('GenerateRate') ?? 0,
    k: methodKey,
    r: relevantTargets,
    l: localized,
    mn: targetMiiNum,
    em: p.num('EndMinute') ?? 0,
    nm: p.num('NextTimeMinute') ?? 0,
    rd: p.num('RescueDay') ?? 0,
    ei: readEnum(p, 'EnableIntroductionId'),
    fa: readEnum(p, 'FoodAttr'),
    ga: readEnum(p, 'GoodsAttr'),
    ct: readEnum(p, 'ClothType'),
    cet: readEnum(p, 'ClothEventType'),
    cst: readEnum(p, 'ClothSeasonType'),
    iet: readEnum(p, 'IslandEditType'),
    iemc: readEnum(p, 'IslandEditMapObjCategoryId'),
    iel: p.str('IslandEditMessageLabel') || null,
    bt: readEnum(p, 'BoostType'),
    ft: readEnum(p, 'FeelingType'),
    fft: readEnum(p, 'FightFlagType'),
    pr: readEnum(p, 'Priority'),
    rp: readEnum(p, 'RescuePriority'),
    bal: readEnum(p, 'BalloonType'),
    flags,
    ipa: p.array<number>('IslandEditPriceArray') ?? [],
  });
}

result.sort((a, b) => {
  if (a.c !== b.c) return a.c < b.c ? -1 : 1;
  return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
});

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} troubles to ${OUT}`);
