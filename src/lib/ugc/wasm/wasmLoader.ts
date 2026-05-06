export const isNodeEnv =
  typeof process !== 'undefined' &&
  process.versions != null &&
  process.versions.node != null &&
  typeof window === 'undefined';

let cached: Promise<ArrayBuffer> | null = null;

export function loadWasmBytes(): Promise<ArrayBuffer> {
  if (!cached) cached = fetchBytes();
  return cached;
}

async function fetchBytes(): Promise<ArrayBuffer> {
  if (isNodeEnv) {
    const { readFile } = await import('node:fs/promises');
    const url = new URL('./build/ugc.wasm', import.meta.url);
    const buf = await readFile(url);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const wasmUrl = (await import('./build/ugc.wasm?url')).default;
  const res = await fetch(wasmUrl);
  return await res.arrayBuffer();
}
