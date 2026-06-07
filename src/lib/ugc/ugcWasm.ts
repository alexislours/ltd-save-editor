import { createUgcWasm, type UgcWasm } from '@alexislours/ltd-textures';
import wasmUrl from '@alexislours/ltd-textures/build/ugc.wasm?url';
import UgcWorker from '@alexislours/ltd-textures/worker?worker';

let ready: Promise<UgcWasm> | null = null;

export function ensureUgcWasm(): Promise<UgcWasm> {
  if (!ready) {
    const p = createUgcWasm({
      wasm: fetch(wasmUrl).then((r) => r.arrayBuffer()),
      createWorker: () => new UgcWorker(),
    });
    p.catch(() => {
      if (ready === p) ready = null;
    });
    ready = p;
  }
  return ready;
}
