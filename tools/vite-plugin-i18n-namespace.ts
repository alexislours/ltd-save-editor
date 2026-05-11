import { join, sep } from 'node:path';
import type { Plugin } from 'vite';
import {
  emitGlobalTypes,
  emitVirtualTypes,
  flatten,
  listLocales,
  loadLocale,
  pickPath,
  sliceKeys,
  validateAliases,
  wrapAtPath,
  type LocaleObject,
} from './i18n-types';

const PREFIX = 'virtual:i18n/';
const RESOLVED = '\0' + PREFIX;
const META_ID = '_locales';
const SHARED_ID = '_shared';
const LEAF_PREFIX = '__leaf/';

interface Options {
  messagesDir: string;
  aliases?: Record<string, string>;
  alwaysShared?: string;
  typesPath?: string;
  virtualTypesPath?: string;
  sourceLocale?: string;
}

export function i18nNamespace(options: Options): Plugin {
  const {
    messagesDir,
    aliases = {},
    alwaysShared = '',
    typesPath,
    virtualTypesPath,
    sourceLocale = 'en-US',
  } = options;

  const sharedPaths = alwaysShared ? alwaysShared.split('+').filter(Boolean) : [];
  const scopes = new Map<string, ReadonlyArray<string>>();
  const localeCache = new Map<string, LocaleObject>();
  let localesList: string[] | null = null;
  let sharedKeysCache: string[] | null = null;

  const cachedLocales = (): string[] => {
    if (localesList === null) localesList = listLocales(messagesDir);
    return localesList;
  };
  const cachedLocale = (tag: string): LocaleObject => {
    let v = localeCache.get(tag);
    if (!v) {
      v = loadLocale(messagesDir, tag);
      localeCache.set(tag, v);
    }
    return v;
  };
  const cachedSharedKeys = (): string[] => {
    if (sharedKeysCache === null) {
      sharedKeysCache = sharedPaths.length
        ? sliceKeys(cachedLocale(sourceLocale), sharedPaths)
        : [];
    }
    return sharedKeysCache;
  };
  const invalidateLocale = (tag?: string): void => {
    if (tag === undefined) localeCache.clear();
    else localeCache.delete(tag);
    localesList = null;
    sharedKeysCache = null;
  };

  const refreshGlobalTypes = (): void => {
    if (!typesPath) return;
    emitGlobalTypes(typesPath, flatten(cachedLocale(sourceLocale)));
  };

  const recordScope = (spec: string, paths: string[]): void => {
    if (!virtualTypesPath) return;
    const ownKeys = sliceKeys(cachedLocale(sourceLocale), paths);
    const all = Array.from(new Set([...ownKeys, ...cachedSharedKeys()]));
    scopes.set(spec, all);
    emitVirtualTypes(virtualTypesPath, scopes);
  };

  return {
    name: 'i18n-namespace',
    buildStart() {
      invalidateLocale();
      validateAliases(aliases, cachedLocales());
      refreshGlobalTypes();
    },
    resolveId(id) {
      if (id.startsWith(PREFIX)) return RESOLVED + id.slice(PREFIX.length);
      return null;
    },
    load(id) {
      if (!id.startsWith(RESOLVED)) return null;
      const spec = id.slice(RESOLVED.length);
      const baseLocales = cachedLocales();
      for (const tag of baseLocales) {
        this.addWatchFile(join(messagesDir, `${tag}.json`));
      }

      if (spec === META_ID) {
        const allTags = [...baseLocales, ...Object.keys(aliases)].sort();
        return `export const LOCALES = Object.freeze(${JSON.stringify(allTags)});\n`;
      }

      const withSpecContext = <T>(fn: () => T): T => {
        try {
          return fn();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`virtual:i18n/${spec}: ${msg}`, { cause: err });
        }
      };

      if (spec.startsWith(LEAF_PREFIX)) {
        const path = spec.slice(LEAF_PREFIX.length);
        const lines: string[] = [`import { addMessages as a } from 'svelte-i18n';`];
        const varByTag = new Map<string, string>();
        let i = 0;
        for (const tag of baseLocales) {
          const root = cachedLocale(tag);
          const slice = withSpecContext(() => wrapAtPath(path, pickPath(root, path)));
          const v = `m${i++}`;
          varByTag.set(tag, v);
          lines.push(`const ${v}=${JSON.stringify(slice)};`);
          lines.push(`a(${JSON.stringify(tag)},${v});`);
        }
        for (const [alias, target] of Object.entries(aliases)) {
          lines.push(`a(${JSON.stringify(alias)},${varByTag.get(target)});`);
        }
        return lines.join('\n') + '\n';
      }

      const paths = spec === SHARED_ID ? sharedPaths : spec.split('+').filter(Boolean);
      if (paths.length === 0) {
        throw new Error(`virtual:i18n/${spec}: no paths (alwaysShared not configured?)`);
      }
      withSpecContext(() => recordScope(spec, paths));

      const lines: string[] = [`import { _ as __t } from 'svelte-i18n';`];
      for (const path of paths) {
        lines.push(`import 'virtual:i18n/${LEAF_PREFIX}${path}';`);
      }
      lines.push(`export const _ = __t;`);
      return lines.join('\n') + '\n';
    },
    handleHotUpdate(ctx) {
      const normFile = ctx.file.split(sep).join('/');
      const normDir = messagesDir.split(sep).join('/');
      const dir = normDir.endsWith('/') ? normDir : normDir + '/';
      if (!normFile.startsWith(dir)) return;
      const changedTag = normFile.slice(dir.length).replace(/\.json$/, '');
      invalidateLocale(changedTag);
      try {
        refreshGlobalTypes();
        if (virtualTypesPath) {
          const root = cachedLocale(sourceLocale);
          const sharedKeys = cachedSharedKeys();
          for (const spec of scopes.keys()) {
            const paths = spec === SHARED_ID ? sharedPaths : spec.split('+').filter(Boolean);
            const ownKeys = sliceKeys(root, paths);
            scopes.set(spec, Array.from(new Set([...ownKeys, ...sharedKeys])));
          }
          emitVirtualTypes(virtualTypesPath, scopes);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.server.config.logger.warn(`[i18n] skipped type refresh: ${msg}`);
      }
      const invalidated = [];
      for (const m of ctx.server.moduleGraph.idToModuleMap.values()) {
        if (m.id?.startsWith(RESOLVED)) invalidated.push(m);
      }
      return invalidated;
    },
  };
}
