<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allRoomStyleGroups,
    type RoomStyleGroup,
    roomStyleGroupLabel,
    roomStyleVariantImageUrl,
  } from '../sav/roomStyleList.svelte';
  import type { Entry } from '../sav/types';
  import InventoryExpandableRow, { type SubItem } from './InventoryExpandableRow.svelte';
  import {
    applyQtyToSlots,
    applyStateToSlots,
    buildEntryMap,
    readSlotQty,
    readSlotState,
    type Slot,
    writeSlotQty,
    writeSlotState,
  } from './inventoryHelpers';
  import InventoryListPanel from './InventoryListPanel.svelte';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const byHash = $derived(buildEntryMap(entries));

  function variantSlot(group: RoomStyleGroup, variantIndex: number): Slot {
    const v = group.variants[variantIndex];
    if (!v) return { state: null, qty: null, index: null };
    return {
      state: byHash.get(v.stateHash) ?? null,
      qty: byHash.get(v.ownNumHash) ?? null,
      index: null,
      newlyOwned: byHash.get(v.newlyOwnedHash) ?? null,
      mystery: v.mysteryHash != null ? (byHash.get(v.mysteryHash) ?? null) : null,
    };
  }

  function groupSlots(group: RoomStyleGroup): Slot[] {
    return group.variants.map((_v, i) => variantSlot(group, i));
  }

  const items = $derived(
    allRoomStyleGroups().filter((group) =>
      group.variants.some((v) => byHash.has(v.stateHash) || byHash.has(v.ownNumHash)),
    ),
  );

  function variantSubItems(group: RoomStyleGroup, label: string): SubItem[] {
    return group.variants.map((variant) => ({
      key: variant.name,
      imageUrl: roomStyleVariantImageUrl(variant),
      imageLabel: `${label} #${variant.variantIndex + 1}`,
      label: $_('player.interiors.variant_label', {
        values: { index: variant.variantIndex + 1 },
      }),
      internalName: variant.name,
    }));
  }
</script>

<InventoryListPanel
  available={items.length > 0}
  missingMessage={$_('player.interiors.missing')}
  heading={$_('player.interiors.heading')}
  captionFor={(count) => $_('player.interiors.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState
  bulkHasQty
  note={$_('player.interiors.variant_note')}
  {items}
  label={(g, ui) => roomStyleGroupLabel(g, ui)}
  searchKeys={function* (g, ui) {
    yield roomStyleGroupLabel(g, ui);
    yield g.groupKey;
    for (const v of g.variants) yield v.name;
  }}
  slotsFor={groupSlots}
  keyFor={(g) => g.groupKey}
>
  {#snippet row(group, slots, ui)}
    {@const label = roomStyleGroupLabel(group, ui)}
    <InventoryExpandableRow
      imageUrl={roomStyleVariantImageUrl(group.variants[0])}
      {label}
      caption={`${group.groupKey} · ${$_('player.interiors.variant_count', { values: { count: group.variants.length } })}`}
      primaryState={readSlotState(slots[0])}
      primaryQty={readSlotQty(slots[0])}
      subItems={variantSubItems(group, label)}
      readSubState={(i) => readSlotState(slots[i])}
      readSubQty={(i) => readSlotQty(slots[i])}
      writeStateAll={(v) => applyStateToSlots(slots, v)}
      writeQtyAll={(v) => applyQtyToSlots(slots, v)}
      writeSubState={(i, v) => writeSlotState(slots[i], v)}
      writeSubQty={(i, v) => writeSlotQty(slots[i], v)}
      expandLabel={$_('player.inventory.expand_variants')}
      collapseLabel={$_('player.inventory.collapse_variants')}
    />
  {/snippet}
</InventoryListPanel>
