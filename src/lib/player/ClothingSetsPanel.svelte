<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allCoordinates,
    type Coordinate,
    COORD_COLOR_SLOTS,
    coordinateImageUrl,
    coordinateLabel,
  } from '../sav/coordinateList.svelte';
  import { murmur3_x86_32 } from '../sav/hash';
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

  const STATE_HASH = murmur3_x86_32('Player.CoordinateInfo.OwnInfoArray.State') >>> 0;
  const OWN_NUM_HASH = murmur3_x86_32('Player.CoordinateInfo.OwnInfoArray.OwnNum') >>> 0;

  const stateEntry = $derived(byHash.get(STATE_HASH) ?? null);
  const ownNumEntry = $derived(byHash.get(OWN_NUM_HASH) ?? null);

  const items = $derived(allCoordinates().filter((c) => c.saveIndex >= 0));

  function colorSlot(coord: Coordinate, colorIndex: number): Slot {
    return {
      state: stateEntry,
      qty: ownNumEntry,
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
  available={!!stateEntry || !!ownNumEntry}
  missingMessage={$_('player.clothing_sets.missing')}
  heading={$_('player.clothing_sets.heading')}
  captionFor={(count) => $_('player.clothing_sets.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={!!stateEntry}
  bulkHasQty={!!ownNumEntry}
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
      primaryState={readSlotState(slots[0])}
      primaryQty={readSlotQty(slots[0])}
      subItems={colorSubItems(coord, label)}
      readSubState={(ci) => readSlotState(slots[ci])}
      readSubQty={(ci) => readSlotQty(slots[ci])}
      writeStateAll={(v) => applyStateToSlots(slots, v)}
      writeQtyAll={(v) => applyQtyToSlots(slots, v)}
      writeSubState={(ci, v) => writeSlotState(slots[ci], v)}
      writeSubQty={(ci, v) => writeSlotQty(slots[ci], v)}
      expandLabel={$_('player.inventory.expand_colors')}
      collapseLabel={$_('player.inventory.collapse_colors')}
    />
  {/snippet}
</InventoryListPanel>
