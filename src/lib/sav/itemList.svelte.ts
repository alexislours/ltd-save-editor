import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';

export type ItemCategory = 'f' | 'm';

export type ItemVariant = {
  name: string;
  hash: number;
  color: string;
};

export type Item = {
  name: string;
  category: ItemCategory;
  price: number;
  variants: ItemVariant[];
  localized: Partial<Record<GameLocale, string>>;
};

const BY_NAME = new SvelteMap<string, Item>();
const ALL = $state<{ list: Item[] }>({ list: [] });
let started = false;

type RawVariant = { n: string; h: number; c: string };
type RawItem = {
  n: string;
  l: Partial<Record<GameLocale, string>>;
  v: RawVariant[];
  p?: number;
  t?: ItemCategory;
};

export function loadItemList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}items.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawItem[];
      const list: Item[] = [];
      for (const r of raw) {
        const item: Item = {
          name: r.n,
          category: r.t ?? 'm',
          price: r.p ?? 0,
          variants: r.v.map((v) => ({ name: v.n, hash: v.h >>> 0, color: v.c })),
          localized: r.l ?? {},
        };
        BY_NAME.set(item.name, item);
        list.push(item);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[itemList] failed to load /items.json:', err);
    }
  })();
}

export function allItems(): Item[] {
  return ALL.list;
}

export function itemByName(name: string): Item | null {
  return BY_NAME.get(name) ?? null;
}

export function itemLabel(item: Item, uiLocale: string | null | undefined): string {
  return pickLocalized(item.localized, uiLocale) ?? item.name;
}

export function itemVariantImageUrl(variant: ItemVariant): string {
  return `${import.meta.env.BASE_URL}item-icons/${variant.name}.webp`;
}
