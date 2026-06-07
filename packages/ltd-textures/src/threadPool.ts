import { Bc1Mode } from './types.js';

export type WorkerLike = {
  postMessage(msg: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  onmessageerror?: ((e: MessageEvent) => void) | null;
  terminate(): void;
};

export type CreateWorker = () => WorkerLike;

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

export type ThreadPool = {
  bc1Encode(
    linRgba: Float32Array,
    srgbRgba: Uint8Array,
    w: number,
    h: number,
    mode: Bc1Mode,
    threads: number,
  ): Promise<Uint8Array>;
  bc3Encode(
    linRgba: Float32Array,
    srgbRgba: Uint8Array,
    w: number,
    h: number,
    threads: number,
  ): Promise<Uint8Array>;
  terminate(): Promise<void>;
};

const WORKER_INIT_TIMEOUT_MS = 15000;

function formatWorkerErrorEvent(e: unknown): string {
  const ev = e as Partial<ErrorEvent> & { error?: { message?: string; stack?: string } };
  const parts: string[] = [];
  if (ev.message) parts.push(ev.message);
  if (ev.error) {
    if (ev.error.message && ev.error.message !== ev.message) parts.push(ev.error.message);
    if (ev.error.stack) parts.push(ev.error.stack);
  }
  if (ev.filename) parts.push(`at ${ev.filename}:${ev.lineno}:${ev.colno}`);
  return parts.length > 0 ? parts.join(' | ') : 'unknown worker error';
}

function wrapWorker(w: WorkerLike): WorkerHandle {
  return {
    postMessage: (msg, transfer) => w.postMessage(msg, transfer ?? []),
    setMessageHandler: (cb) => {
      w.onmessage = (e: MessageEvent) => cb(e.data as WorkerMessage);
    },
    setErrorHandler: (cb) => {
      w.onerror = (e: unknown) => cb(formatWorkerErrorEvent(e));
      w.onmessageerror = () => cb('messageerror');
    },
    terminate: () => w.terminate(),
  };
}

export function createThreadPool(wasmBytes: ArrayBuffer, createWorker: CreateWorker): ThreadPool {
  let pool: WorkerHandle[] | null = null;
  let nextId = 1;
  type Pending = { resolve: (out: Uint8Array) => void; reject: (err: unknown) => void };
  const pending = new Map<number, Pending>();

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

  async function bootWorker(): Promise<WorkerHandle> {
    const handle = wrapWorker(createWorker());
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

  async function ensurePool(threads: number): Promise<void> {
    if (pool && pool.length >= threads) return;
    if (!pool) pool = [];
    const need = threads - pool.length;
    if (need <= 0) return;
    const results = await Promise.allSettled(Array.from({ length: need }, () => bootWorker()));
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
    await ensurePool(threads);
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

  return {
    bc1Encode(linRgba, srgbRgba, w, h, mode, threads) {
      return encodeThreaded('bc1', linRgba, srgbRgba, w, h, mode, threads, 8);
    },
    bc3Encode(linRgba, srgbRgba, w, h, threads) {
      return encodeThreaded('bc3', linRgba, srgbRgba, w, h, 0, threads, 16);
    },
    async terminate() {
      rejectAllPending(new Error('Thread pool terminated'));
      if (!pool) return;
      for (const w of pool) w.terminate();
      pool = null;
    },
  };
}
