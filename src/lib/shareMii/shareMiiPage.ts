import { unzipSync } from 'fflate';
import {
  applyMii,
  applyUgc,
  extractMii,
  extractUgc,
  listMiiSlots,
  listUgcSlots,
  type SidecarSource,
  type UgcKind,
} from './index';
import type { MiiSaves, PlayerOnlySaves } from './codec/savAccess';
import {
  markPendingSidecars,
  mergeSidecarFiles,
  sidecarOrigin,
} from './sidecar/sidecarStore.svelte';

export type Row = {
  slot: number;
  name: string;
  isTemp?: boolean;
  isAddNew?: boolean;
  empty?: boolean;
};

type RowsResult = { rows: Row[]; error: unknown };

type RowLabels = {
  inProgressMii: string;
  miiDefault: (slot: number) => string;
  addNew: string;
  slotDefault: (slot: number) => string;
};

export function buildMiiRows(saves: MiiSaves | null, labels: RowLabels): RowsResult {
  if (!saves) return { rows: [], error: null };
  try {
    const list = listMiiSlots(saves);
    const rows = list
      .filter((s) => s.slot === 0 || !s.empty)
      .map<Row>((s) => ({
        slot: s.slot,
        name: s.slot === 0 ? labels.inProgressMii : s.name || labels.miiDefault(s.slot),
        isTemp: s.slot === 0,
      }));
    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: e };
  }
}

export function buildUgcRows(
  saves: PlayerOnlySaves | null,
  kind: UgcKind,
  sidecar: SidecarSource,
  labels: RowLabels,
): RowsResult {
  if (!saves) return { rows: [], error: null };
  try {
    const rows = listUgcSlots(saves, kind, sidecar).map<Row>((s) => ({
      slot: s.slot,
      name: s.isAddNew ? labels.addNew : s.name || labels.slotDefault(s.slot),
      isAddNew: s.isAddNew,
      empty: s.empty,
    }));
    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: e };
  }
}

const LTD_EXT_RX = /\.(ltd|ltdf|ltdc|ltdg|ltdi|ltde|ltdo|ltdl)$/i;

async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export async function expandImportFile(file: File): Promise<{ name: string; bytes: Uint8Array }[]> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return [{ name: file.name, bytes: await readBytes(file) }];
  }
  const buf = await readBytes(file);
  const entries = unzipSync(buf);
  const out: { name: string; bytes: Uint8Array }[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    if (LTD_EXT_RX.test(name)) {
      out.push({ name: name.split('/').pop() ?? name, bytes: bytes as Uint8Array });
    }
  }
  return out;
}

export type ImportFailure = { fileName: string; reason: string };

export function formatFailureList(failures: ImportFailure[]): string {
  return failures.map((f) => `${f.fileName}: ${f.reason}`).join('; ');
}

type RunImportContext =
  | { kind: 'Mii'; saves: MiiSaves; slot: number; sidecar: SidecarSource }
  | {
      kind: UgcKind;
      saves: PlayerOnlySaves;
      slot: number;
      isAdding: boolean;
      sidecar: SidecarSource;
    };

type ImportRunResult = {
  count: number;
  failures: ImportFailure[];
  writes: { name: string; bytes: Uint8Array }[];
};

export function runImport(
  ctx: RunImportContext,
  files: { name: string; bytes: Uint8Array }[],
  toMessage: (e: unknown) => string,
): ImportRunResult {
  const writes: { name: string; bytes: Uint8Array }[] = [];
  const failures: ImportFailure[] = [];
  let count = 0;
  for (const f of files) {
    try {
      if (ctx.kind === 'Mii') {
        const r = applyMii(ctx.saves, ctx.slot, f.bytes, ctx.sidecar);
        writes.push(...r.facepaintWrites);
      } else {
        const r = applyUgc(ctx.saves, ctx.slot, ctx.kind, f.bytes, ctx.isAdding, ctx.sidecar);
        writes.push(...r.textureWrites);
      }
      count++;
    } catch (e) {
      failures.push({ fileName: f.name, reason: toMessage(e) });
      console.warn('ShareMii import failed', f.name, e);
    }
  }
  return { count, failures, writes };
}

export function commitImportWrites(writes: { name: string; bytes: Uint8Array }[]): void {
  if (writes.length === 0) return;
  const fresh = new Map<string, Uint8Array>();
  for (const w of writes) fresh.set(w.name, w.bytes);
  const origin = sidecarOrigin();
  mergeSidecarFiles(origin === 'none' ? 'folder' : origin, fresh);
  markPendingSidecars(fresh);
}

type ExportContext = { kind: 'Mii'; saves: MiiSaves } | { kind: UgcKind; saves: PlayerOnlySaves };

export function collectExportEntries(
  ctx: ExportContext,
  rows: Row[],
  sidecar: SidecarSource,
): { name: string; bytes: Uint8Array }[] {
  const dir: { name: string; bytes: Uint8Array }[] = [];
  for (const r of rows) {
    if (ctx.kind === 'Mii' && r.isTemp) continue;
    try {
      const out =
        ctx.kind === 'Mii'
          ? extractMii(ctx.saves, r.slot, sidecar)
          : extractUgc(ctx.saves, r.slot, ctx.kind, sidecar);
      dir.push({ name: out.fileName, bytes: out.bytes });
    } catch (e) {
      console.warn('skip slot', r.slot, e);
    }
  }
  return dir;
}
