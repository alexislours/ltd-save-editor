<script lang="ts">
  import type { Snippet } from 'svelte';
  import InventoryImageButton from './InventoryImageButton.svelte';
  import InventoryQtyStepper from './InventoryQtyStepper.svelte';
  import InventoryStateSelect from './InventoryStateSelect.svelte';

  type Props = {
    imageUrl: string | null;
    label: string;
    caption: string;
    hasState?: boolean;
    hasQty?: boolean;
    state: number;
    qty: number;
    onStateChange: (v: number) => void;
    onQtyChange: (v: number) => void;
    leading?: Snippet;
  };

  let {
    imageUrl,
    label,
    caption,
    hasState = true,
    hasQty = true,
    state,
    qty,
    onStateChange,
    onQtyChange,
    leading,
  }: Props = $props();
</script>

<div
  class="row-grid items-center gap-x-3 gap-y-2 px-3 py-2 transition-colors duration-150 hover:bg-surface-sunken/30"
>
  <div class="flex min-w-0 items-center gap-3">
    {#if leading}{@render leading()}{/if}

    <InventoryImageButton {imageUrl} {label} size="md" />

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-bold text-content-strong">{label}</div>
      <div class="truncate font-mono text-[11px] text-content-faint">{caption}</div>
    </div>
  </div>

  <div class="row-controls flex items-center justify-end gap-2">
    {#if hasState}
      <InventoryStateSelect value={state} onChange={onStateChange} />
    {/if}

    {#if hasQty}
      <InventoryQtyStepper value={qty} onChange={onQtyChange} />
    {/if}
  </div>
</div>

<style>
  .row-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .row-controls {
    grid-column: 1;
  }
  @container (min-width: 30rem) {
    .row-grid {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .row-controls {
      grid-column: 2;
    }
  }
</style>
