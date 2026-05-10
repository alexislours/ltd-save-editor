import { GAME_LOCALES, localeReplaceMsg, staticOut, type GameLocale } from '../lib/config.ts';
import { readMsbtRaw } from '../lib/msbt.ts';
import { writePrettyJson } from '../lib/output.ts';

const OUT = staticOut('word-kinds.json');

const KEYS = [
  'TalkStart',
  'TalkEnd',
  'Phrase',
  'Happy',
  'Sad',
  'Angry',
  'Greeting',
  'TalkInSleep',
  'ShoutToSea',
  'BeforeEat',
] as const;

function clean(raw: string): string {
  return raw
    .replaceAll(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const labels: Partial<Record<GameLocale, Record<string, string>>> = {};
for (const loc of GAME_LOCALES) {
  const json = readMsbtRaw(localeReplaceMsg(loc, 'MiiWordKind'), true)!;
  const map: Record<string, string> = {};
  for (const k of KEYS) {
    const entry = json[k];
    if (!entry || typeof entry.text !== 'string') {
      throw new Error(`missing ${loc}/${k}`);
    }
    map[k] = clean(entry.text);
  }
  labels[loc] = map;
}

writePrettyJson(OUT, { names: KEYS, labels });
console.log(`wrote ${OUT}: ${KEYS.length} kinds x ${GAME_LOCALES.length} locales`);
