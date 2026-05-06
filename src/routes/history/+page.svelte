<script lang="ts">
  import { zipSync } from 'fflate';
  import { _, locale } from 'svelte-i18n';
  import { track } from '$lib/analytics';
  import {
    clearHistory,
    deleteSnapshot,
    getSnapshotFiles,
    HISTORY_MAX_SNAPSHOTS,
    listSnapshotMeta,
    type HistorySnapshotMeta,
  } from '$lib/session/historyStore';
  import RouteMeta from '$lib/layout/RouteMeta.svelte';
  import { downloadBytes } from '$lib/sav/download';
  import { CARD_BASE_CLASS, PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import { showToast } from '$lib/toast/toast.svelte';

  let snapshots = $state<HistorySnapshotMeta[]>([]);
  let loading = $state(true);
  let busyId = $state<string | null>(null);
  let downloadingId = $state<string | null>(null);

  type Pending = { kind: 'one'; snap: HistorySnapshotMeta } | { kind: 'all' };
  let pending = $state<Pending | null>(null);
  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    const want = pending !== null;
    if (want && !dialog.open) dialog.showModal();
    else if (!want && dialog.open) dialog.close();
  });

  $effect(() => {
    void refresh();
  });

  async function refresh(): Promise<void> {
    loading = true;
    snapshots = await listSnapshotMeta();
    loading = false;
  }

  function pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  function fileTimestamp(t: number): string {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  const dateFormatter = $derived(
    new Intl.DateTimeFormat($locale ?? 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  );

  const numberFormatter = $derived(new Intl.NumberFormat($locale ?? 'en-US'));

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function downloadSnapshot(snap: HistorySnapshotMeta): Promise<void> {
    if (downloadingId !== null) return;
    downloadingId = snap.id;
    try {
      const files = await getSnapshotFiles(snap.id);
      if (!files) {
        showToast('error', $_('history.toast.download_failed'));
        return;
      }
      const entries: Record<string, Uint8Array> = {};
      for (const file of files.saves) entries[file.name] = file.bytes;
      for (const file of files.ugc) entries[`Ugc/${file.name}`] = file.bytes;
      const zipped = zipSync(entries, { level: 6 });
      const stamp = fileTimestamp(snap.savedAt);
      const slug =
        (snap.playerName ?? 'save').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 32) || 'save';
      downloadBytes(zipped, `LTD-history-${slug}-${stamp}.zip`);
      track('history_downloaded', {
        kinds: snap.saveFiles.map((f) => f.kind).join(','),
        kind_count: snap.saveFiles.length,
      });
    } finally {
      downloadingId = null;
    }
  }

  function askDelete(snap: HistorySnapshotMeta): void {
    pending = { kind: 'one', snap };
    track('history_delete_requested', {});
  }

  function askClearAll(): void {
    pending = { kind: 'all' };
    track('history_clear_requested', { count: snapshots.length });
  }

  function cancelPending(): void {
    if (pending?.kind === 'all') {
      track('history_clear_cancelled', { count: snapshots.length });
    } else if (pending?.kind === 'one') {
      track('history_delete_cancelled', {});
    }
    pending = null;
  }

  async function confirmPending(): Promise<void> {
    const target = pending;
    pending = null;
    if (!target) return;
    if (target.kind === 'one') {
      busyId = target.snap.id;
      await deleteSnapshot(target.snap.id);
      busyId = null;
      track('history_delete_confirmed', {});
    } else {
      const count = snapshots.length;
      await clearHistory();
      track('history_clear_confirmed', { count });
    }
    await refresh();
  }

  function onBackdrop(event: MouseEvent): void {
    if (event.target === dialog) cancelPending();
  }

  function kindLabel(kind: string): string {
    return $_(`tab.${kind}`);
  }

  const dialogTitle = $derived(
    pending?.kind === 'all' ? $_('history.clear_title') : $_('history.delete_title'),
  );
  const dialogBody = $derived(
    pending?.kind === 'all' ? $_('history.clear_body') : $_('history.delete_body'),
  );
  const dialogConfirm = $derived(
    pending?.kind === 'all' ? $_('history.clear_all') : $_('history.delete'),
  );
  const dialogTarget = $derived(
    pending?.kind === 'one' ? (pending.snap.playerName ?? $_('history.unknown_player')) : null,
  );
</script>

<RouteMeta title="History - LTD Save Editor" />

<div class="space-y-5">
  <header class="space-y-1.5">
    <h1 class="text-2xl font-bold text-content-strong">{$_('history.title')}</h1>
    <p class="text-sm text-content">{$_('history.description')}</p>
  </header>

  <div
    role="alert"
    class="flex gap-3 rounded-2xl bg-danger-bg p-4 text-sm text-danger shadow-sm ring-1 ring-danger-edge"
  >
    <span aria-hidden="true" class="text-lg leading-none">⚠️</span>
    <div>
      <p class="font-bold">{$_('history.warning_title')}</p>
      <p class="mt-1">{$_('history.warning_body')}</p>
    </div>
  </div>

  <div
    class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface/40 px-4 py-3 text-sm text-content-muted ring-1 ring-edge/40"
  >
    <span>
      <span class="font-bold text-content-strong">{snapshots.length}</span>
      / {HISTORY_MAX_SNAPSHOTS}
      {$_('history.slots_used')}
    </span>
    {#if snapshots.length > 0}
      <button
        type="button"
        class="{PILL_BUTTON_CLASS} text-danger hover:bg-danger-bg"
        onclick={askClearAll}
      >
        {$_('history.clear_all')}
      </button>
    {/if}
  </div>

  {#if loading}
    <p class="rounded-2xl bg-surface/40 p-6 text-center text-sm text-content-muted">
      {$_('history.loading')}
    </p>
  {:else if snapshots.length === 0}
    <div class="rounded-2xl bg-surface/40 p-8 text-center ring-1 ring-edge/40">
      <p class="text-sm text-content-muted">{$_('history.empty')}</p>
    </div>
  {:else}
    <ul class="{CARD_BASE_CLASS} divide-y divide-edge/40 overflow-hidden">
      {#each snapshots as snap (snap.id)}
        <li
          class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5"
        >
          <div class="min-w-0 sm:flex-1">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p class="truncate text-sm font-bold text-content-strong">
                {snap.playerName ?? $_('history.unknown_player')}
              </p>
              {#if snap.islandName}
                <p class="truncate text-xs text-content-muted">- {snap.islandName}</p>
              {/if}
            </div>
            <p class="mt-0.5 text-xs text-content-muted">
              {dateFormatter.format(new Date(snap.savedAt))}
            </p>
          </div>

          <dl
            class="grid shrink-0 grid-cols-3 gap-2 text-center text-xs sm:flex sm:gap-4 sm:text-left"
          >
            <div class="sm:min-w-[3.5rem]">
              <dt class="text-[10px] font-bold tracking-wider text-content-muted uppercase">
                {$_('history.stat.miis')}
              </dt>
              <dd class="font-mono text-sm text-content-strong tabular-nums">
                {snap.miiCount != null ? numberFormatter.format(snap.miiCount) : '-'}
              </dd>
            </div>
            <div class="sm:min-w-[3.5rem]">
              <dt class="text-[10px] font-bold tracking-wider text-content-muted uppercase">
                {$_('history.stat.ugc')}
              </dt>
              <dd class="font-mono text-sm text-content-strong tabular-nums">
                {numberFormatter.format(snap.ugcFiles.length)}
              </dd>
            </div>
            <div class="sm:min-w-[4.5rem]">
              <dt class="text-[10px] font-bold tracking-wider text-content-muted uppercase">
                {$_('history.stat.size')}
              </dt>
              <dd class="font-mono text-sm text-content-strong tabular-nums">
                {formatBytes(snap.totalBytes)}
              </dd>
            </div>
          </dl>

          <div class="hidden shrink-0 flex-wrap gap-1 sm:flex">
            {#each snap.saveFiles as file (file.kind)}
              <span
                class="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-orange-500 uppercase ring-1 ring-orange-500/30"
              >
                {kindLabel(file.kind)}
              </span>
            {/each}
          </div>

          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="{PILL_BUTTON_CLASS} flex-1 sm:flex-none"
              disabled={downloadingId === snap.id}
              onclick={() => downloadSnapshot(snap)}
            >
              {$_('history.download')}
            </button>
            <button
              type="button"
              class="{PILL_BUTTON_CLASS} flex-1 text-danger hover:bg-danger-bg sm:flex-none"
              disabled={busyId === snap.id}
              onclick={() => askDelete(snap)}
            >
              {$_('history.delete')}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<dialog
  bind:this={dialog}
  onclose={cancelPending}
  onclick={onBackdrop}
  class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div class="border-b border-edge/40 bg-surface-muted/80 px-6 py-4">
    <h2 class="text-lg font-bold text-content-strong">{dialogTitle}</h2>
  </div>

  <div class="px-6 py-5">
    <p class="text-sm text-content">{dialogBody}</p>
    {#if dialogTarget}
      <p
        class="mt-3 truncate rounded-lg bg-surface-muted/60 px-3 py-2 font-bold text-content-strong"
      >
        {dialogTarget}
      </p>
    {/if}
    <p class="mt-4 flex gap-2 text-xs text-warn">
      <span aria-hidden="true">⚠️</span>
      <span>{$_('history.delete_warning')}</span>
    </p>
  </div>

  <div class="flex justify-end gap-2 border-t border-edge/40 bg-surface-muted/40 px-6 py-3">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={cancelPending}>
      {$_('bulk.cancel')}
    </button>
    <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={confirmPending}>
      {dialogConfirm}
    </button>
  </div>
</dialog>
