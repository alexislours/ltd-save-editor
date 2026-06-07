import { t } from '$lib/i18n/format';
import { ShareMiiError } from '@alexislours/ltd-sharemii';

export function errorMessage(e: unknown): string {
  if (e instanceof ShareMiiError) {
    return t(`sharemii.error.${e.code}`, { values: e.params });
  }
  return e instanceof Error ? e.message : String(e);
}
