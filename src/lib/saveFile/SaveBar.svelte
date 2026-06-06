<script lang="ts">
  import { _ } from 'virtual:i18n/_shared';
  import { track } from '$lib/analytics';
  import { exportAllSaves, loadedKinds } from '$lib/bulk/bulkExport';
  import { bulkLoadFiles } from '$lib/bulk/bulkLoader.svelte';
  import { requestClearAll } from '$lib/bulk/clearAll.svelte';
  import { errorMessage } from '$lib/errorMessage';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import { showToast } from '$lib/toast/toast.svelte';

  type Props = {
    dirty?: boolean;
    actionLabel?: string;
    onAction?: () => void;
    fileName?: string;
    fileMeta?: string;
    onReplace?: () => void;
    replaceLabel?: string;
  };
  let {
    dirty = false,
    actionLabel,
    onAction,
    fileName,
    fileMeta,
    onReplace,
    replaceLabel,
  }: Props = $props();

  let fileInput: HTMLInputElement;

  const exportableCount = $derived(loadedKinds().length);
  const hasPrimary = $derived((onReplace && replaceLabel) || (onAction && actionLabel));

  function onPick(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    target.value = '';
    if (files.length === 0) return;
    void bulkLoadFiles(files);
  }

  function exportAll(): void {
    try {
      exportAllSaves();
    } catch (e) {
      track('export_failed', { kind: 'bulk' });
      showToast('error', errorMessage(e));
    }
  }
</script>

{#snippet statusChip()}
  <span
    class={[
      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
      dirty
        ? 'bg-orange-500/15 text-warn ring-1 ring-orange-500/40'
        : 'bg-surface/70 text-content-muted ring-1 ring-edge/50',
    ]}
  >
    <span
      class={['h-2 w-2 rounded-full', dirty ? 'bg-orange-500' : 'bg-content-faint']}
      aria-hidden="true"
    ></span>
    {dirty ? $_('save.unsaved_changes') : $_('save.no_changes')}
  </span>
{/snippet}

<div
  class="flex flex-col gap-3 rounded-2xl bg-header/90 px-4 py-3 shadow-sm ring-1 ring-edge/60 sm:px-5"
>
  {#if fileName}
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-content-muted ring-1 ring-edge/60"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
            />
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="truncate font-mono text-sm font-bold leading-tight text-content-strong">
            {fileName}
          </p>
          {#if fileMeta}
            <p class="mt-0.5 truncate text-xs text-content">{fileMeta}</p>
          {/if}
        </div>
      </div>
      {@render statusChip()}
    </div>
  {/if}

  <div class="flex flex-wrap items-center gap-x-3 gap-y-2.5">
    {#if !fileName}
      {@render statusChip()}
    {/if}
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class={PILL_BUTTON_CLASS} onclick={() => fileInput.click()}>
        {$_('bulk.open_all')}
      </button>
      <button
        type="button"
        class={PILL_BUTTON_CLASS}
        onclick={exportAll}
        disabled={exportableCount === 0}
      >
        {$_('bulk.export_all', { values: { count: exportableCount } })}
      </button>
      <button
        type="button"
        class={PILL_BUTTON_CLASS}
        onclick={requestClearAll}
        disabled={exportableCount === 0}
      >
        {$_('bulk.clear_all')}
      </button>
    </div>

    {#if hasPrimary}
      <div class="ml-auto flex items-center gap-2">
        <span class="hidden h-6 w-px shrink-0 bg-edge/60 sm:block" aria-hidden="true"></span>
        {#if onReplace && replaceLabel}
          <button type="button" class={PILL_BUTTON_CLASS} onclick={onReplace}>
            {replaceLabel}
          </button>
        {/if}
        {#if onAction && actionLabel}
          <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={onAction}>
            {actionLabel}
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <input
    bind:this={fileInput}
    type="file"
    class="hidden"
    multiple
    accept=".sav,.zip"
    onchange={onPick}
  />
</div>
