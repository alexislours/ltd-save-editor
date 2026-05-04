<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { SidecarSource, UgcKind } from '$lib/shareMii';
  import { isSlotEdited, type UgcRow } from './ugcEditorPage';
  import UgcSlotRow from './UgcSlotRow.svelte';

  type Props = {
    rows: UgcRow[];
    kind: UgcKind;
    sidecar: SidecarSource;
    selectedSlot: number | null;
    onSelect: (slot: number) => void;
  };

  let { rows, kind, sidecar, selectedSlot, onSelect }: Props = $props();
</script>

<h3 class="mb-2 text-sm font-bold text-content-strong">
  {$_('ugc_editor.list.title', { values: { count: rows.length } })}
</h3>
{#if rows.length === 0}
  <p class="text-sm text-content-muted">{$_('ugc_editor.list.empty')}</p>
{:else}
  <ul
    data-tutorial="ugc-rows"
    class="max-h-[480px] divide-y divide-edge/40 overflow-y-auto rounded-lg bg-surface-sunken ring-1 ring-edge/40"
  >
    {#each rows as r (r.slot)}
      <UgcSlotRow
        slot={r.slot}
        name={r.name}
        {kind}
        {sidecar}
        selected={selectedSlot === r.slot}
        edited={isSlotEdited(kind, r.slot)}
        {onSelect}
      />
    {/each}
  </ul>
{/if}
