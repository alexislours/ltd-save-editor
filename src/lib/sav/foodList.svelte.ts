import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';

export type Food = {
  hash: number;
  name: string;
  textureId: number;
  id: number;
  localized: Partial<Record<GameLocale, string>>;
};

const BY_HASH = new SvelteMap<number, Food>();
const BY_ID = new SvelteMap<number, Food>();
const ALL = $state<{ list: Food[] }>({ list: [] });
let started = false;

type RawFood = {
  h: number;
  n: string;
  t: number;
  i?: number;
  l: Partial<Record<GameLocale, string>>;
};

export function loadFoodList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}foods.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawFood[];
      const list: Food[] = [];
      for (const r of raw) {
        const food: Food = {
          hash: r.h >>> 0,
          name: r.n,
          textureId: r.t,
          id: typeof r.i === 'number' ? r.i : -1,
          localized: r.l ?? {},
        };
        BY_HASH.set(food.hash, food);
        if (food.id >= 0) BY_ID.set(food.id, food);
        list.push(food);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[foodList] failed to load /foods.json:', err);
    }
  })();
}

export function foodByHash(hash: number): Food | null {
  return BY_HASH.get(hash >>> 0) ?? null;
}

export function foodById(id: number): Food | null {
  return BY_ID.get(id) ?? null;
}

export function allFoods(): Food[] {
  return ALL.list;
}

export function foodLabel(food: Food, uiLocale: string | null | undefined): string {
  return pickLocalized(food.localized, uiLocale) ?? food.name;
}

export function foodImageUrl(textureId: number | null | undefined): string | null {
  if (textureId == null || !Number.isFinite(textureId)) return null;
  return `${import.meta.env.BASE_URL}food-icons/Food${textureId}.webp`;
}
