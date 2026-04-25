import type { SaveKind } from './saveFile.svelte';

type LoadFailReason = 'read_failed' | 'unrecognized' | 'wrong_tab' | 'set_failed';

type Events = {
  save_loaded: { kind: SaveKind; size: number };
  save_load_failed: { kind: SaveKind; reason: LoadFailReason };
  save_parse_failed: { kind: SaveKind };
  save_exported: { kind: SaveKind };
  bulk_edit_used: { field: 'state' | 'qty'; count: number };
  locale_changed: { from: string; to: string };
};

type Umami = {
  track: (name: string, data?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    umami?: Umami;
  }
}

export function track<K extends keyof Events>(name: K, data: Events[K]): void {
  if (typeof window === 'undefined') return;
  window.umami?.track(name, data);
}
