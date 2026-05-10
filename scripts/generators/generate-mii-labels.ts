import {
  GAME_LOCALES,
  localeLayoutMsg,
  localeReplaceMsg,
  staticOut,
  type GameLocale,
} from '../lib/config.ts';
import { loadMsbt } from '../lib/msbt.ts';
import { writeMinifiedJson } from '../lib/output.ts';

const OUT = staticOut('mii-labels.json');

const PRONOUN_VALUES = ['He', 'She', 'They'] as const;
const GENDER_VALUES = ['Male', 'Female', 'Third'] as const;

const GENDER_INVALID: Record<GameLocale, string> = {
  CNzh: '未设定',
  EUde: 'Nicht angegeben',
  EUen: 'Unspecified',
  EUes: 'Sin especificar',
  EUfr: 'Non précisé',
  EUit: 'Non specificato',
  EUnl: 'Niet opgegeven',
  JPja: '未設定',
  KRko: '미설정',
  TWzh: '未設定',
  USen: 'Unspecified',
  USes: 'Sin especificar',
  USfr: 'Non précisé',
};

const RELATION_TYPE_KEYS = [
  'Friend',
  'Know',
  'Couple',
  'Lover',
  'ExLover',
  'Divorce',
  'ExFriend',
  'Other',
  'Parent',
  'Child',
  'BrotherSisterOlder',
  'BrotherSisterYounger',
  'GrandParent',
  'GrandChild',
  'Relative',
] as const;

const SUB_PREFIXES = [
  'Couple',
  'Divorce',
  'ExFriend',
  'ExLover',
  'Family',
  'Friend',
  'Know',
  'Lover',
  'OnesideLove',
] as const;
const SUB_FIGHT_PREFIXES = new Set<(typeof SUB_PREFIXES)[number]>([
  'Couple',
  'Friend',
  'Lover',
  'OnesideLove',
]);

const PLACEHOLDER_TEXTS = new Set(['', '*', '-', '--', '---', 'Not used']);

function loadFiltered(path: string): Map<string, string> {
  return loadMsbt(path, {
    required: true,
    transform: (raw) => raw.replace(/<[^>]+>/g, '').trim(),
    accept: (text) => !PLACEHOLDER_TEXTS.has(text),
  });
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type LocalizedMap = Record<string, Partial<Record<GameLocale, string>>>;

function transposeByValue(
  values: readonly string[],
  fromLocale: (code: GameLocale) => Record<string, string>,
): LocalizedMap {
  const out: LocalizedMap = {};
  for (const v of values) out[v] = {};
  for (const code of GAME_LOCALES) {
    const local = fromLocale(code);
    for (const v of values) {
      if (local[v] != null) out[v][code] = local[v];
    }
  }
  return out;
}

function collectPronouns(code: GameLocale): Record<string, string> {
  const msbt = loadFiltered(localeLayoutMsg(code, 'MiiTouch_Pronoun_00'));
  const out: Record<string, string> = {};
  for (let i = 0; i < PRONOUN_VALUES.length; i++) {
    const t = msbt.get(`Pronoun_0${i}`);
    if (t) out[PRONOUN_VALUES[i]] = t;
  }
  return out;
}

function collectGenders(code: GameLocale): Record<string, string> {
  const msbt = loadFiltered(localeLayoutMsg(code, 'MiiEditor_Profile_00'));
  const out: Record<string, string> = {};
  for (let i = 0; i < GENDER_VALUES.length; i++) {
    const t = msbt.get(`T_MiiProfile_Gender_0${i}`);
    if (t) out[GENDER_VALUES[i]] = t;
  }
  out.Invalid = GENDER_INVALID[code];
  return out;
}

function collectRelationTypes(code: GameLocale): Record<string, string> {
  const msbt = loadFiltered(localeReplaceMsg(code, 'Relation'));
  const out: Record<string, string> = {};
  for (const key of RELATION_TYPE_KEYS) {
    const t = msbt.get(key);
    if (t) out[key] = capitalizeFirst(t);
  }
  return out;
}

function collectSubRelations(code: GameLocale): Record<string, string> {
  const msbt = loadFiltered(localeReplaceMsg(code, 'RelationMeterRank'));
  const out: Record<string, string> = {};
  for (const prefix of SUB_PREFIXES) {
    for (let i = 0; i <= 6; i++) {
      const k = `${prefix}_${i}`;
      const t = msbt.get(k);
      if (t) out[k] = t;
    }
    if (SUB_FIGHT_PREFIXES.has(prefix)) {
      for (let i = 0; i <= 6; i++) {
        const k = `${prefix}_Fight_${i}`;
        const t = msbt.get(k);
        if (t) out[k] = t;
      }
    }
  }
  return out;
}

const allSubKeys: string[] = (() => {
  const keys: string[] = [];
  for (const prefix of SUB_PREFIXES) {
    for (let i = 0; i <= 6; i++) keys.push(`${prefix}_${i}`);
    if (SUB_FIGHT_PREFIXES.has(prefix)) {
      for (let i = 0; i <= 6; i++) keys.push(`${prefix}_Fight_${i}`);
    }
  }
  return keys;
})();

const result = {
  pronouns: transposeByValue(PRONOUN_VALUES, collectPronouns),
  genders: transposeByValue([...GENDER_VALUES, 'Invalid'], collectGenders),
  relationTypes: transposeByValue(RELATION_TYPE_KEYS, collectRelationTypes),
  subRelations: transposeByValue(allSubKeys, collectSubRelations),
};

writeMinifiedJson(OUT, result);
console.log(
  `wrote ${OUT} (${GAME_LOCALES.length} locales, ${
    Object.keys(result.pronouns).length
  } pronouns, ${Object.keys(result.genders).length} genders, ${
    Object.keys(result.relationTypes).length
  } relation types, ${Object.keys(result.subRelations).length} sub-relations)`,
);
