import { Bc1Mode } from './types';
import { isNodeEnv, loadWasmBytes } from './wasmLoader';

type WorkerHandle = {
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  setMessageHandler(cb: (msg: WorkerMessage) => void): void;
  setErrorHandler(cb: (err: unknown) => void): void;
  terminate(): void;
};

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'done'; id: number; blocks: ArrayBuffer }
  | { type: 'error'; id?: number; error: string };

async function createWorker(): Promise<WorkerHandle> {
  if (isNodeEnv) {
    const wt = await import(/* @vite-ignore */ 'node:worker_threads');
    const url = new URL('./bcEncodeWorker.ts', import.meta.url);
    const w = new wt.Worker(url);
    return {
      postMessage: (msg, transfer) => {
        w.postMessage(msg, (transfer ?? []) as unknown as ArrayBuffer[]);
      },
      setMessageHandler: (cb) => {
        w.removeAllListeners('message');
        w.on('message', cb);
      },
      setErrorHandler: (cb) => {
        w.removeAllListeners('error');
        w.on('error', cb);
      },
      terminate: () => {
        void w.terminate();
      },
    };
  }
  const mod = await import('./bcEncodeWorker.ts?worker');
  const w = new mod.default();
  return {
    postMessage: (msg, transfer) => w.postMessage(msg, transfer ?? []),
    setMessageHandler: (cb) => {
      w.onmessage = (e: MessageEvent) => cb(e.data as WorkerMessage);
    },
    setErrorHandler: (cb) => {
      w.onerror = (e: ErrorEvent) => cb(formatWorkerErrorEvent(e));
      w.onmessageerror = () => cb('messageerror');
    },
    terminate: () => w.terminate(),
  };
}

function formatWorkerErrorEvent(e: ErrorEvent): string {
  const parts: string[] = [];
  if (e.message) parts.push(e.message);
  if (e.error) {
    const err = e.error as { message?: string; stack?: string };
    if (err.message && err.message !== e.message) parts.push(err.message);
    if (err.stack) parts.push(err.stack);
  }
  if (e.filename) parts.push(`at ${e.filename}:${e.lineno}:${e.colno}`);
  return parts.length > 0 ? parts.join(' | ') : 'unknown worker error';
}

let pool: WorkerHandle[] | null = null;
let nextId = 1;
type Pending = { resolve: (out: Uint8Array) => void; reject: (err: unknown) => void };
const pending = new Map<number, Pending>();

const WORKER_INIT_TIMEOUT_MS = 15000;

function rejectAllPending(err: unknown): void {
  for (const [id, cb] of pending) {
    pending.delete(id);
    cb.reject(err);
  }
}

function dispatchListener(msg: WorkerMessage): void {
  if (msg.type === 'done') {
    const cb = pending.get(msg.id);
    if (cb) {
      pending.delete(msg.id);
      cb.resolve(new Uint8Array(msg.blocks));
    }
  } else if (msg.type === 'error' && msg.id != null) {
    const cb = pending.get(msg.id);
    pending.delete(msg.id);
    cb?.reject(new Error(msg.error));
  }
}

async function bootWorker(wasmBytes: ArrayBuffer): Promise<WorkerHandle> {
  const handle = await createWorker();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Worker init timed out'));
      }, WORKER_INIT_TIMEOUT_MS);
      const finish = (fn: () => void): void => {
        clearTimeout(timer);
        fn();
      };
      handle.setMessageHandler((msg) => {
        if (msg.type === 'ready') {
          finish(() => {
            handle.setMessageHandler(dispatchListener);
            handle.setErrorHandler((err) => rejectAllPending(new Error(`Worker error: ${err}`)));
            resolve();
          });
        } else if (msg.type === 'error') {
          finish(() => reject(new Error(msg.error)));
        }
      });
      handle.setErrorHandler((err) => {
        finish(() => reject(new Error(`Worker init error: ${err}`)));
      });
      handle.postMessage({ type: 'init', wasmBytes });
    });
  } catch (e) {
    handle.terminate();
    throw e;
  }
  return handle;
}

async function ensureBcThreadPool(threads: number): Promise<void> {
  if (pool && pool.length >= threads) return;
  const wasmBytes = await loadWasmBytes();
  if (!pool) pool = [];
  const need = threads - pool.length;
  if (need <= 0) return;
  const results = await Promise.allSettled(
    Array.from({ length: need }, () => bootWorker(wasmBytes)),
  );
  const fulfilled: WorkerHandle[] = [];
  let firstError: unknown = null;
  for (const r of results) {
    if (r.status === 'fulfilled') fulfilled.push(r.value);
    else if (firstError == null) firstError = r.reason;
  }
  if (firstError != null) {
    for (const h of fulfilled) h.terminate();
    throw firstError;
  }
  pool.push(...fulfilled);
}

export async function terminateBcThreadPool(): Promise<void> {
  rejectAllPending(new Error('Thread pool terminated'));
  if (!pool) return;
  for (const w of pool) w.terminate();
  pool = null;
}

function dispatchEncode(
  idx: number,
  op: 'bc1' | 'bc3',
  linF: Float32Array,
  srgbU: Uint8Array,
  w: number,
  h: number,
  mode: number,
  transfer: Transferable[],
): Promise<Uint8Array> {
  const id = nextId++;
  return new Promise<Uint8Array>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    pool![idx].postMessage({ type: 'encode', id, op, linF, srgbU, w, h, mode }, transfer);
  });
}

function partition(blocksY: number, threads: number): number[] {
  const base = Math.floor(blocksY / threads);
  const extra = blocksY % threads;
  const out: number[] = [];
  for (let i = 0; i < threads; i++) {
    const sz = base + (i < extra ? 1 : 0);
    if (sz > 0) out.push(sz);
  }
  return out;
}

async function encodeThreaded(
  op: 'bc1' | 'bc3',
  linRgba: Float32Array,
  srgbRgba: Uint8Array,
  w: number,
  h: number,
  mode: number,
  threads: number,
  bytesPerBlock: number,
): Promise<Uint8Array> {
  if (w % 4 !== 0 || h % 4 !== 0) {
    throw new Error(`encodeThreaded: width and height must be 4-aligned, got ${w}x${h}`);
  }
  await ensureBcThreadPool(threads);
  const blocksY = h / 4;
  const blocksX = w / 4;
  const sizes = partition(blocksY, threads);
  const promises: Promise<Uint8Array>[] = [];
  let yOff = 0;
  for (let i = 0; i < sizes.length; i++) {
    const sliceBlocksY = sizes[i];
    const slicePxRows = sliceBlocksY * 4;
    const elemStart = yOff * 4 * w * 4;
    const elemEnd = (yOff + sliceBlocksY) * 4 * w * 4;
    const byteStart = yOff * 4 * w * 4;
    const byteEnd = (yOff + sliceBlocksY) * 4 * w * 4;
    const linAB = new ArrayBuffer((elemEnd - elemStart) * 4);
    const linF = new Float32Array(linAB);
    linF.set(linRgba.subarray(elemStart, elemEnd));
    const srgbAB = new ArrayBuffer(byteEnd - byteStart);
    const srgbU = new Uint8Array(srgbAB);
    srgbU.set(srgbRgba.subarray(byteStart, byteEnd));
    promises.push(dispatchEncode(i, op, linF, srgbU, w, slicePxRows, mode, [linAB, srgbAB]));
    yOff += sliceBlocksY;
  }
  const parts = await Promise.all(promises);
  const total = blocksY * blocksX * bytesPerBlock;
  const out = new Uint8Array(total);
  let writeOff = 0;
  for (const p of parts) {
    out.set(p, writeOff);
    writeOff += p.byteLength;
  }
  return out;
}

export function bc1EncodeThreaded(
  linRgba: Float32Array,
  srgbRgba: Uint8Array,
  w: number,
  h: number,
  mode: Bc1Mode,
  threads: number,
): Promise<Uint8Array> {
  return encodeThreaded('bc1', linRgba, srgbRgba, w, h, mode, threads, 8);
}

export function bc3EncodeThreaded(
  linRgba: Float32Array,
  srgbRgba: Uint8Array,
  w: number,
  h: number,
  threads: number,
): Promise<Uint8Array> {
  return encodeThreaded('bc3', linRgba, srgbRgba, w, h, 0, threads, 16);
}
