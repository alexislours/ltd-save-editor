import { format } from 'svelte-i18n';
import { get } from 'svelte/store';
import { ShareMiiError } from './shareMii/errors';

export function errorMessage(e: unknown): string {
  if (e instanceof ShareMiiError) {
    return get(format)(`sharemii.error.${e.code}`, { values: e.params });
  }
  return e instanceof Error ? e.message : String(e);
}
