import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';
import { murmur3_x86_32 } from './hash';

export type RoomStyleVariant = {
  name: string;
  variantIndex: number;
  stateHash: number;
  ownNumHash: number;
};

export type RoomStyleGroup = {
  groupKey: string;
  variants: RoomStyleVariant[];
  localized: Partial<Record<GameLocale, string>>;
};

const BY_GROUP = new SvelteMap<string, RoomStyleGroup>();
const ALL = $state<{ list: RoomStyleGroup[] }>({ list: [] });
let started = false;

type RawVariant = { n: string; i: number };
type RawGroup = {
  g: string;
  l: Partial<Record<GameLocale, string>>;
  v: RawVariant[];
};

export function loadRoomStyleList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}roomstyles.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawGroup[];
      const list: RoomStyleGroup[] = [];
      for (const r of raw) {
        const variants: RoomStyleVariant[] = r.v.map((v) => ({
          name: v.n,
          variantIndex: v.i,
          stateHash: murmur3_x86_32(`Player.InteriorRoomStyleInfo.${v.n}.State`) >>> 0,
          ownNumHash: murmur3_x86_32(`Player.InteriorRoomStyleInfo.${v.n}.OwnNum`) >>> 0,
        }));
        const group: RoomStyleGroup = {
          groupKey: r.g,
          variants,
          localized: r.l ?? {},
        };
        BY_GROUP.set(group.groupKey, group);
        list.push(group);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[roomStyleList] failed to load /roomstyles.json:', err);
    }
  })();
}

export function roomStyleGroupByKey(key: string): RoomStyleGroup | null {
  return BY_GROUP.get(key) ?? null;
}

export function allRoomStyleGroups(): RoomStyleGroup[] {
  return ALL.list;
}

export function roomStyleGroupLabel(
  group: RoomStyleGroup,
  uiLocale: string | null | undefined,
): string {
  return pickLocalized(group.localized, uiLocale) ?? group.groupKey;
}

export function roomStyleVariantImageUrl(variant: RoomStyleVariant): string {
  return `${import.meta.env.BASE_URL}roomstyle-icons/${variant.name}.webp`;
}
