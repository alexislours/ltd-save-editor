<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { errorMessage } from '$lib/errorMessage';
  import { CARD_CLASS, PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import type { UgcKind } from './index';
  import type { Row } from './shareMiiPage';
  import ShareMiiImportPanel from './ShareMiiImportPanel.svelte';
  import ShareMiiSlotList from './ShareMiiSlotList.svelte';

  type Props = {
    isMii: boolean;
    activeKind: 'Mii' | UgcKind;
    working: boolean;
    rows: Row[];
    populatedRows: Row[];
    addNewRow: Row | null;
    rowsError: unknown;
    sidecarMissing: boolean;
    importOpen: boolean;
    importFile: File | null;
    importSlot: number | null;
    onExportAll: () => void;
    onOpenImport: (slot: number | null) => void;
    onCancelImport: () => void;
    onApplyImport: () => void;
    onExportRow: (row: Row) => void;
  };

  let {
    isMii,
    activeKind,
    working,
    rows,
    populatedRows,
    addNewRow,
    rowsError,
    sidecarMissing,
    importOpen,
    importFile = $bindable(),
    importSlot = $bindable(),
    onExportAll,
    onOpenImport,
    onCancelImport,
    onApplyImport,
    onExportRow,
  }: Props = $props();
</script>

<section class={CARD_CLASS}>
  <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h3 class="text-base font-bold text-content-strong">
        {isMii ? $_('sharemii.kind.Mii') : $_(`sharemii.kind.${activeKind}`)}
      </h3>
      <p class="mt-0.5 text-xs text-content-muted">
        {$_('sharemii.list.header_count', { values: { count: populatedRows.length } })}
        {#if !isMii && addNewRow}
          · {$_('sharemii.list.header_add_new', { values: { slot: addNewRow.slot } })}
        {/if}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class={PILL_BUTTON_CLASS}
        onclick={onExportAll}
        disabled={working || populatedRows.length === 0 || (!isMii && sidecarMissing)}
      >
        {$_('sharemii.list.export_all')}
      </button>
      <button
        type="button"
        class={PRIMARY_BUTTON_CLASS}
        onclick={() => onOpenImport(addNewRow?.slot ?? populatedRows[0]?.slot ?? null)}
        disabled={working}
      >
        {$_('sharemii.list.import')}
      </button>
    </div>
  </header>

  {#if importOpen}
    <ShareMiiImportPanel
      {rows}
      bind:importFile
      bind:importSlot
      {working}
      onCancel={onCancelImport}
      onApply={onApplyImport}
    />
  {/if}

  {#if rowsError}
    <p
      role="alert"
      class="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2 text-sm text-danger"
    >
      {$_('sharemii.list.read_failed', { values: { error: errorMessage(rowsError) } })}
    </p>
  {:else if rows.length === 0}
    <p class="text-sm text-content-muted">{$_('sharemii.list.no_slots')}</p>
  {:else}
    <ShareMiiSlotList
      {rows}
      {working}
      {isMii}
      {sidecarMissing}
      {onExportRow}
      onOpenImportFor={onOpenImport}
    />
  {/if}
</section>
