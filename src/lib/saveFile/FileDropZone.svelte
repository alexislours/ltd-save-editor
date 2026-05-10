<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { expectedFileName, type SaveKind } from '$lib/saveFile/types';
  import DropZone from '$lib/ui/DropZone.svelte';
  import UploadArrowIcon from '$lib/ui/UploadArrowIcon.svelte';

  type Props = { kind?: SaveKind };
  let { kind }: Props = $props();

  let error = $state<string | null>(null);
  let summary = $state<{ loaded: SaveKind[]; skipped: number } | null>(null);

  function reset(): void {
    error = null;
    summary = null;
  }

  function reportOutcome(loaded: SaveKind[], skipped: number, totalSeen: number): void {
    if (loaded.length === 0) {
      if (totalSeen === 0) error = $_('save.read_failed');
      else error = $_('bulk.none_recognized');
      return;
    }
    summary = { loaded, skipped };
  }

  async function onFiles(files: File[]): Promise<void> {
    reset();
    if (files.length === 0) return;
    const { bulkLoadFiles } = await import('$lib/bulk/bulkLoader.svelte');
    const outcome = await bulkLoadFiles(files);
    if (outcome.cancelled) return;
    reportOutcome(outcome.loaded, outcome.skipped.length, files.length);
  }

  async function onDataTransfer(dt: DataTransfer): Promise<void> {
    reset();
    const { bulkLoadFromDataTransfer } = await import('$lib/bulk/bulkLoader.svelte');
    const outcome = await bulkLoadFromDataTransfer(dt);
    if (outcome.cancelled) return;
    const seen = outcome.loaded.length + outcome.skipped.length;
    reportOutcome(outcome.loaded, outcome.skipped.length, seen);
  }
</script>

<div class="w-full">
  <DropZone multiple accept=".sav,.zip" paddingClass="p-12" {onFiles} {onDataTransfer}>
    {#snippet children({ openPicker })}
      <UploadArrowIcon />
      <p class="text-base font-bold text-content-strong">
        {kind
          ? $_('save.drop_here', { values: { fileName: expectedFileName[kind] } })
          : $_('save.drop_here_multi')}
      </p>
      <p class="text-sm text-content-muted">{$_('bulk.drop_hint')}</p>

      <button
        type="button"
        class="mt-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken"
        onclick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
      >
        {$_('save.drop_browse')}
      </button>
    {/snippet}
  </DropZone>

  <div class="mt-3 text-center">
    <p class="inline-block text-xs text-warn">
      <span class="font-semibold">{$_('save.drop_warning_label')}</span>
      {$_('save.drop_warning_text')}
    </p>
  </div>

  {#if summary}
    <div
      role="status"
      class="mt-3 flex items-start gap-2 rounded-lg border border-edge/60 bg-surface-muted px-4 py-3 text-sm text-content shadow-sm"
    >
      <svg
        class="mt-0.5 h-5 w-5 shrink-0 text-orange-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p class="font-semibold text-content-strong">
          {$_('bulk.loaded_count', { values: { count: summary.loaded.length } })}
        </p>
        <p class="mt-0.5 text-xs">
          {summary.loaded.map((k) => $_(`tab.${k}`)).join(', ')}
        </p>
        {#if summary.skipped > 0}
          <p class="mt-0.5 text-xs text-warn">
            {$_('bulk.skipped_count', { values: { count: summary.skipped } })}
          </p>
        {/if}
      </div>
    </div>
  {/if}

  {#if error}
    <div
      role="alert"
      class="mt-3 flex items-start gap-2 rounded-lg border border-danger-edge bg-danger-bg px-4 py-3 text-sm text-danger shadow-sm"
    >
      <svg
        class="mt-0.5 h-5 w-5 shrink-0 text-danger"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.342 3.94l-8.4 14.55A1.5 1.5 0 003.243 21h17.514a1.5 1.5 0 001.301-2.51l-8.4-14.55a1.5 1.5 0 00-2.598 0z"
        />
      </svg>
      <p class="font-semibold">{error}</p>
    </div>
  {/if}
</div>
