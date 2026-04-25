export const GAME_LOCALES = [
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

export type GameLocale = (typeof GAME_LOCALES)[number];

const GAME_LOCALE_SET = new Set<string>(GAME_LOCALES);
export function isGameLocale(value: string): value is GameLocale {
  return GAME_LOCALE_SET.has(value);
}

export const DEFAULT_GAME_LOCALE: GameLocale = 'USen';

export const UI_TO_GAME_LOCALE: Record<string, GameLocale> = {
  'en-US': 'USen',
  'en-GB': 'EUen',
  'fr-EU': 'EUfr',
  'fr-FR': 'EUfr',
  'fr-CA': 'USfr',
  'de-DE': 'EUde',
  'es-ES': 'EUes',
  'es-MX': 'USes',
  'es-US': 'USes',
  'it-IT': 'EUit',
  'nl-NL': 'EUnl',
  'ja-JP': 'JPja',
  'ko-KR': 'KRko',
  'zh-CN': 'CNzh',
  'zh-Hans': 'CNzh',
  'zh-TW': 'TWzh',
  'zh-Hant': 'TWzh',
};

export const LANG_TO_GAME_LOCALE: Record<string, GameLocale> = {
  en: 'USen',
  fr: 'EUfr',
  de: 'EUde',
  es: 'EUes',
  it: 'EUit',
  nl: 'EUnl',
  ja: 'JPja',
  ko: 'KRko',
  zh: 'CNzh',
};

export function gameLocaleFor(uiLocale: string | null | undefined): GameLocale {
  if (!uiLocale) return DEFAULT_GAME_LOCALE;
  if (UI_TO_GAME_LOCALE[uiLocale]) return UI_TO_GAME_LOCALE[uiLocale];
  const lang = uiLocale.toLowerCase().split(/[-_]/)[0];
  return LANG_TO_GAME_LOCALE[lang] ?? DEFAULT_GAME_LOCALE;
}

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
