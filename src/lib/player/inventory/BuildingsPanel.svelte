<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { murmur3_x86_32 } from '$lib/sav/hash';
  import {
    allItems,
    type Item,
    type ItemVariant,
    itemLabel,
    itemVariantImageUrl,
  } from '$lib/sav/lists/itemList.svelte';
  import { PLAYER_SCHEMA } from '$lib/sav/schema';
  import InventoryExpandableRow, { type SubItem } from './InventoryExpandableRow.svelte';
  import { filterBySearch, sortByLabel } from './inventoryHelpers';
  import InventoryPanel from './InventoryPanel.svelte';
  import { OBTAINED_HASH } from './stateOptions';

  const KEY_HASH = PLAYER_SCHEMA.Player.BuildingInfo2.KeyHash;
  const OWN_NUM = PLAYER_SCHEMA.Player.BuildingInfo2.OwnNum;
  const STATE = PLAYER_SCHEMA.Player.BuildingInfo2.State;

  const LOCK_HASH = murmur3_x86_32('Lock') >>> 0;

  const acc = $derived(playerAccessor());
  const hasKey = $derived(acc != null && acc.has(KEY_HASH));
  const hasOwnNum = $derived(acc != null && acc.has(OWN_NUM));
  const hasState = $derived(acc != null && acc.has(STATE));

  const slotByVariantHash = $derived.by(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const map = new Map<number, number>();
    if (!acc || !hasKey) return map;
    const arr = acc.get(KEY_HASH) as number[];
    for (let i = 0; i < arr.length; i++) {
      const k = arr[i] >>> 0;
      if (k !== 0 && !map.has(k)) map.set(k, i);
    }
    return map;
  });

  function claimSlotFor(variantHash: number): number | null {
    if (!acc || !hasKey) return null;
    const existing = slotByVariantHash.get(variantHash);
    if (existing != null) return existing;
    const arr = acc.get(KEY_HASH) as number[];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] >>> 0 === 0) {
        acc.setElement(KEY_HASH, i, variantHash >>> 0);
        return i;
      }
    }
    return null;
  }

  function readState(variant: ItemVariant): number {
    if (!acc || !hasState) return 0;
    const idx = slotByVariantHash.get(variant.hash);
    if (idx == null) return LOCK_HASH;
    try {
      return (acc.getElement(STATE, idx) as number) >>> 0;
    } catch {
      return 0;
    }
  }

  function readQty(variant: ItemVariant): number {
    if (!acc || !hasOwnNum) return 0;
    const idx = slotByVariantHash.get(variant.hash);
    if (idx == null) return 0;
    try {
      const v = acc.getElement(OWN_NUM, idx) as number;
      return v < 0 ? 0 : v;
    } catch {
      return 0;
    }
  }

  function writeStateAt(idx: number, value: number): void {
    if (!acc || !hasState) return;
    try {
      acc.setElement(STATE, idx, value >>> 0);
    } catch {
      /* swallow */
    }
  }

  function writeQtyAt(idx: number, value: number): void {
    if (!acc || !hasOwnNum) return;
    const v = Math.max(0, Math.trunc(value));
    try {
      acc.setElement(OWN_NUM, idx, v);
    } catch {
      /* swallow */
    }
  }

  function bumpStateOnFirstAcquire(idx: number, prevQty: number, newQty: number): void {
    if (!acc || !hasState) return;
    if (prevQty !== 0 || newQty <= 0) return;
    try {
      if ((acc.getElement(STATE, idx) as number) >>> 0 === OBTAINED_HASH) return;
    } catch {
      return;
    }
    writeStateAt(idx, OBTAINED_HASH);
  }

  function writeVariantState(variant: ItemVariant, value: number): void {
    const idx = claimSlotFor(variant.hash);
    if (idx == null) return;
    writeStateAt(idx, value);
  }

  function writeVariantQty(variant: ItemVariant, value: number): void {
    const idx = claimSlotFor(variant.hash);
    if (idx == null) return;
    const prev = readQty(variant);
    const newQty = Math.max(0, Math.trunc(value));
    writeQtyAt(idx, newQty);
    bumpStateOnFirstAcquire(idx, prev, newQty);
  }

  function applyStateToVariants(variants: Iterable<ItemVariant>, value: number): void {
    for (const v of variants) writeVariantState(v, value);
  }

  function applyQtyToVariants(variants: Iterable<ItemVariant>, value: number): void {
    const v = Math.max(0, Math.trunc(value));
    for (const variant of variants) writeVariantQty(variant, v);
  }

  let query = $state('');
  const ui = $derived($locale);
  const available = $derived(hasKey && (hasOwnNum || hasState));

  const sorted = $derived(sortByLabel(allItems(), (it) => itemLabel(it, ui), ui));
  const visible = $derived(
    filterBySearch(sorted, query, function* (it) {
      yield itemLabel(it, ui);
      yield it.name;
      for (const v of it.variants) yield v.name;
    }),
  );
  const visibleVariants = $derived(visible.flatMap((it) => it.variants));

  function variantSubItems(item: Item, label: string): SubItem[] {
    return item.variants.map((variant, i) => ({
      key: variant.name,
      imageUrl: itemVariantImageUrl(variant),
      imageLabel: `${label} #${i + 1}`,
      label: $_('player.buildings.variant_label', {
        values: { index: i + 1, color: variant.color },
      }),
      internalName: variant.name,
    }));
  }

  function categoryCaption(item: Item): string {
    const kind =
      item.category === 'f'
        ? $_('player.buildings.category_facility')
        : $_('player.buildings.category_object');
    const variantCount = $_('player.buildings.variant_count', {
      values: { count: item.variants.length },
    });
    return `${kind} · ${variantCount}`;
  }
</script>

<InventoryPanel
  {available}
  missingMessage={$_('player.buildings.missing')}
  heading={$_('player.buildings.heading')}
  caption={$_('player.buildings.caption', { values: { count: visible.length } })}
  {query}
  setQuery={(v) => (query = v)}
  visibleCount={visible.length}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={hasState}
  bulkHasQty={hasOwnNum}
  onApplyState={(v) => applyStateToVariants(visibleVariants, v)}
  onApplyQty={(v) => applyQtyToVariants(visibleVariants, v)}
  note={$_('player.buildings.variant_note')}
>
  {#snippet rows()}
    {#each visible as item (item.name)}
      {@const label = itemLabel(item, ui)}
      {@const primary = item.variants[0]}
      <InventoryExpandableRow
        imageUrl={itemVariantImageUrl(primary)}
        {label}
        caption={categoryCaption(item)}
        primaryState={readState(primary)}
        primaryQty={readQty(primary)}
        subItems={variantSubItems(item, label)}
        readSubState={(i) => readState(item.variants[i])}
        readSubQty={(i) => readQty(item.variants[i])}
        writeStateAll={(v) => applyStateToVariants(item.variants, v)}
        writeQtyAll={(v) => applyQtyToVariants(item.variants, v)}
        writeSubState={(i, v) => writeVariantState(item.variants[i], v)}
        writeSubQty={(i, v) => writeVariantQty(item.variants[i], v)}
        expandLabel={$_('player.inventory.expand_variants')}
        collapseLabel={$_('player.inventory.collapse_variants')}
      />
    {/each}
  {/snippet}
</InventoryPanel>
