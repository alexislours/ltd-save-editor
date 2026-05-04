import { DataType } from '$lib/sav/dataType';
import type { Accessor } from '$lib/sav/materialized/accessor';
import { buildHashMap } from '$lib/sav/materialized/schemaIndex';
import { MII_SCHEMA, PLAYER_SCHEMA, type SchemaLeaf } from '$lib/sav/schema';
import { ShareMiiError } from './errors';

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
