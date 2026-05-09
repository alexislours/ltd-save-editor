let cached: Promise<ArrayBuffer> | null = null;

export function loadWasmBytes(): Promise<ArrayBuffer> {
  if (!cached) cached = fetchBytes();
  return cached;
}

async function fetchBytes(): Promise<ArrayBuffer> {
  const wasmUrl = (await import('./build/ugc.wasm?url')).default;
  const res = await fetch(wasmUrl);
  return await res.arrayBuffer();
}
