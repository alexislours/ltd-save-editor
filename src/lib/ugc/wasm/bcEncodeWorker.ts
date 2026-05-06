export {};

interface WasmEncodeExports {
  memory: WebAssembly.Memory;
  alloc(size: number): number;
  mark(): number;
  release(m: number): void;
  bc1Encode(
    linRgbaPtr: number,
    srgbRgbaPtr: number,
    dstPtr: number,
    texW: number,
    texH: number,
    bc1Mode: number,
  ): void;
  bc3Encode(
    linRgbaPtr: number,
    srgbRgbaPtr: number,
    dstPtr: number,
    texW: number,
    texH: number,
  ): void;
}

type InMsg =
  | { type: 'init'; wasmBytes: ArrayBuffer }
  | {
      type: 'encode';
      id: number;
      op: 'bc1' | 'bc3';
      linF: Float32Array;
      srgbU: Uint8Array;
      w: number;
      h: number;
      mode: number;
    };

type OutMsg =
  | { type: 'ready' }
  | { type: 'done'; id: number; blocks: ArrayBuffer }
  | { type: 'error'; id?: number; error: string };

const isNode =
  typeof process !== 'undefined' &&
  process.versions != null &&
  process.versions.node != null &&
  typeof self === 'undefined';

let listen: (cb: (msg: InMsg) => void) => void;
let post: (msg: OutMsg, transfer?: Transferable[]) => void;

if (isNode) {
  const wt = await import(/* @vite-ignore */ 'node:worker_threads');
  const port = wt.parentPort;
  if (!port) throw new Error('worker has no parentPort');
  listen = (cb) => port.on('message', cb);
  post = (msg, transfer) => port.postMessage(msg, (transfer ?? []) as unknown as ArrayBuffer[]);
} else {
  type WorkerScope = {
    onmessage: ((e: MessageEvent) => void) | null;
    postMessage(msg: unknown, transfer?: Transferable[]): void;
  };
  const scope = self as unknown as WorkerScope;
  listen = (cb) => {
    scope.onmessage = (e: MessageEvent) => cb(e.data as InMsg);
  };
  post = (msg, transfer) => scope.postMessage(msg, transfer ?? []);
}

const importObject: WebAssembly.Imports = {
  env: {
    abort() {
      throw new Error('ugc.wasm aborted in worker');
    },
  },
};

let wasmExports: WasmEncodeExports | null = null;

listen((msg) => {
  handle(msg).catch((err: unknown) => {
    const id = msg && (msg as { id?: number }).id;
    post({ type: 'error', id, error: String(err) });
  });
});

async function handle(msg: InMsg): Promise<void> {
  if (msg.type === 'init') {
    const result = await WebAssembly.instantiate(msg.wasmBytes, importObject);
    wasmExports = result.instance.exports as unknown as WasmEncodeExports;
    post({ type: 'ready' });
    return;
  }
  if (msg.type === 'encode') {
    const exp = wasmExports;
    if (!exp) throw new Error('worker not initialized');
    const { id, op, linF, srgbU, w, h, mode } = msg;
    const pixels = w * h;
    const linLen = pixels * 16;
    const srgbLen = pixels * 4;
    const outLen = op === 'bc1' ? (pixels / 16) * 8 : (pixels / 16) * 16;
    const m = exp.mark();
    let outAB: ArrayBuffer;
    try {
      const linPtr = exp.alloc(linLen);
      const srgbPtr = exp.alloc(srgbLen);
      const outPtr = exp.alloc(outLen);
      const memBuf = exp.memory.buffer;
      new Float32Array(memBuf, linPtr, pixels * 4).set(linF);
      new Uint8Array(memBuf, srgbPtr, srgbLen).set(srgbU);
      if (op === 'bc1') {
        exp.bc1Encode(linPtr, srgbPtr, outPtr, w, h, mode);
      } else {
        exp.bc3Encode(linPtr, srgbPtr, outPtr, w, h);
      }
      outAB = new ArrayBuffer(outLen);
      new Uint8Array(outAB).set(new Uint8Array(memBuf, outPtr, outLen));
    } finally {
      exp.release(m);
    }
    post({ type: 'done', id, blocks: outAB }, [outAB]);
  }
}
