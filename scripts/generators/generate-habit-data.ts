import { GAME_LOCALES, rsdb, staticOut, type GameLocale } from '../lib/config.ts';
import { loadLocaleMaps } from '../lib/msbt.ts';
import { writeMinifiedJson } from '../lib/output.ts';
import { loadSequence } from '../lib/yaml.ts';

const HABIT_PARAM = rsdb('HabitParam');
const OUT = staticOut('habits.json');

const params = loadSequence(HABIT_PARAM);

const names = loadLocaleMaps('Habit_Name', { warnOnError: true, warnLabel: 'name' });
const captions = loadLocaleMaps('Habit_Caption', { warnOnError: true, warnLabel: 'caption' });

type Habit = {
  n: string;
  c: string;
  s: number;
  l: Partial<Record<GameLocale, string>>;
  cap: Partial<Record<GameLocale, string>>;
};

const seen = new Set<string>();
const result: Habit[] = [];
for (const p of params) {
  const name = p.str('Name');
  if (!name || seen.has(name)) continue;
  seen.add(name);
  const category = p.enumLabel('ExcludeGroup') ?? 'OtherType';
  const sortKey = p.num('SortKey') ?? 0;

  const localized: Partial<Record<GameLocale, string>> = {};
  const cap: Partial<Record<GameLocale, string>> = {};
  for (const code of GAME_LOCALES) {
    const text = names[code]?.get(name);
    if (text) localized[code] = text;
    const capText = captions[code]?.get(`Caption_${name}`);
    if (capText) cap[code] = capText;
  }

  result.push({ n: name, c: category, s: sortKey, l: localized, cap });
}

result.sort((a, b) => {
  if (a.c !== b.c) return a.c < b.c ? -1 : 1;
  if (a.s !== b.s) return a.s - b.s;
  return a.n < b.n ? -1 : a.n > b.n ? 1 : 0;
});

writeMinifiedJson(OUT, result);
console.log(`Wrote ${result.length} habits to ${OUT}`);
