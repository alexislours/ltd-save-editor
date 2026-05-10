import { existsSync, readFileSync } from 'node:fs';

import { GAME_LOCALES, localeReplaceMsg, type GameLocale } from './config.ts';

type MsbtEntry = { text?: unknown };
type MsbtFile = Record<string, MsbtEntry>;

export type MsbtOptions = {
  transform?: (raw: string, key: string) => string;
  accept?: (text: string, key: string) => boolean;
  keyTransform?: (key: string) => string | null;
  required?: boolean;
};

function stripMarkup(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim();
}

export function readMsbtRaw(path: string, required = false): MsbtFile | null {
  if (!existsSync(path)) {
    if (required) throw new Error(`msbt file missing: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf8')) as MsbtFile;
}

export function loadMsbt(path: string, options: MsbtOptions = {}): Map<string, string> {
  const data = readMsbtRaw(path, options.required ?? false);
  const out = new Map<string, string>();
  if (!data) return out;
  const transform = options.transform ?? stripMarkup;
  const { accept, keyTransform } = options;
  for (const [rawKey, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object' || typeof entry.text !== 'string') continue;
    const key = keyTransform ? keyTransform(rawKey) : rawKey;
    if (key == null) continue;
    const text = transform(entry.text, key);
    if (accept && !accept(text, key)) continue;
    out.set(key, text);
  }
  return out;
}

export type LocaleMaps = Partial<Record<GameLocale, Map<string, string>>>;

export type LoadLocaleMapsOptions = MsbtOptions & {
  warnEmpty?: boolean;
  warnLabel?: string;
  warnOnError?: boolean;
};

export function loadLocaleMaps(
  file: string | string[],
  options: LoadLocaleMapsOptions = {},
): LocaleMaps {
  const files = Array.isArray(file) ? file : [file];
  const label = options.warnLabel ?? files.join(',');
  const out: LocaleMaps = {};
  for (const code of GAME_LOCALES) {
    const merged = new Map<string, string>();
    let failed = false;
    for (const f of files) {
      try {
        const m = loadMsbt(localeReplaceMsg(code, f), options);
        for (const [k, v] of m) merged.set(k, v);
      } catch (err) {
        failed = true;
        if (!options.warnOnError) throw err;
        console.warn(
          `[${code}] ${label} skipped (${err instanceof Error ? err.message : String(err)})`,
        );
      }
    }
    if (failed && options.warnOnError) continue;
    if (merged.size === 0 && options.warnEmpty) console.warn(`[${code}] no ${label} found`);
    out[code] = merged;
  }
  return out;
}
