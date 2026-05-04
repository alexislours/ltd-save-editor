import { SvelteMap } from 'svelte/reactivity';

const NAMES = new SvelteMap<number, string>();
let started = false;

export function loadHashList(): void {
  if (started) return;
  started = true;
  void (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}GameData.txt`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      for (const raw of text.split('\n')) {
        const line = raw.replace(/\r$/, '');
        if (!line || line[0] === '#') continue;
        const comma = line.indexOf(',');
        if (comma < 0) continue;
        const hash = Number.parseInt(line.slice(0, comma), 16) >>> 0;
        if (!Number.isFinite(hash)) continue;
        NAMES.set(hash, line.slice(comma + 1));
      }
    } catch (err) {
      console.warn('[hashList] failed to load /GameData.txt:', err);
    }
  })();
}

export function fetchedNameForHash(hash: number): string | null {
  return NAMES.get(hash) ?? null;
}
