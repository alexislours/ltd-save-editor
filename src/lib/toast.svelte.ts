import { SvelteMap } from 'svelte/reactivity';

export type ToastKind = 'success' | 'error' | 'warn' | 'info';
export type Toast = { id: number; kind: ToastKind; text: string };

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 3000,
  info: 4000,
  warn: 5000,
  error: 6000,
};

let nextId = 1;
const toasts = $state<Toast[]>([]);
const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();

export function getToasts(): Toast[] {
  return toasts;
}

export function showToast(kind: ToastKind, text: string, durationMs?: number): void {
  const id = nextId++;
  toasts.push({ id, kind, text });
  const duration = durationMs ?? DEFAULT_DURATION[kind];
  if (duration > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration),
    );
  }
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}
