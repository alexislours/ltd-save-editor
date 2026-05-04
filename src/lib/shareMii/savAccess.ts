import { DataType } from '../sav/dataType';
import type { Accessor } from '../sav/materialized/accessor';
import { buildHashMap } from '../sav/materialized/schemaIndex';
import { MII_SCHEMA, PLAYER_SCHEMA, type SchemaLeaf } from '../sav/schema';
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
  const info = buildHashMap(schema).get(hash >>> 0);
  if (!info) throw new ShareMiiError('save_format_error', { label });
  if (info.leaf.type !== expected) {
    throw new ShareMiiError('save_format_error', { label });
  }
  return info.leaf as SchemaLeaf<T>;
}
