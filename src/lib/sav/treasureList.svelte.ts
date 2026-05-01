import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';
import { murmur3_x86_32 } from './hash';

export type TreasureType = 'Treasure' | 'Levelup' | '';

export type Treasure = {
  name: string;
  nameHash: number;
  icon: string;
  type: TreasureType;
  stateHash: number;
  ownNumHash: number;
  localized: Partial<Record<GameLocale, string>>;
};

const BY_NAME = new SvelteMap<string, Treasure>();
const BY_NAME_HASH = new SvelteMap<number, Treasure>();
const ALL = $state<{ list: Treasure[] }>({ list: [] });
let started = false;

type RawTreasure = {
  n: string;
  icon: string;
  t?: TreasureType;
  l: Partial<Record<GameLocale, string>>;
};

export function loadTreasureList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}treasures.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawTreasure[];
      const list: Treasure[] = [];
      for (const r of raw) {
        const treasure: Treasure = {
          name: r.n,
          nameHash: murmur3_x86_32(r.n) >>> 0,
          icon: r.icon,
          type: r.t ?? '',
          stateHash: murmur3_x86_32(`Player.GoodsInfo2.${r.n}.State`) >>> 0,
          ownNumHash: murmur3_x86_32(`Player.GoodsInfo2.${r.n}.OwnNum`) >>> 0,
          localized: r.l ?? {},
        };
        BY_NAME.set(treasure.name, treasure);
        BY_NAME_HASH.set(treasure.nameHash, treasure);
        list.push(treasure);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[treasureList] failed to load /treasures.json:', err);
    }
  })();
}

export function treasureByName(name: string): Treasure | null {
  return BY_NAME.get(name) ?? null;
}

export function treasureByNameHash(hash: number): Treasure | null {
  return BY_NAME_HASH.get(hash >>> 0) ?? null;
}

export function allTreasures(): Treasure[] {
  return ALL.list;
}

export function treasureLabel(t: Treasure, uiLocale: string | null | undefined): string {
  return pickLocalized(t.localized, uiLocale) ?? t.name;
}

export function treasureImageUrl(t: Treasure): string {
  return `${import.meta.env.BASE_URL}treasure-icons/${t.icon}.webp`;
}
