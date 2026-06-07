/**
 * Browser-friendly entrypoint that resolves the bundled `ugc.wasm` relative to
 * this module and instantiates it via {@link loadUgcWasm}, so callers do not
 * have to locate or fetch the binary themselves.
 *
 * @module
 */
import { createUgcWasm, type UgcWasm } from './bridge.js';
import type { CreateWorker } from './threadPool.js';

/** Options for {@link loadUgcWasm}. */
export interface BrowserLoadOptions {
  /** Worker factory enabling the threaded encode methods; omit for single-threaded use. */
  createWorker?: CreateWorker;
}

const WASM_URL = new URL('../build/ugc.wasm', import.meta.url);

/**
 * Fetch the co-located `ugc.wasm` and return an instantiated {@link UgcWasm}.
 *
 * @example
 * ```ts
 * import { loadUgcWasm } from '@alexislours/ltd-textures/browser';
 *
 * const ugc = await loadUgcWasm();
 * const rgba = ugc.bc3Decode(blocks, 256, 256);
 * ```
 */
export function loadUgcWasm(options: BrowserLoadOptions = {}): Promise<UgcWasm> {
  return createUgcWasm({
    wasm: fetch(WASM_URL),
    createWorker: options.createWorker,
  });
}
