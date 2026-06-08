/**
 * Reverse-engineered field schemas for the game's `.sav` format: nested trees of
 * {@link SchemaLeaf} entries keyed by their reverse-engineered path names.
 *
 * Pass a `*_SCHEMA` tree to the materialized decode/encode functions, or use the
 * {@link player} and {@link mii} branded proxies to reference leaves with
 * compile-time path checking.
 *
 * @module
 */
export { MII_SCHEMA } from './mii.js';
export { PLAYER_SCHEMA } from './player.js';
export { MAP_SCHEMA } from './map.js';
export { player, mii } from './branded.js';
export { type SchemaLeaf, type Leaf, type ValueOf, type ElementOf } from './leaf.js';
