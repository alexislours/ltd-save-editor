/**
 * Codec for the game's Mii and user-generated content (UGC) share format.
 *
 * Extract a Mii or a UGC item (food, clothing, treasure, interiors, and so on)
 * from a decoded save into a portable `.ltd*` share file, and apply a share file
 * back into a save. Save reads and writes go through {@link MiiSaves} /
 * {@link PlayerOnlySaves} accessors from `@alexislours/ltd-savedata`; the bulky
 * texture blobs travel alongside as {@link SidecarSource} sidecar files.
 *
 * @example
 * ```ts
 * import { extractMii, applyMii } from '@alexislours/ltd-sharemii';
 *
 * const { bytes, fileName, facepaint } = extractMii(saves, slot, sidecar);
 * // ...later, on another save...
 * applyMii(otherSaves, targetSlot, bytes, sidecar);
 * ```
 *
 * @module
 */
export * from './sidecar.js';
export * from './errors.js';
export * from './utf16.js';
export * from './ugcKinds.js';
export * from './savAccess.js';
export * from './codec.js';
export * from './applyMii.js';
export * from './applyUgc.js';
