import type { Food } from '$lib/sav/lists/foodList.svelte';

export type FoodOverrides = {
  ultraBest: number;
  best: number;
  worst: number;
  ultraWorst: number;
};

export type RatingTier = {
  key:
    | 'ultra_worst'
    | 'worst'
    | 'very_bad'
    | 'bad'
    | 'normal'
    | 'good'
    | 'very_good'
    | 'best'
    | 'ultra_best';
  badgeClass: string;
  marker: string;
  override: boolean;
};

export const RATING_TIERS: RatingTier[] = [
  { key: 'ultra_worst', badgeClass: 'bg-red-600 text-white', marker: '★', override: true },
  { key: 'worst', badgeClass: 'bg-red-500 text-white', marker: '', override: true },
  { key: 'very_bad', badgeClass: 'bg-orange-500 text-white', marker: '', override: false },
  { key: 'bad', badgeClass: 'bg-amber-400 text-amber-950', marker: '', override: false },
  {
    key: 'normal',
    badgeClass: 'bg-surface-sunken text-content-strong ring-1 ring-edge/50',
    marker: '',
    override: false,
  },
  { key: 'good', badgeClass: 'bg-lime-400 text-lime-950', marker: '', override: false },
  { key: 'very_good', badgeClass: 'bg-green-500 text-white', marker: '', override: false },
  { key: 'best', badgeClass: 'bg-emerald-500 text-white', marker: '', override: true },
  { key: 'ultra_best', badgeClass: 'bg-emerald-600 text-white', marker: '★', override: true },
];

export const TIER_TABLE = [0, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 8];
const VARY = 3;

const ORDINARY_MIN = 2;
const ORDINARY_MAX = 17;
export const REACTION_MAX = 19;

function clampTasteType(value: number): number {
  return Number.isInteger(value) && value >= 0 && value < 4 ? value : 0;
}

export function miiTasteSeed(charInfoEx: Uint8Array | null | undefined): number {
  if (!charInfoEx || charInfoEx.byteLength < 4) return 0;
  return ((charInfoEx[2] << 8) | charInfoEx[3]) >>> 0;
}

export function foodReactionValue(
  food: Food,
  tasteType: number,
  miiSeed: number,
  overrides: FoodOverrides,
): number {
  const hash = food.hash >>> 0;
  if (overrides.ultraBest && hash === overrides.ultraBest) return 19;
  if (overrides.best && hash === overrides.best) return 18;
  if (overrides.ultraWorst && hash === overrides.ultraWorst) return 0;
  if (overrides.worst && hash === overrides.worst) return 1;
  const ordinal = food.taste[clampTasteType(tasteType)] ?? 6;
  const jitter = (((miiSeed + hash) >>> 0) % 7) - VARY;
  let value = ordinal + 2 + jitter;
  if (value > ORDINARY_MAX) value = ORDINARY_MAX;
  if (value < ORDINARY_MIN) value = ORDINARY_MIN;
  return value;
}
