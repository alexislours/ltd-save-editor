<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { locale } from 'svelte-i18n';
  import InventoryPanel from './InventoryPanel.svelte';
  import {
    applyQtyToSlots,
    applyStateToSlots,
    filterBySearch,
    type Slot,
    sortByLabel,
  } from './inventoryHelpers';

  type Props = {
    available: boolean;
    missingMessage: string;
    heading: string;
    captionFor: (count: number) => string;
    emptyMessage: string;
    bulkHasState: boolean;
    bulkHasQty: boolean;
    note?: string;
    items: readonly T[];
    label: (item: T, locale: string | null | undefined) => string;
    searchKeys: (item: T, locale: string | null | undefined) => Iterable<string>;
    slotsFor: (item: T) => Slot[];
    keyFor: (item: T) => string | number;
    row: Snippet<[T, Slot[], string | null | undefined]>;
  };

  let {
    available,
    missingMessage,
    heading,
    captionFor,
    emptyMessage,
    bulkHasState,
    bulkHasQty,
    note,
    items,
    label,
    searchKeys,
    slotsFor,
    keyFor,
    row,
  }: Props = $props();

  let query = $state('');
  const ui = $derived($locale);
  const sorted = $derived(sortByLabel(items, (i) => label(i, ui), ui));
  const visible = $derived(filterBySearch(sorted, query, (i) => searchKeys(i, ui)));
  const visibleSlots = $derived(visible.flatMap(slotsFor));
</script>

<InventoryPanel
  {available}
  {missingMessage}
  {heading}
  caption={captionFor(visible.length)}
  {query}
  setQuery={(v) => (query = v)}
  visibleCount={visible.length}
  {emptyMessage}
  {bulkHasState}
  {bulkHasQty}
  onApplyState={(v) => applyStateToSlots(visibleSlots, v)}
  onApplyQty={(v) => applyQtyToSlots(visibleSlots, v)}
  {note}
>
  {#snippet rows()}
    {#each visible as item (keyFor(item))}
      {@render row(item, slotsFor(item), ui)}
    {/each}
  {/snippet}
</InventoryPanel>
