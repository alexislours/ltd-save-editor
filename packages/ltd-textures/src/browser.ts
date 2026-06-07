import { createUgcWasm, type UgcWasm } from './bridge.js';
import type { CreateWorker } from './threadPool.js';

export interface BrowserLoadOptions {
  createWorker?: CreateWorker;
}

const WASM_URL = new URL('../build/ugc.wasm', import.meta.url);

export function loadUgcWasm(options: BrowserLoadOptions = {}): Promise<UgcWasm> {
  return createUgcWasm({
    wasm: fetch(WASM_URL),
    createWorker: options.createWorker,
  });
}
