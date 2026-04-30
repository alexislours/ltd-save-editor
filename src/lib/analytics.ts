import type { SaveKind } from './saveFile.svelte';
import type { UgcKind } from './shareMii/ugcKinds';

type ShareMiiKind = 'Mii' | UgcKind;

type Events = {
  load_attempted: { file_count: number; has_zip: boolean };
  load_completed: {
    kinds: string;
    kind_count: number;
    skipped: number;
    conflicts: number;
    from_zip: boolean;
  };
  load_cancelled: { conflicts: number };
  parse_failed: { kind: SaveKind };
  export: { mode: 'single' | 'bulk'; kinds: string; kind_count: number };
  bulk_edit: { field: 'state' | 'qty'; count: number };
  restore_prompted: { count: number; sidecar_count: number };
  restore_accepted: { count: number; sidecar_count: number };
  restore_dismissed: { count: number; sidecar_count: number };
  sharemii_inbound: { source: 'folder' | 'zip'; count: number };
  sharemii_import: {
    kind: ShareMiiKind;
    mode: 'replace' | 'add';
    from_zip: boolean;
    count: number;
    failed: number;
  };
  sharemii_export: { kind: ShareMiiKind; mode: 'single' | 'all'; count: number };
  sharemii_pending_downloaded: { count: number };
  sharemii_sidecar_cleared: Record<string, never>;
  ugc_editor_replace: {
    kind: UgcKind;
    slot: number;
    thumb: boolean;
    fit: 'fill' | 'contain' | 'cover';
    matte: 'transparent' | 'white' | 'black' | 'custom';
  };
  ugc_editor_revert: { kind: UgcKind; slot: number };
  ugc_editor_export: { kind: UgcKind; slot: number };
  ugc_editor_rename: { kind: UgcKind; slot: number };
  ugc_editor_transform: { transform: 'rotateCw' | 'rotateCcw' | 'flipH' | 'flipV' };
  ugc_editor_pending_downloaded: { count: number };
  locale_changed: { from: string; to: string };
  theme_changed: { from: 'light' | 'dark'; to: 'light' | 'dark' };
  clear_all_requested: { count: number };
  clear_all_confirmed: { count: number };
  clear_all_cancelled: { count: number };
  advanced_warning_acknowledged: Record<string, never>;
  advanced_view_changed: { to: 'tree' | 'table' };
  advanced_name_searched: { matched: boolean };
  advanced_hash_copied: Record<string, never>;
  changelog_opened: { had_new: boolean; version: string };
  channel_switch_clicked: { from: 'beta' | 'stable'; to: 'beta' | 'stable' };
  external_link: { target: string };
  map_tool_selected: { tool: 'brush' | 'fill' | 'rectangle' | 'picker' };
  map_history: { direction: 'undo' | 'redo'; source: 'keyboard' | 'button' };
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
