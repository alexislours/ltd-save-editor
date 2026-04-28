import { addMessages, init, getLocaleFromNavigator, locale } from 'svelte-i18n';
import { get } from 'svelte/store';

type LocaleMessages = Parameters<typeof addMessages>[1];

const FALLBACK_LOCALE = 'en-US';
const STORAGE_KEY = 'app-locale';

const ALIASES: Record<string, string> = {
  'fr-US': 'fr-EU',
  'en-EU': 'en-US',
};

const modules = import.meta.glob<LocaleMessages>('../../messages/*.json', {
  eager: true,
  import: 'default',
});

const base = Object.entries(modules).map(([path, messages]) => {
  const tag = path
    .split('/')
    .pop()!
    .replace(/\.json$/, '');
  return [tag, messages] as const;
});

const baseByTag = new Map(base);
const aliased: ReadonlyArray<readonly [string, LocaleMessages]> = Object.entries(ALIASES).map(
  ([alias, target]) => {
    const messages = baseByTag.get(target);
    if (!messages) {
      throw new Error(`Alias ${alias} → ${target} cannot resolve: messages/${target}.json missing`);
    }
    if (baseByTag.has(alias)) {
      throw new Error(`Alias ${alias} conflicts with existing messages/${alias}.json`);
    }
    return [alias, messages] as const;
  },
);

const discovered = [...base, ...aliased].sort(([a], [b]) => {
  if (a === FALLBACK_LOCALE) return -1;
  if (b === FALLBACK_LOCALE) return 1;
  return a.localeCompare(b);
});

if (!discovered.some(([tag]) => tag === FALLBACK_LOCALE)) {
  throw new Error(`messages/${FALLBACK_LOCALE}.json is required as the fallback locale`);
}

for (const [tag, messages] of discovered) {
  addMessages(tag, messages);
}

export const LOCALES = discovered.map(([tag]) => tag);

export type AppLocale = string;

function isKnownLocale(value: string): boolean {
  return LOCALES.includes(value);
}

function pickInitial(): AppLocale {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isKnownLocale(stored)) return stored;
    } catch {
      // localStorage may be unavailable - fall through to navigator
    }
  }
  const nav = getLocaleFromNavigator();
  if (nav) {
    if (isKnownLocale(nav)) return nav;
    const primary = nav.toLowerCase().split(/[-_]/)[0];
    const match = LOCALES.find((tag) => tag.toLowerCase().split('-')[0] === primary);
    if (match) return match;
  }
  return FALLBACK_LOCALE;
}

init({
  fallbackLocale: FALLBACK_LOCALE,
  initialLocale: pickInitial(),
});

if (typeof window !== 'undefined') {
  locale.subscribe((value) => {
    if (!value) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  });
}

export function setAppLocale(loc: AppLocale): void {
  locale.set(loc);
}

export function getAppLocale(): AppLocale {
  return get(locale) ?? FALLBACK_LOCALE;
}
