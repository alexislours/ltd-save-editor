import { track } from './analytics';
import {
  applyBulkPlan,
  filesFromDataTransfer,
  planBulkLoad,
  planFromZip,
  type BulkPlan,
} from './bulkLoad';
import { getPath, navigate } from './navigation.svelte';
import { SAVE_KINDS, type SaveKind } from './saveFile.svelte';

export type BulkOutcome = {
  loaded: SaveKind[];
  skipped: BulkPlan['skipped'];
  cancelled: boolean;
};

type Pending = {
  plan: BulkPlan;
  resolve: (outcome: BulkOutcome) => void;
};

const modal = $state<{ open: boolean; conflicts: SaveKind[] }>({
  open: false,
  conflicts: [],
});
let pending: Pending | null = null;

export const overwriteModal = modal;

function redirectIfNeeded(loaded: SaveKind[]): void {
  if (loaded.length === 0) return;
  const path = getPath();
  const currentKind = SAVE_KINDS.find((k) => path === `/${k}`);
  if (currentKind && loaded.includes(currentKind)) return;
  const target = SAVE_KINDS.find((k) => loaded.includes(k));
  if (target) navigate(`/${target}`);
}

function commit(plan: BulkPlan, resolve: (o: BulkOutcome) => void): void {
  const loaded = applyBulkPlan(plan);
  track('load_completed', {
    kinds: loaded.join(','),
    kind_count: loaded.length,
    skipped: plan.skipped.length,
    conflicts: plan.conflicts.length,
    from_zip: planFromZip(plan),
  });
  redirectIfNeeded(loaded);
  resolve({ loaded, skipped: plan.skipped, cancelled: false });
}

async function runPlan(plan: BulkPlan): Promise<BulkOutcome> {
  if (plan.matches.size === 0) {
    return { loaded: [], skipped: plan.skipped, cancelled: false };
  }
  if (plan.conflicts.length === 0) {
    return await new Promise<BulkOutcome>((resolve) => commit(plan, resolve));
  }
  return await new Promise<BulkOutcome>((resolve) => {
    pending = { plan, resolve };
    modal.conflicts = plan.conflicts;
    modal.open = true;
  });
}

export async function bulkLoadFiles(files: File[]): Promise<BulkOutcome> {
  track('load_attempted', {
    file_count: files.length,
    has_zip: files.some((f) => /\.zip$/i.test(f.name)),
  });
  const plan = await planBulkLoad(files);
  return await runPlan(plan);
}

export async function bulkLoadFromDataTransfer(dt: DataTransfer): Promise<BulkOutcome> {
  const files = await filesFromDataTransfer(dt);
  return await bulkLoadFiles(files);
}

export function confirmOverwrite(): void {
  if (!pending) {
    modal.open = false;
    return;
  }
  const { plan, resolve } = pending;
  pending = null;
  modal.open = false;
  commit(plan, resolve);
}

export function cancelOverwrite(): void {
  if (!pending) {
    modal.open = false;
    return;
  }
  const { plan, resolve } = pending;
  pending = null;
  modal.open = false;
  track('load_cancelled', { conflicts: plan.conflicts.length });
  resolve({ loaded: [], skipped: plan.skipped, cancelled: true });
}
