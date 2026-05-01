import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';

export type CoordinateSlots = {
  Tops: number;
  Topslong: number;
  BottomsA: number;
  BottomsB: number;
  Shoes: number;
  Headwear: number;
  Accessory: number;
  All: number;
};

export type Coordinate = {
  name: string;
  keyHash: number;
  saveIndex: number;
  category: string;
  gender: string;
  isKids: boolean;
  isSwimwear: boolean;
  colorCount: number;
  pieces: CoordinateSlots;
  topsIn: boolean;
  localized: Partial<Record<GameLocale, string>>;
};

export const COORD_COLOR_SLOTS = 16;

const BY_KEY = new SvelteMap<number, Coordinate>();
const ALL = $state<{ list: Coordinate[] }>({ list: [] });
let started = false;

type RawCoordinate = {
  n: string;
  k: number;
  s: number;
  cat: string;
  g: string;
  ki: boolean;
  sw: boolean;
  cc: number;
  pc: CoordinateSlots;
  ti: boolean;
  l: Partial<Record<GameLocale, string>>;
};

export function loadCoordinateList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}coordinates.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawCoordinate[];
      const list: Coordinate[] = [];
      for (const r of raw) {
        const coord: Coordinate = {
          name: r.n,
          keyHash: r.k >>> 0,
          saveIndex: r.s | 0,
          category: r.cat,
          gender: r.g,
          isKids: !!r.ki,
          isSwimwear: !!r.sw,
          colorCount: Math.max(1, r.cc | 0),
          pieces: r.pc,
          topsIn: !!r.ti,
          localized: r.l ?? {},
        };
        BY_KEY.set(coord.keyHash, coord);
        list.push(coord);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[coordinateList] failed to load /coordinates.json:', err);
    }
  })();
}

export function coordinateByKey(keyHash: number): Coordinate | null {
  return BY_KEY.get(keyHash >>> 0) ?? null;
}

export function coordinateBySaveIndex(saveIndex: number): Coordinate | null {
  for (const c of ALL.list) {
    if (c.saveIndex === saveIndex) return c;
  }
  return null;
}

export function allCoordinates(): Coordinate[] {
  return ALL.list;
}

export function coordinateLabel(c: Coordinate, uiLocale: string | null | undefined): string {
  return pickLocalized(c.localized, uiLocale) ?? c.name;
}

export function coordinateImageUrl(c: Coordinate, colorIndex = 0): string {
  const i = Math.max(0, Math.min(c.colorCount - 1, colorIndex | 0));
  const id = c.name.replace(/^Coordinate/, '');
  const suffix = String(i).padStart(2, '0');
  return `${import.meta.env.BASE_URL}coordinate-icons/Coordinate${id}_${suffix}.webp`;
}
