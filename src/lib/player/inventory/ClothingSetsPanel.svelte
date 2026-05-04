<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allCoordinates,
    type Coordinate,
    COORD_COLOR_SLOTS,
    coordinateImageUrl,
    coordinateLabel,
  } from '$lib/sav/lists/coordinateList.svelte';
  import { PLAYER_SCHEMA } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import InventoryExpandableRow, { type SubItem } from './InventoryExpandableRow.svelte';
  import {
    applyQtyToSlots,
    applyStateToSlots,
    readSlotQty,
    readSlotState,
    type Slot,
    writeSlotQty,
    writeSlotState,
  } from './inventoryHelpers';
  import InventoryListPanel from './InventoryListPanel.svelte';

  const STATE_LEAF = PLAYER_SCHEMA.Player.CoordinateInfo.OwnInfoArray.State;
  const QTY_LEAF = PLAYER_SCHEMA.Player.CoordinateInfo.OwnInfoArray.OwnNum;

  const acc = $derived(playerAccessor());
  const hasState = $derived(acc != null && acc.has(STATE_LEAF));
  const hasQty = $derived(acc != null && acc.has(QTY_LEAF));

  const items = $derived(allCoordinates().filter((c) => c.saveIndex >= 0));

  function colorSlot(coord: Coordinate, colorIndex: number): Slot {
    return {
      state: hasState ? STATE_LEAF : null,
      qty: hasQty ? QTY_LEAF : null,
      index: coord.saveIndex * COORD_COLOR_SLOTS + colorIndex,
    };
  }

  function coordSlots(coord: Coordinate): Slot[] {
    return Array.from({ length: coord.colorCount }, (_v, c) => colorSlot(coord, c));
  }

  function colorSubItems(coord: Coordinate, label: string): SubItem[] {
    return Array.from({ length: coord.colorCount }, (_v, ci) => ({
      key: ci,
      imageUrl: coordinateImageUrl(coord, ci),
      imageLabel: `${label} #${ci + 1}`,
      label: $_('player.clothing_sets.color_label', { values: { index: ci + 1 } }),
    }));
  }
</script>

<InventoryListPanel
  available={hasState || hasQty}
  missingMessage={$_('player.clothing_sets.missing')}
  heading={$_('player.clothing_sets.heading')}
  captionFor={(count) => $_('player.clothing_sets.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={hasState}
  bulkHasQty={hasQty}
  note={$_('player.clothing_sets.color_note')}
  {items}
  label={(c, ui) => coordinateLabel(c, ui)}
  searchKeys={(c, ui) => [coordinateLabel(c, ui), c.name, c.category]}
  slotsFor={coordSlots}
  keyFor={(c) => c.saveIndex}
>
  {#snippet row(coord, slots, ui)}
    {@const label = coordinateLabel(coord, ui)}
    <InventoryExpandableRow
      imageUrl={coordinateImageUrl(coord, 0)}
      {label}
      caption={`${coord.name} · ${coord.category} · ${$_('player.clothing_sets.color_count', { values: { count: coord.colorCount } })}`}
      primaryState={readSlotState(acc, slots[0])}
      primaryQty={readSlotQty(acc, slots[0])}
      subItems={colorSubItems(coord, label)}
      readSubState={(ci) => readSlotState(acc, slots[ci])}
      readSubQty={(ci) => readSlotQty(acc, slots[ci])}
      writeStateAll={(v) => applyStateToSlots(acc, slots, v)}
      writeQtyAll={(v) => applyQtyToSlots(acc, slots, v)}
      writeSubState={(ci, v) => writeSlotState(acc, slots[ci], v)}
      writeSubQty={(ci, v) => writeSlotQty(acc, slots[ci], v)}
      expandLabel={$_('player.inventory.expand_colors')}
      collapseLabel={$_('player.inventory.collapse_colors')}
    />
  {/snippet}
</InventoryListPanel>
