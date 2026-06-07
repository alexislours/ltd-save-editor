import { DataType, type Accessor, buildHashMap } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, PLAYER_SCHEMA, type SchemaLeaf } from '@alexislours/ltd-savedata/schema';
import { ShareMiiError } from './errors.js';

export type MiiSaves = {
  player: Accessor<'player'>;
  mii: Accessor<'mii'>;
};

export type PlayerOnlySaves = { player: Accessor<'player'> };

export function leafByHashOrThrow<T extends DataType>(
  schema: typeof PLAYER_SCHEMA | typeof MII_SCHEMA,
  hash: number,
  label: string,
  expected: T,
): SchemaLeaf<T> {
  const leaf = buildHashMap(schema).get(hash >>> 0);
  if (!leaf) throw new ShareMiiError('save_format_error', { label });
  if (leaf.type !== expected) {
    throw new ShareMiiError('save_format_error', { label });
  }
  return leaf as SchemaLeaf<T>;
}
