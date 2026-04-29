<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { exportAllSaves, loadedKinds } from './bulkExport';
  import { bulkLoadFiles } from './bulkLoader.svelte';
  import { requestClearAll } from './clearAll.svelte';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from './styles';

  type Props = {
    dirty: boolean;
    actionLabel?: string;
    onAction?: () => void;
    extra?: Snippet;
  };
  let { dirty, actionLabel, onAction, extra }: Props = $props();

  let fileInput: HTMLInputElement;

  const exportableCount = $derived(loadedKinds().length);

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
      alert(e instanceof Error ? e.message : String(e));
    }
  }
</script>

<div
  class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-header/90 px-4 py-2.5 shadow-sm ring-1 ring-edge/60 sm:rounded-full sm:px-5"
>
  <div class="flex items-center gap-2.5">
    <span
      class="h-2.5 w-2.5 shrink-0 rounded-full"
      class:bg-orange-500={dirty}
      class:bg-surface-muted={!dirty}
      aria-hidden="true"
    ></span>
    <p class="text-sm font-bold text-content-strong">
      {dirty ? $_('save.unsaved_changes') : $_('save.no_changes')}
      {#if extra}{@render extra()}{/if}
    </p>
  </div>
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
    {#if onAction && actionLabel}
      <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={onAction}>
        {actionLabel}
      </button>
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
