<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import {
    arrGetEnum,
    arrGetInt,
    arrGetUInt,
    arrSetEnum,
    arrSetInt,
    arrSetUInt,
    arrayCount,
  } from '../sav/codec';
  import { murmur3_x86_32 } from '../sav/hash';
  import {
    allItems,
    type Item,
    type ItemVariant,
    itemLabel,
    itemVariantImageUrl,
  } from '../sav/itemList.svelte';
  import type { Entry } from '../sav/types';
  import InventoryExpandableRow, { type SubItem } from './InventoryExpandableRow.svelte';
  import { buildEntryMap, filterBySearch, sortByLabel } from './inventoryHelpers';
  import InventoryPanel from './InventoryPanel.svelte';
  import { OBTAINED_HASH } from './stateOptions';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const KEYHASH_HASH = murmur3_x86_32('Player.BuildingInfo2.KeyHash') >>> 0;
  const OWNNUM_HASH = murmur3_x86_32('Player.BuildingInfo2.OwnNum') >>> 0;
  const STATE_HASH = murmur3_x86_32('Player.BuildingInfo2.State') >>> 0;
  const LOCK_HASH = murmur3_x86_32('Lock') >>> 0;

  const byHash = $derived(buildEntryMap(entries));
  const keyHashEntry = $derived(byHash.get(KEYHASH_HASH) ?? null);
  const ownNumEntry = $derived(byHash.get(OWNNUM_HASH) ?? null);
  const stateEntry = $derived(byHash.get(STATE_HASH) ?? null);

  const slotByVariantHash = $derived.by(() => {
    void playerState.tick;
    const map = new SvelteMap<number, number>();
    if (!keyHashEntry) return map;
    const n = arrayCount(keyHashEntry);
    for (let i = 0; i < n; i++) {
      const k = arrGetUInt(keyHashEntry, i);
      if (k !== 0 && !map.has(k)) map.set(k, i);
    }
    return map;
  });

  function claimSlotFor(variantHash: number): number | null {
    if (!keyHashEntry) return null;
    const existing = slotByVariantHash.get(variantHash);
    if (existing != null) return existing;
    const n = arrayCount(keyHashEntry);
    for (let i = 0; i < n; i++) {
      if (arrGetUInt(keyHashEntry, i) === 0) {
        arrSetUInt(keyHashEntry, i, variantHash);
        markDirty(keyHashEntry);
        return i;
      }
    }
    return null;
  }

  function readState(variant: ItemVariant): number {
    if (!stateEntry) return 0;
    void playerState.tick;
    const idx = slotByVariantHash.get(variant.hash);
    if (idx == null) return LOCK_HASH;
    try {
      return arrGetEnum(stateEntry, idx);
    } catch {
      return 0;
    }
  }

  function readQty(variant: ItemVariant): number {
    if (!ownNumEntry) return 0;
    void playerState.tick;
    const idx = slotByVariantHash.get(variant.hash);
    if (idx == null) return 0;
    try {
      const v = arrGetInt(ownNumEntry, idx);
      return v < 0 ? 0 : v;
    } catch {
      return 0;
    }
  }

  function writeStateRaw(variant: ItemVariant, value: number): boolean {
    if (!stateEntry) return false;
    const idx = claimSlotFor(variant.hash);
    if (idx == null) return false;
    try {
      arrSetEnum(stateEntry, idx, value >>> 0);
      return true;
    } catch {
      return false;
    }
  }

  function writeQtyRaw(variant: ItemVariant, value: number): boolean {
    if (!ownNumEntry) return false;
    const idx = claimSlotFor(variant.hash);
    if (idx == null) return false;
    const v = Math.max(0, Math.trunc(value));
    try {
      arrSetInt(ownNumEntry, idx, v);
      return true;
    } catch {
      return false;
    }
  }

  function bumpStateOnFirstAcquire(variant: ItemVariant, prevQty: number, newQty: number): boolean {
    if (!stateEntry) return false;
    if (prevQty !== 0 || newQty <= 0) return false;
    const idx = slotByVariantHash.get(variant.hash);
    if (idx == null) return false;
    try {
      if (arrGetEnum(stateEntry, idx) === OBTAINED_HASH) return false;
    } catch {
      return false;
    }
    arrSetEnum(stateEntry, idx, OBTAINED_HASH);
    return true;
  }

  function writeVariantState(variant: ItemVariant, value: number): void {
    if (writeStateRaw(variant, value) && stateEntry) markDirty(stateEntry);
  }

  function writeVariantQty(variant: ItemVariant, value: number): void {
    const newQty = Math.max(0, Math.trunc(value));
    const prev = readQty(variant);
    if (!writeQtyRaw(variant, newQty)) return;
    if (ownNumEntry) markDirty(ownNumEntry);
    if (bumpStateOnFirstAcquire(variant, prev, newQty) && stateEntry) markDirty(stateEntry);
  }

  function applyStateToVariants(variants: Iterable<ItemVariant>, value: number): void {
    let dirtyState = false;
    for (const v of variants) if (writeStateRaw(v, value)) dirtyState = true;
    if (dirtyState && stateEntry) markDirty(stateEntry);
  }

  function applyQtyToVariants(variants: Iterable<ItemVariant>, value: number): void {
    const v = Math.max(0, Math.trunc(value));
    let dirtyQty = false;
    let dirtyState = false;
    for (const variant of variants) {
      const prev = readQty(variant);
      if (!writeQtyRaw(variant, v)) continue;
      dirtyQty = true;
      if (v > 0 && bumpStateOnFirstAcquire(variant, prev, v)) dirtyState = true;
    }
    if (dirtyQty && ownNumEntry) markDirty(ownNumEntry);
    if (dirtyState && stateEntry) markDirty(stateEntry);
  }

  let query = $state('');
  const ui = $derived($locale);
  const available = $derived(!!keyHashEntry && (!!ownNumEntry || !!stateEntry));

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
  bulkHasState={!!stateEntry}
  bulkHasQty={!!ownNumEntry}
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
