import { type GameLocale, pickLocalized } from '$lib/sav/gameLocale';

type WishCategory =
  | 'Facility'
  | 'Goods'
  | 'StyleGroup'
  | 'Travel'
  | 'HabitGroup'
  | 'Service'
  | 'Object'
  | 'Ground'
  | 'Ugc'
  | 'Unknown';

type WishSeason =
  | 'Spring'
  | 'Summer'
  | 'Autumn'
  | 'Winter'
  | 'Christmas'
  | 'Halloween'
  | 'AutumnWinter';

export type Wish = {
  name: string;
  hash: number;
  category: WishCategory;
  sortIndex: number;
  localized: Partial<Record<GameLocale, string>>;
  jp: string | null;
  fountainLevel: number | null;
  liftComeTrueCount: number | null;
  liftSeason: WishSeason | null;
  isAutoComeTrue: boolean;
  isAutoOwn: boolean;
};

const ALL = $state<{ list: Wish[] }>({ list: [] });
let started = false;

type RawWish = {
  n: string;
  h: number;
  c: WishCategory;
  s: number;
  l?: Partial<Record<GameLocale, string>>;
  jp?: string;
  lv?: number;
  lct?: number;
  ls?: WishSeason;
  ac?: boolean;
  ao?: boolean;
};

export function loadWishList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}wishes.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawWish[];
      ALL.list = raw.map((r) => ({
        name: r.n,
        hash: r.h >>> 0,
        category: r.c,
        sortIndex: r.s | 0,
        localized: r.l ?? {},
        jp: r.jp ?? null,
        fountainLevel: r.lv ?? null,
        liftComeTrueCount: r.lct ?? null,
        liftSeason: r.ls ?? null,
        isAutoComeTrue: r.ac === true,
        isAutoOwn: r.ao === true,
      }));
    } catch (err) {
      console.warn('[wishList] failed to load /wishes.json:', err);
    }
  })();
}

export function allWishes(): Wish[] {
  return ALL.list;
}

export function wishLabel(wish: Wish, uiLocale: string | null | undefined): string {
  return pickLocalized(wish.localized, uiLocale) ?? humanize(wish.name);
}

function humanize(internalName: string): string {
  return internalName.replace(/_/g, ' ');
}
