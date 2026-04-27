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

<div class="flex items-center gap-3 px-3 py-2">
  {#if leading}{@render leading()}{/if}

  <InventoryImageButton {imageUrl} {label} size="md" />

  <div class="min-w-0 flex-1">
    <div class="truncate text-sm font-bold text-content-strong">{label}</div>
    <div class="truncate font-mono text-[11px] text-content-faint">{caption}</div>
  </div>

  {#if hasState}
    <InventoryStateSelect value={state} onChange={onStateChange} />
  {/if}

  {#if hasQty}
    <InventoryQtyStepper value={qty} onChange={onQtyChange} />
  {/if}
</div>
