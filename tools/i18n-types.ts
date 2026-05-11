import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type LocaleObject = { [key: string]: unknown };

export function flatten(obj: LocaleObject, prefix = '', out: string[] = []): string[] {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v))
      flatten(v as LocaleObject, path, out);
    else out.push(path);
  }
  return out;
}

export function listLocales(messagesDir: string): string[] {
  return readdirSync(messagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

export function loadLocale(messagesDir: string, tag: string): LocaleObject {
  const raw = readFileSync(join(messagesDir, `${tag}.json`), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`messages/${tag}.json must be a JSON object`);
  }
  return parsed as LocaleObject;
}

export function pickPath(root: LocaleObject, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) {
      throw new Error(`i18n path "${path}": cannot descend into ${part}`);
    }
    cur = (cur as LocaleObject)[part];
    if (cur === undefined) {
      throw new Error(`i18n path "${path}": missing ${part}`);
    }
  }
  return cur;
}

export function wrapAtPath(path: string, value: unknown): LocaleObject {
  const parts = path.split('.');
  const out: LocaleObject = {};
  let cur: LocaleObject = out;
  for (let i = 0; i < parts.length - 1; i++) {
    const next: LocaleObject = {};
    cur[parts[i]] = next;
    cur = next;
  }
  cur[parts[parts.length - 1]] = value;
  return out;
}

export function deepMerge(target: LocaleObject, source: LocaleObject): LocaleObject {
  for (const [k, v] of Object.entries(source)) {
    const existing = target[k];
    if (
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v)
    ) {
      deepMerge(existing as LocaleObject, v as LocaleObject);
    } else {
      target[k] = v;
    }
  }
  return target;
}

export function sliceKeys(root: LocaleObject, paths: string[]): string[] {
  const merged: LocaleObject = {};
  for (const path of paths) {
    deepMerge(merged, wrapAtPath(path, pickPath(root, path)));
  }
  return flatten(merged);
}

export function validateAliases(aliases: Record<string, string>, baseLocales: string[]): void {
  for (const [alias, target] of Object.entries(aliases)) {
    if (!baseLocales.includes(target)) {
      throw new Error(`Alias ${alias} → ${target}: target locale not found`);
    }
    if (baseLocales.includes(alias)) {
      throw new Error(`Alias ${alias} conflicts with messages/${alias}.json`);
    }
  }
}

function writeIfChanged(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  let existing: string;
  try {
    existing = readFileSync(path, 'utf8');
  } catch {
    existing = '';
  }
  if (existing !== body) writeFileSync(path, body, 'utf8');
}

export function emitGlobalTypes(typesPath: string, keys: string[]): void {
  const sorted = [...keys].sort();
  const union = sorted.length === 0 ? 'never' : sorted.map((k) => JSON.stringify(k)).join('\n  | ');
  const body = `export type I18nKey =\n  | ${union};\n`;
  writeIfChanged(typesPath, body);
}

export function emitVirtualTypes(
  typesPath: string,
  scopes: Map<string, ReadonlyArray<string>>,
): void {
  const sorted = [...scopes.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines: string[] = [];
  for (const [spec, keys] of sorted) {
    const sortedKeys = [...keys].sort();
    const union =
      sortedKeys.length === 0 ? 'never' : sortedKeys.map((k) => JSON.stringify(k)).join('\n    | ');
    lines.push(
      `declare module 'virtual:i18n/${spec}' {`,
      `  type Keys =\n    | ${union};`,
      `  type Opts = Omit<Parameters<typeof import('svelte-i18n').defineMessages>[0][string], 'id'>;`,
      `  export const _: import('svelte/store').Readable<(key: Keys, options?: Opts) => string>;`,
      `}`,
      '',
    );
  }
  writeIfChanged(typesPath, lines.join('\n'));
}
