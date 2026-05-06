import type { DataType } from '$lib/sav/dataType';
import type { Leaf, SchemaLeaf } from './leaf';
import { MII_SCHEMA } from './mii';
import { PLAYER_SCHEMA } from './player';

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

export const player = wrap(PLAYER_SCHEMA, 'player');
export const mii = wrap(MII_SCHEMA, 'mii');
