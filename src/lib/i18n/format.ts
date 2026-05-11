import { format } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { I18nKey } from '$gen/i18n-keys';

type FormatValues = Record<string, string | number | boolean | Date | null>;

export type Translator = <K extends I18nKey>(key: K, opts?: { values?: FormatValues }) => string;

export const t: Translator = (key, opts) => get(format)(key, opts);
