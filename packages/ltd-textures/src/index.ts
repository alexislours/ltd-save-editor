/**
 * WebAssembly toolkit for Tegra/Switch texture data: block-linear
 * (de)swizzling, BC1/BC3 transcoding, sRGB/linear conversion, and image resize.
 *
 * Instantiate the module with {@link createUgcWasm} (bring your own `ugc.wasm`
 * bytes), or use the `@alexislours/ltd-textures/browser` entrypoint to fetch the
 * bundled binary automatically.
 *
 * @example
 * ```ts
 * import { createUgcWasm, Bc1Mode } from '@alexislours/ltd-textures';
 *
 * const ugc = await createUgcWasm({ wasm: wasmBytes });
 * const linear = ugc.srgbToLinearF32(rgba);
 * const blocks = ugc.bc1Encode(linear, rgba, 256, 256, Bc1Mode.Auto);
 * ```
 *
 * @module
 */
export {
  createUgcWasm,
  type UgcWasm,
  type WasmSource,
  type CreateUgcWasmOptions,
} from './bridge.js';
export { type CreateWorker, type WorkerLike, type ThreadPool } from './threadPool.js';
export { Bc1Mode, FitMode, type Matte } from './types.js';
