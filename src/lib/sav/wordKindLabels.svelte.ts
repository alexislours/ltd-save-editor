import { type GameLocale, pickLocalized } from './gameLocale';

type RawData = {
  names: string[];
  labels: Partial<Record<GameLocale, Record<string, string>>>;
};

const STATE = $state<{ names: string[]; labels: RawData['labels'] }>({
  names: [],
  labels: {},
});
let started = false;

export function loadWordKindLabels(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}word-kinds.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as RawData;
      STATE.names = raw.names;
      STATE.labels = raw.labels;
    } catch (err) {
      console.warn('[wordKindLabels] failed to load /word-kinds.json:', err);
    }
  })();
}

export function wordKindNames(): string[] {
  return STATE.names;
}

export function wordKindLabel(name: string, uiLocale: string | null | undefined): string {
  const perLocale: Partial<Record<GameLocale, string>> = {};
  for (const loc of Object.keys(STATE.labels) as GameLocale[]) {
    const map = STATE.labels[loc];
    if (map && name in map) perLocale[loc] = map[name];
  }
  return pickLocalized(perLocale, uiLocale) ?? name;
}
