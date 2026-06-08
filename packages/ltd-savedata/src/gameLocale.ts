const GAME_LOCALES = [
  'CNzh',
  'EUde',
  'EUen',
  'EUes',
  'EUfr',
  'EUit',
  'EUnl',
  'JPja',
  'KRko',
  'TWzh',
  'USen',
  'USes',
  'USfr',
] as const;

/** One of the game's internal locale codes (region prefix plus language, e.g. `'USen'`, `'JPja'`). */
export type GameLocale = (typeof GAME_LOCALES)[number];

const DEFAULT_GAME_LOCALE: GameLocale = 'USen';

const UI_TO_GAME_LOCALE: Record<string, GameLocale> = {
  'de-EU': 'EUde',
  'en-EU': 'EUen',
  'en-US': 'USen',
  'es-EU': 'EUes',
  'es-US': 'USes',
  'fr-EU': 'EUfr',
  'fr-US': 'USfr',
  'it-EU': 'EUit',
  'ja-JP': 'JPja',
  'ko-KR': 'KRko',
  'nl-EU': 'EUnl',
  'zh-CN': 'CNzh',
  'zh-TW': 'TWzh',
};

/** Map a BCP-47-style UI locale (e.g. `'fr-EU'`) to its {@link GameLocale}, defaulting to `'USen'`. */
export function gameLocaleFor(uiLocale: string | null | undefined): GameLocale {
  if (!uiLocale) return DEFAULT_GAME_LOCALE;
  return UI_TO_GAME_LOCALE[uiLocale] ?? DEFAULT_GAME_LOCALE;
}

/**
 * Pick the value for a UI locale from a per-{@link GameLocale} map, falling back
 * to the `'USen'` entry and then to any present entry.
 */
export function pickLocalized<T>(
  map: Partial<Record<GameLocale, T>> | null | undefined,
  uiLocale: string | null | undefined,
): T | undefined {
  if (!map) return undefined;
  const target = gameLocaleFor(uiLocale);
  if (map[target] != null) return map[target];
  if (map[DEFAULT_GAME_LOCALE] != null) return map[DEFAULT_GAME_LOCALE];
  for (const code of GAME_LOCALES) {
    const v = map[code];
    if (v != null) return v;
  }
  return undefined;
}
