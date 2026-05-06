<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allRoomStyleGroups,
    type RoomStyleGroup,
    roomStyleGroupLabel,
    roomStyleVariantImageUrl,
  } from '$lib/sav/lists/roomStyleList.svelte';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import InventoryExpandableRow, { type SubItem } from './InventoryExpandableRow.svelte';
  import {
    applyQtyToSlots,
    applyStateToSlots,
    leafForHash,
    readSlotQty,
    readSlotState,
    type Slot,
    writeSlotQty,
    writeSlotState,
  } from './inventoryHelpers';
  import InventoryListPanel from './InventoryListPanel.svelte';

  const acc = $derived(playerAccessor());

  function variantSlot(group: RoomStyleGroup, variantIndex: number): Slot {
    const v = group.variants[variantIndex];
    if (!v) return { state: null, qty: null, index: null };
    return {
      state: leafForHash(v.stateHash),
      qty: leafForHash(v.ownNumHash),
      index: null,
      newlyOwned: leafForHash(v.newlyOwnedHash),
      mystery: v.mysteryHash != null ? leafForHash(v.mysteryHash) : null,
    };
  }

  function groupSlots(group: RoomStyleGroup): Slot[] {
    return group.variants.map((_v, i) => variantSlot(group, i));
  }

  const items = $derived(
    allRoomStyleGroups().filter((group) =>
      group.variants.some((v) => leafForHash(v.stateHash) || leafForHash(v.ownNumHash)),
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
      primaryState={readSlotState(acc, slots[0])}
      primaryQty={readSlotQty(acc, slots[0])}
      subItems={variantSubItems(group, label)}
      readSubState={(i) => readSlotState(acc, slots[i])}
      readSubQty={(i) => readSlotQty(acc, slots[i])}
      writeStateAll={(v) => applyStateToSlots(acc, slots, v)}
      writeQtyAll={(v) => applyQtyToSlots(acc, slots, v)}
      writeSubState={(i, v) => writeSlotState(acc, slots[i], v)}
      writeSubQty={(i, v) => writeSlotQty(acc, slots[i], v)}
      expandLabel={$_('player.inventory.expand_variants')}
      collapseLabel={$_('player.inventory.collapse_variants')}
    />
  {/snippet}
</InventoryListPanel>
