import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';

export type Cloth = {
  index: number;
  name: string;
  colorCount: number;
  localized: Partial<Record<GameLocale, string>>;
};

export const CLOTH_COLOR_SLOTS = 16;

const BY_INDEX = new SvelteMap<number, Cloth>();
const ALL = $state<{ list: Cloth[] }>({ list: [] });
let started = false;

type RawCloth = {
  i: number;
  n: string;
  c: number;
  l: Partial<Record<GameLocale, string>>;
};

export function loadClothList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}clothes.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawCloth[];
      const list: Cloth[] = [];
      for (const r of raw) {
        const cloth: Cloth = {
          index: r.i,
          name: r.n,
          colorCount: Math.max(1, r.c | 0),
          localized: r.l ?? {},
        };
        BY_INDEX.set(cloth.index, cloth);
        list.push(cloth);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[clothList] failed to load /clothes.json:', err);
    }
  })();
}

export function clothByIndex(index: number): Cloth | null {
  return BY_INDEX.get(index) ?? null;
}

export function allCloths(): Cloth[] {
  return ALL.list;
}

export function clothLabel(cloth: Cloth, uiLocale: string | null | undefined): string {
  return pickLocalized(cloth.localized, uiLocale) ?? cloth.name;
}

export function clothImageUrl(cloth: Cloth, colorIndex = 0): string {
  const i = Math.max(0, Math.min(cloth.colorCount - 1, colorIndex | 0));
  const suffix = String(i).padStart(2, '0');
  return `${import.meta.env.BASE_URL}cloth-icons/${cloth.name}_${suffix}.webp`;
}
