<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    COMPACT_SELECT_CLASS,
    LABEL_CLASS,
    PILL_BUTTON_CLASS,
    PRIMARY_BUTTON_CLASS,
  } from '$lib/ui/styles';
  import type { Row } from './shareMiiPage';

  type Props = {
    rows: Row[];
    importFile: File | null;
    importSlot: number | null;
    working: boolean;
    onCancel: () => void;
    onApply: () => void;
  };

  let {
    rows,
    importFile = $bindable(),
    importSlot = $bindable(),
    working,
    onCancel,
    onApply,
  }: Props = $props();

  function handleFile(event: Event): void {
    const target = event.target as HTMLInputElement;
    importFile = target.files?.[0] ?? null;
  }
</script>

<div
  data-tutorial="sharemii-import-panel"
  class="mb-4 rounded-xl bg-surface-sunken p-3 sm:p-4 ring-1 ring-edge/40"
>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block">
      <span class={LABEL_CLASS}>{$_('sharemii.import.file_label')}</span>
      <input
        data-tutorial="sharemii-import-file"
        type="file"
        accept=".ltd,.ltdf,.ltdc,.ltdg,.ltdi,.ltde,.ltdo,.ltdl,.zip"
        class={COMPACT_SELECT_CLASS + ' w-full'}
        onchange={handleFile}
      />
      {#if importFile}
        <span class="mt-1 block truncate font-mono text-xs text-content-muted"
          >{importFile.name}</span
        >
      {/if}
    </label>
    <label class="block">
      <span class={LABEL_CLASS}>{$_('sharemii.import.target_label')}</span>
      <select
        data-tutorial="sharemii-import-target"
        class={COMPACT_SELECT_CLASS + ' w-full'}
        bind:value={importSlot}
      >
        {#each rows as r (r.slot)}
          <option value={r.slot}>
            {#if r.isAddNew}
              {$_('sharemii.import.option_add_new', { values: { slot: r.slot } })}
            {:else if r.isTemp}
              {$_('sharemii.import.option_in_progress')}
            {:else}
              {$_('sharemii.import.option_slot', {
                values: { slot: r.slot, name: r.name },
              })}
            {/if}
          </option>
        {/each}
      </select>
    </label>
  </div>
  <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={onCancel} disabled={working}
      >{$_('sharemii.import.cancel')}</button
    >
    <button
      type="button"
      data-tutorial="sharemii-import-apply"
      class={PRIMARY_BUTTON_CLASS}
      onclick={onApply}
      disabled={working || !importFile || importSlot === null}
    >
      {working ? $_('sharemii.import.applying') : $_('sharemii.import.apply')}
    </button>
  </div>
</div>
