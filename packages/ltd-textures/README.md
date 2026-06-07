# @alexislours/ltd-textures

Tegra/Switch GPU texture toolkit in WebAssembly: block-linear (de)swizzle, BC1/BC3 transcode, sRGB/linear conversion, and image resize. No bundler assumptions, no Vite magic; you bring the wasm bytes and (optionally) a worker factory.

## Install

```sh
npm install @alexislours/ltd-textures
```

## Usage

Portable core. Supply the wasm bytes however your environment loads them:

```ts
import { createUgcWasm } from '@alexislours/ltd-textures';

const wasm = await createUgcWasm({
  wasm: fetch(import.meta.resolve('@alexislours/ltd-textures/ugc.wasm')),
});
const rgba = wasm.bc3Decode(blocks, width, height);
```

Multi-threaded BC encoding is opt-in via a worker factory. Without one, the
threaded methods transparently fall back to single-threaded encoding:

```ts
import UgcWorker from '@alexislours/ltd-textures/worker?worker'; // Vite example

const wasm = await createUgcWasm({
  wasm: fetch(wasmUrl),
  createWorker: () => new UgcWorker(),
});
await wasm.bc1EncodeThreaded(linRgba, srgbRgba, w, h, mode, threads);
```

In a Vite/webpack browser app, the `./browser` entry resolves the bundled wasm for you:

```ts
import { loadUgcWasm } from '@alexislours/ltd-textures/browser';
import UgcWorker from '@alexislours/ltd-textures/worker?worker'; // Vite example

const wasm = await loadUgcWasm({ createWorker: () => new UgcWorker() });
```

## Entry points

- `.` the portable `createUgcWasm` API plus `Bc1Mode`/`FitMode`/`Matte`.
- `./browser` convenience loader that fetches the shipped wasm via `import.meta.url`.
- `./worker` the BC-encode worker entry (instantiate as a module worker).
- `./ugc.wasm` the prebuilt binary asset.

## License

AGPL-3.0-or-later
