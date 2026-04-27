import { SvelteMap } from 'svelte/reactivity';
import { type GameLocale, pickLocalized } from './gameLocale';

export type TroubleTargetKey =
  | 'targetMii'
  | 'targetItemType'
  | 'targetFood'
  | 'targetGoods'
  | 'targetCloth'
  | 'targetCoordinate'
  | 'targetUgcFood'
  | 'targetUgcGoods'
  | 'targetUgcText'
  | 'targetMapObject'
  | 'targetPreset';

export type TroubleFlag = 'isLove' | 'isConfession' | 'isFightReconcile' | 'isTargetMiiSetLater';

export type Trouble = {
  hash: number;
  name: string;
  category: string;
  generateRate: number;
  methodKey: string;
  relevantTargets: TroubleTargetKey[] | null;
  localized: Partial<Record<GameLocale, string>>;
  targetMiiNum: number;
  endMinute: number;
  nextTimeMinute: number;
  rescueDay: number;
  enableIntroductionId: string | null;
  foodAttr: string | null;
  goodsAttr: string | null;
  clothType: string | null;
  clothEventType: string | null;
  clothSeasonType: string | null;
  islandEditType: string | null;
  islandEditMapObjCategory: string | null;
  islandEditPrices: number[];
  islandEditLabel: string | null;
  boostType: string | null;
  feelingType: string | null;
  fightFlagType: string | null;
  priority: string | null;
  rescuePriority: string | null;
  balloonType: string | null;
  flags: readonly TroubleFlag[];
};

const BY_HASH = new SvelteMap<number, Trouble>();
const ALL = $state<{ list: Trouble[] }>({ list: [] });
let started = false;

type RawTrouble = {
  h: number;
  n: string;
  c: string;
  g: number;
  k: string;
  r: TroubleTargetKey[] | null;
  l: Partial<Record<GameLocale, string>>;
  mn: number;
  em: number;
  nm: number;
  rd: number;
  ei: string | null;
  fa: string | null;
  ga: string | null;
  ct: string | null;
  cet: string | null;
  cst: string | null;
  iet: string | null;
  iemc: string | null;
  iel: string | null;
  ipa: number[];
  bt: string | null;
  ft: string | null;
  fft: string | null;
  pr: string | null;
  rp: string | null;
  bal: string | null;
  flags: TroubleFlag[];
};

export function loadTroubleList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}troubles.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawTrouble[];
      const list: Trouble[] = [];
      for (const r of raw) {
        const trouble: Trouble = {
          hash: r.h >>> 0,
          name: r.n,
          category: r.c,
          generateRate: r.g | 0,
          methodKey: r.k,
          relevantTargets: r.r ?? null,
          localized: r.l ?? {},
          targetMiiNum: r.mn | 0,
          endMinute: r.em | 0,
          nextTimeMinute: r.nm | 0,
          rescueDay: r.rd | 0,
          enableIntroductionId: r.ei ?? null,
          foodAttr: r.fa ?? null,
          goodsAttr: r.ga ?? null,
          clothType: r.ct ?? null,
          clothEventType: r.cet ?? null,
          clothSeasonType: r.cst ?? null,
          islandEditType: r.iet ?? null,
          islandEditMapObjCategory: r.iemc ?? null,
          islandEditPrices: Array.isArray(r.ipa) ? r.ipa : [],
          islandEditLabel: r.iel ?? null,
          boostType: r.bt ?? null,
          feelingType: r.ft ?? null,
          fightFlagType: r.fft ?? null,
          priority: r.pr ?? null,
          rescuePriority: r.rp ?? null,
          balloonType: r.bal ?? null,
          flags: r.flags ?? [],
        };
        BY_HASH.set(trouble.hash, trouble);
        list.push(trouble);
      }
      ALL.list = list;
    } catch (err) {
      console.warn('[troubleList] failed to load /troubles.json:', err);
    }
  })();
}

export function troubleByHash(hash: number): Trouble | null {
  return BY_HASH.get(hash >>> 0) ?? null;
}

export function allTroubles(): Trouble[] {
  return ALL.list;
}

export function troublePreview(t: Trouble, uiLocale: string | null | undefined): string | null {
  return pickLocalized(t.localized, uiLocale) ?? null;
}
