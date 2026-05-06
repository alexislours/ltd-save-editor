import { type GameLocale, pickLocalized } from '$lib/sav/gameLocale';

type LocalizedString = Partial<Record<GameLocale, string>>;

type MiiLabels = {
  pronouns: Record<string, LocalizedString>;
  genders: Record<string, LocalizedString>;
  relationTypes: Record<string, LocalizedString>;
  subRelations: Record<string, LocalizedString>;
};

const EMPTY: MiiLabels = { pronouns: {}, genders: {}, relationTypes: {}, subRelations: {} };

const STATE = $state<{ labels: MiiLabels }>({ labels: EMPTY });
let started = false;

export function loadMiiLabels(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}mii-labels.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      STATE.labels = (await res.json()) as MiiLabels;
    } catch (err) {
      console.warn('[miiLabelList] failed to load /mii-labels.json:', err);
    }
  })();
}

function lookup(
  table: Record<string, LocalizedString>,
  value: string,
  uiLocale: string | null | undefined,
): string | null {
  return pickLocalized(table[value], uiLocale) ?? null;
}

export function pronounLabel(value: string, uiLocale: string | null | undefined): string | null {
  return lookup(STATE.labels.pronouns, value, uiLocale);
}

export function genderLabel(value: string, uiLocale: string | null | undefined): string | null {
  return lookup(STATE.labels.genders, value, uiLocale);
}

export function relationTypeLabel(
  value: string,
  uiLocale: string | null | undefined,
): string | null {
  if (value.startsWith('0x')) return null;
  return lookup(STATE.labels.relationTypes, value, uiLocale);
}

export function localizeRelationType(value: string, uiLocale: string | null | undefined): string {
  return relationTypeLabel(value, uiLocale) ?? value;
}

export function subRelationLabel(
  value: string,
  uiLocale: string | null | undefined,
): string | null {
  return lookup(STATE.labels.subRelations, value, uiLocale);
}
