<script lang="ts">
  import InventoryRowBody from './InventoryRowBody.svelte';

  type Props = {
    imageUrl: string | null;
    label: string;
    internalName: string;
    hasState: boolean;
    hasQty: boolean;
    state: number;
    qty: number;
    onStateChange: (v: number) => void;
    onQtyChange: (v: number) => void;
  };
  let {
    imageUrl,
    label,
    internalName,
    hasState,
    hasQty,
    state,
    qty,
    onStateChange,
    onQtyChange,
  }: Props = $props();
</script>

<li class="inventory-row">
  <InventoryRowBody
    {imageUrl}
    {label}
    caption={internalName}
    {hasState}
    {hasQty}
    {state}
    {qty}
    {onStateChange}
    {onQtyChange}
  />
</li>

<style>
  .inventory-row {
    content-visibility: auto;
    contain-intrinsic-size: 72px auto;
  }
</style>
