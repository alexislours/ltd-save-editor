#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { I18N_CONFIG } from './i18n-config.ts';
import {
  emitGlobalTypes,
  emitVirtualTypes,
  flatten,
  listLocales,
  loadLocale,
  sliceKeys,
  validateAliases,
} from './i18n-types.ts';

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));
const SPEC_RE = /['"`]virtual:i18n\/([A-Za-z0-9_+.]+)['"`]/g;
const SCANNED_EXTENSIONS = ['.ts', '.svelte', '.js'];

function scanSpecs(dir: string): Set<string> {
  const out = new Set<string>();
  const entries = readdirSync(dir, { recursive: true }) as string[];
  for (const rel of entries) {
    if (!SCANNED_EXTENSIONS.some((ext) => rel.endsWith(ext))) continue;
    const path = join(dir, rel);
    if (!statSync(path).isFile()) continue;
    const content = readFileSync(path, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = SPEC_RE.exec(content)) !== null) {
      const spec = m[1];
      if (spec === '_locales') continue;
      if (spec.startsWith('__leaf')) continue;
      out.add(spec);
    }
  }
  return out;
}

const baseLocales = listLocales(I18N_CONFIG.messagesDir);
validateAliases(I18N_CONFIG.aliases, baseLocales);
const source = loadLocale(I18N_CONFIG.messagesDir, I18N_CONFIG.sourceLocale);

emitGlobalTypes(I18N_CONFIG.typesPath, flatten(source));

const sharedPaths = I18N_CONFIG.alwaysShared
  ? I18N_CONFIG.alwaysShared.split('+').filter(Boolean)
  : [];
const sharedKeys = sharedPaths.length ? sliceKeys(source, sharedPaths) : [];

const specs = scanSpecs(SRC_DIR);
const scopes = new Map<string, ReadonlyArray<string>>();
for (const spec of specs) {
  const paths = spec === '_shared' ? sharedPaths : spec.split('+').filter(Boolean);
  if (paths.length === 0) continue;
  const ownKeys = sliceKeys(source, paths);
  scopes.set(spec, Array.from(new Set([...ownKeys, ...sharedKeys])));
}

emitVirtualTypes(I18N_CONFIG.virtualTypesPath, scopes);

console.log(`i18n types: ${scopes.size} scopes, ${flatten(source).length} keys`);
