import { DataType, type Accessor, buildHashMap } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, PLAYER_SCHEMA, type SchemaLeaf } from '@alexislours/ltd-savedata/schema';
import { ShareMiiError } from './errors.js';

/** The pair of save accessors a Mii operation needs: the `player` save and the `mii` save. */
export type MiiSaves = {
  /** Accessor over the `player` save data. */
  player: Accessor<'player'>;
  /** Accessor over the `mii` save data. */
  mii: Accessor<'mii'>;
};

/** The single save accessor a UGC operation needs: UGC items live entirely in the `player` save. */
export type PlayerOnlySaves = { player: Accessor<'player'> };

/**
 * Resolve a schema leaf by its field hash and assert its {@link DataType}, throwing
 * a `save_format_error` {@link ShareMiiError} (carrying `label`) if the field is
 * absent or has an unexpected type.
 */
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
