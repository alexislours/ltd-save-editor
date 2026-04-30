import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';
import { murmur3_x86_32 } from './hash';

export type HabitCategory =
  | 'EatType'
  | 'ExpressionType'
  | 'GetAngryType'
  | 'GreetingType'
  | 'OtherType'
  | 'StandType'
  | 'StomachType'
  | 'VoiceType'
  | 'WalkType';

export type Habit = {
  name: string;
  category: HabitCategory;
  sortKey: number;
  isOwnHash: number;
  isCheckedHash: number;
  stateHash: number;
  localized: Partial<Record<GameLocale, string>>;
  caption: Partial<Record<GameLocale, string>>;
};

const BY_NAME = new SvelteMap<string, Habit>();
const ALL = $state<{ list: Habit[] }>({ list: [] });
let started = false;

type RawHabit = {
  n: string;
  c: HabitCategory;
  s: number;
  l: Partial<Record<GameLocale, string>>;
  cap: Partial<Record<GameLocale, string>>;
};

export function loadHabitList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}habits.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawHabit[];
      const list: Habit[] = [];
      for (const r of raw) {
        const habit: Habit = {
          name: r.n,
          category: r.c,
          sortKey: r.s | 0,
          isOwnHash: murmur3_x86_32(`Mii.Belongings.HabitOwnInfo.${r.n}.IsOwn`) >>> 0,
          isCheckedHash: murmur3_x86_32(`Mii.Belongings.HabitOwnInfo.${r.n}.IsChecked`) >>> 0,
          stateHash: murmur3_x86_32(`Mii.Belongings.HabitOwnInfo.${r.n}.State`) >>> 0,
          localized: r.l ?? {},
          caption: r.cap ?? {},
        };
        BY_NAME.set(habit.name, habit);
        list.push(habit);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[habitList] failed to load /habits.json:', err);
    }
  })();
}

export function habitByName(name: string): Habit | null {
  return BY_NAME.get(name) ?? null;
}

export function allHabits(): Habit[] {
  return ALL.list;
}

export function habitLabel(h: Habit, uiLocale: string | null | undefined): string {
  return pickLocalized(h.localized, uiLocale) ?? h.name;
}

export function habitCaption(h: Habit, uiLocale: string | null | undefined): string | null {
  return pickLocalized(h.caption, uiLocale) ?? null;
}

export const HABIT_STATE_NEVER_OWNED = murmur3_x86_32('NeverOwned') >>> 0;
export const HABIT_STATE_UNOWN = murmur3_x86_32('Unown') >>> 0;
export const HABIT_STATE_OWN = murmur3_x86_32('Own') >>> 0;

export type HabitStateValue = 'NeverOwned' | 'Unown' | 'Own';

export function habitStateFromHash(hash: number): HabitStateValue {
  const v = hash >>> 0;
  if (v === HABIT_STATE_OWN) return 'Own';
  if (v === HABIT_STATE_UNOWN) return 'Unown';
  return 'NeverOwned';
}

export function habitStateToHash(state: HabitStateValue): number {
  if (state === 'Own') return HABIT_STATE_OWN;
  if (state === 'Unown') return HABIT_STATE_UNOWN;
  return HABIT_STATE_NEVER_OWNED;
}
