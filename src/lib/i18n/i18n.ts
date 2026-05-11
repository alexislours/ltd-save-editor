import 'virtual:i18n/_shared';
import { init, getLocaleFromNavigator, locale } from 'svelte-i18n';
import { LOCALES as DISCOVERED } from 'virtual:i18n/_locales';

const FALLBACK_LOCALE = 'en-US';
const STORAGE_KEY = 'app-locale';

export const LOCALES: ReadonlyArray<string> = DISCOVERED;

if (!LOCALES.includes(FALLBACK_LOCALE)) {
  throw new Error(`messages/${FALLBACK_LOCALE}.json is required as the fallback locale`);
}

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
      // ignore
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
