#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

type LocaleValue = string | number | boolean | null | LocaleObject;
type LocaleObject = { [key: string]: LocaleValue };

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MESSAGES_DIR = join(ROOT, 'messages');
const SOURCE_LOCALE = 'en-US';

function loadLocale(code: string): LocaleObject {
  const raw = readFileSync(join(MESSAGES_DIR, `${code}.json`), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`messages/${code}.json must be a JSON object`);
  }
  return parsed as LocaleObject;
}

function saveLocale(code: string, data: LocaleObject): void {
  const path = join(MESSAGES_DIR, `${code}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function flatten(
  obj: LocaleObject,
  prefix = '',
  out: Record<string, LocaleValue> = {},
): Record<string, LocaleValue> {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

function setDeep(obj: LocaleObject, path: string, value: LocaleValue): void {
  const parts = path.split('.');
  let cur: LocaleObject = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const next = cur[k];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      cur[k] = {};
    }
    cur = cur[k] as LocaleObject;
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteDeep(obj: LocaleObject, path: string): void {
  const parts = path.split('.');
  const stack: LocaleObject[] = [obj];
  let cur: LocaleObject = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) return;
    cur = next as LocaleObject;
    stack.push(cur);
  }
  delete cur[parts[parts.length - 1]];
  for (let i = parts.length - 2; i >= 0; i--) {
    const parent = stack[i];
    const k = parts[i];
    const child = parent[k];
    if (
      child !== null &&
      typeof child === 'object' &&
      !Array.isArray(child) &&
      Object.keys(child).length === 0
    ) {
      delete parent[k];
    } else {
      break;
    }
  }
}

function listTargetLocales(): string[] {
  return readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .filter((code) => code !== SOURCE_LOCALE)
    .sort();
}

type Drift = { missing: string[]; obsolete: string[] };

function diff(source: Record<string, LocaleValue>, target: Record<string, LocaleValue>): Drift {
  const missing: string[] = [];
  const obsolete: string[] = [];
  for (const key of Object.keys(source)) {
    const v = target[key];
    if (!(key in target) || v === '' || v == null) missing.push(key);
  }
  for (const key of Object.keys(target)) {
    if (!(key in source)) obsolete.push(key);
  }
  return { missing, obsolete };
}

function cmdCheck(): void {
  const source = flatten(loadLocale(SOURCE_LOCALE));
  const locales = listTargetLocales();
  let drift = 0;
  for (const code of locales) {
    const target = flatten(loadLocale(code));
    const { missing, obsolete } = diff(source, target);
    if (missing.length === 0 && obsolete.length === 0) {
      console.log(`[${code}] OK`);
      continue;
    }
    drift++;
    console.log(`[${code}] ${missing.length} missing, ${obsolete.length} obsolete`);
    for (const k of missing) console.log(`  - missing  ${k}`);
    for (const k of obsolete) console.log(`  - obsolete ${k}`);
  }
  if (drift > 0) {
    console.log(`\n${drift} locale(s) out of sync. Run 'npm run i18n:sync' to scaffold.`);
    process.exit(1);
  }
  console.log('\nAll locales in sync.');
}

function cmdSync(): void {
  const source = flatten(loadLocale(SOURCE_LOCALE));
  const locales = listTargetLocales();
  for (const code of locales) {
    const data = loadLocale(code);
    const target = flatten(data);
    const { missing, obsolete } = diff(source, target);
    if (missing.length === 0 && obsolete.length === 0) {
      console.log(`[${code}] no changes`);
      continue;
    }
    for (const key of missing) setDeep(data, key, source[key]);
    for (const key of obsolete) deleteDeep(data, key);
    saveLocale(code, data);
    console.log(`[${code}] +${missing.length} -${obsolete.length}`);
  }
}

const cmd = process.argv[2];
if (cmd === 'check') cmdCheck();
else if (cmd === 'sync') cmdSync();
else {
  console.error('Usage: node tools/i18n-sync.ts <check|sync>');
  process.exit(2);
}
