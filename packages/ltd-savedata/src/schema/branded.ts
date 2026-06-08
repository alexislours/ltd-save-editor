import type { DataType } from '../dataType.js';
import type { Leaf, SchemaLeaf } from './leaf.js';
import { MII_SCHEMA } from './mii.js';
import { PLAYER_SCHEMA } from './player.js';

type BrandTree<S, K extends string> =
  S extends SchemaLeaf<infer T extends DataType>
    ? Leaf<T, K>
    : { readonly [P in keyof S]: BrandTree<S[P], K> };

const cache = new WeakMap<object, object>();

const wrap = <T extends object, K extends string>(root: T, _kind: K): BrandTree<T, K> => {
  const seen = cache.get(root);
  if (seen) return seen as BrandTree<T, K>;
  const handler: ProxyHandler<object> = {
    get(target, key) {
      const v = (target as Record<string | symbol, unknown>)[key];
      return v && typeof v === 'object' && !('hash' in (v as object))
        ? wrap(v as object, _kind)
        : v;
    },
  };
  const proxy = new Proxy(root, handler);
  cache.set(root, proxy);
  return proxy as BrandTree<T, K>;
};

/**
 * {@link PLAYER_SCHEMA} wrapped so each leaf is typed as a `'player'`-branded
 * {@link Leaf}. Navigate by field path (e.g. `player.Player.Region`) to get a leaf
 * reference for use with an {@link Accessor}.
 */
export const player: BrandTree<typeof PLAYER_SCHEMA, 'player'> = wrap(PLAYER_SCHEMA, 'player');
/**
 * {@link MII_SCHEMA} wrapped so each leaf is typed as a `'mii'`-branded
 * {@link Leaf}. Navigate by field path to get a leaf reference for use with an
 * {@link Accessor}.
 */
export const mii: BrandTree<typeof MII_SCHEMA, 'mii'> = wrap(MII_SCHEMA, 'mii');
