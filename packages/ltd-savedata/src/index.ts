/**
 * Reader, writer, and reverse-engineered field schema for the game's binary
 * `.sav` save format.
 *
 * The low-level layer parses a file into {@link SavFile} entries
 * ({@link parseSav}) and serializes them back ({@link writeSav}), with typed
 * getters and setters per {@link DataType} in the codec module. The materialized
 * layer ({@link decode} / {@link encode}) pairs a schema with a file to expose
 * values by hash, and {@link createMaterializedAccessor} reads and writes them
 * through typed {@link SchemaLeaf} references. Reverse-engineered field names
 * live in the `@alexislours/ltd-savedata/schema` entrypoint.
 *
 * @example
 * ```ts
 * import { parseSav, decode, createMaterializedAccessor } from '@alexislours/ltd-savedata';
 * import { PLAYER_SCHEMA, player } from '@alexislours/ltd-savedata/schema';
 *
 * const file = parseSav(bytes);
 * const acc = createMaterializedAccessor(PLAYER_SCHEMA, decode(PLAYER_SCHEMA, file));
 * const region = acc.get(player.Player.Region);
 * ```
 *
 * @module
 */
export * from './types.js';
export * from './dataType.js';
export * from './hash.js';
export * from './format.js';
export * from './gameLocale.js';
export * from './knownKeys.js';
export * from './codec.js';
export * from './parse.js';
export * from './write.js';
export * from './materialized/accessor.js';
export * from './materialized/decode.js';
export * from './materialized/encode.js';
export * from './materialized/schemaIndex.js';
export * from './materialized/types.js';
export * from './struct/registry.js';
export * from './struct/types.js';
export * from './struct/decode.js';
