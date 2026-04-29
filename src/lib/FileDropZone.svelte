<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { bulkLoadFiles, bulkLoadFromDataTransfer } from './bulkLoader.svelte';
  import { expectedFileName, type SaveKind } from './saveFile.svelte';

  type Props = { kind: SaveKind };
  let { kind }: Props = $props();

  let dragging = $state(false);
  let error = $state<string | null>(null);
  let summary = $state<{ loaded: SaveKind[]; skipped: number } | null>(null);
  let fileInput: HTMLInputElement;

  const baseClass =
    'group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-surface p-12 text-center transition-colors';
  const draggingClass = 'border-orange-500 bg-surface-sunken';
  const idleClass = 'border-edge/70 hover:border-orange-500';

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

  async function handleFiles(files: File[]): Promise<void> {
    reset();
    if (files.length === 0) return;
    const outcome = await bulkLoadFiles(files);
    if (outcome.cancelled) return;
    reportOutcome(outcome.loaded, outcome.skipped.length, files.length);
  }

  async function onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    dragging = false;
    if (!event.dataTransfer) return;
    reset();
    const outcome = await bulkLoadFromDataTransfer(event.dataTransfer);
    if (outcome.cancelled) return;
    const seen = outcome.loaded.length + outcome.skipped.length;
    reportOutcome(outcome.loaded, outcome.skipped.length, seen);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    dragging = true;
  }

  function onPick(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    void handleFiles(files);
    target.value = '';
  }
</script>

<div class="w-full">
  <div
    role="button"
    tabindex="0"
    class="{baseClass} {dragging ? draggingClass : idleClass}"
    ondragover={onDragOver}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
    onclick={() => fileInput.click()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.click()}
  >
    <svg
      class="h-10 w-10 text-orange-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
    <p class="text-base font-bold text-content-strong">
      {$_('save.drop_here', { values: { fileName: expectedFileName[kind] } })}
    </p>
    <p class="text-sm text-content-muted">{$_('bulk.drop_hint')}</p>

    <button
      type="button"
      class="mt-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken"
      onclick={(e) => {
        e.stopPropagation();
        fileInput.click();
      }}
    >
      {$_('save.drop_browse')}
    </button>

    <input
      bind:this={fileInput}
      type="file"
      class="hidden"
      multiple
      accept=".sav,.zip"
      onchange={onPick}
    />
  </div>

  <p class="mt-3 text-center text-xs text-warn">
    <span class="font-semibold">{$_('save.drop_warning_label')}</span>
    {$_('save.drop_warning_text')}
  </p>

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
