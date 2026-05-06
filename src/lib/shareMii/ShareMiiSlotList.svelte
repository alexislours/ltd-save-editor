<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import type { Row } from './shareMiiPage';

  type Props = {
    rows: Row[];
    working: boolean;
    isMii: boolean;
    sidecarMissing: boolean;
    onExportRow: (row: Row) => void;
    onOpenImportFor: (slot: number) => void;
  };

  let { rows, working, isMii, sidecarMissing, onExportRow, onOpenImportFor }: Props = $props();
</script>

<ul data-tutorial="sharemii-rows" class="divide-y divide-edge/40">
  {#each rows as r (r.slot)}
    <li class="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
      <span class="shrink-0 basis-12 font-mono text-xs text-content-muted" aria-hidden="true">
        {r.isTemp
          ? $_('sharemii.list.row_temp_marker')
          : $_('sharemii.list.row_slot_marker', { values: { slot: r.slot } })}
      </span>
      <span
        class={[
          'min-w-0 flex-1 basis-40 truncate text-sm',
          r.isAddNew ? 'italic text-content-muted' : 'text-content-strong',
        ]}
      >
        {r.name}
      </span>
      <div class="flex shrink-0 basis-full flex-wrap items-center gap-1.5 sm:basis-auto">
        {#if r.isAddNew}
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            onclick={() => onOpenImportFor(r.slot)}
            disabled={working}
          >
            {$_('sharemii.list.add_here')}
          </button>
        {:else}
          <button
            type="button"
            data-tutorial-row-export
            class={PILL_BUTTON_CLASS}
            onclick={() => onExportRow(r)}
            disabled={working || (!isMii && sidecarMissing)}
          >
            {$_('sharemii.list.export')}
          </button>
          <button
            type="button"
            data-tutorial-row-replace
            class={PILL_BUTTON_CLASS}
            onclick={() => onOpenImportFor(r.slot)}
            disabled={working}
          >
            {$_('sharemii.list.replace')}
          </button>
        {/if}
      </div>
    </li>
  {/each}
</ul>
