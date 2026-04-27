<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { arrayCount } from '../sav/codec';
  import {
    allCloths,
    type Cloth,
    CLOTH_COLOR_SLOTS,
    clothImageUrl,
    clothLabel,
  } from '../sav/clothList.svelte';
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

  const STATE_HASH = murmur3_x86_32('Player.ClothInfo.OwnInfoArray.State') >>> 0;
  const OWN_NUM_HASH = murmur3_x86_32('Player.ClothInfo.OwnInfoArray.OwnNum') >>> 0;

  const stateEntry = $derived(byHash.get(STATE_HASH) ?? null);
  const ownNumEntry = $derived(byHash.get(OWN_NUM_HASH) ?? null);

  const stateLen = $derived(stateEntry ? arrayCount(stateEntry) : 0);
  const ownNumLen = $derived(ownNumEntry ? arrayCount(ownNumEntry) : 0);

  function inRange(cloth: Cloth, len: number): boolean {
    return cloth.index >= 0 && cloth.index * CLOTH_COLOR_SLOTS < len;
  }

  const items = $derived.by(() => {
    const max = Math.max(stateLen, ownNumLen);
    return allCloths().filter((c) => inRange(c, max));
  });

  function colorSlot(cloth: Cloth, colorIndex: number): Slot {
    return {
      state: stateEntry,
      qty: ownNumEntry,
      index: cloth.index * CLOTH_COLOR_SLOTS + colorIndex,
    };
  }

  function clothSlots(cloth: Cloth): Slot[] {
    return Array.from({ length: cloth.colorCount }, (_v, c) => colorSlot(cloth, c));
  }

  function colorSubItems(cloth: Cloth, label: string): SubItem[] {
    return Array.from({ length: cloth.colorCount }, (_v, ci) => ({
      key: ci,
      imageUrl: clothImageUrl(cloth, ci),
      imageLabel: `${label} #${ci + 1}`,
      label: $_('player.clothes.color_label', { values: { index: ci + 1 } }),
    }));
  }
</script>

<InventoryListPanel
  available={!!stateEntry || !!ownNumEntry}
  missingMessage={$_('player.clothes.missing')}
  heading={$_('player.clothes.heading')}
  captionFor={(count) => $_('player.clothes.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={!!stateEntry}
  bulkHasQty={!!ownNumEntry}
  note={$_('player.clothes.color_note')}
  {items}
  label={(c, ui) => clothLabel(c, ui)}
  searchKeys={(c, ui) => [clothLabel(c, ui), c.name]}
  slotsFor={clothSlots}
  keyFor={(c) => c.index}
>
  {#snippet row(cloth, slots, ui)}
    {@const label = clothLabel(cloth, ui)}
    <InventoryExpandableRow
      imageUrl={clothImageUrl(cloth, 0)}
      {label}
      caption={`${cloth.name} · ${$_('player.clothes.color_count', { values: { count: cloth.colorCount } })}`}
      primaryState={readSlotState(slots[0])}
      primaryQty={readSlotQty(slots[0])}
      subItems={colorSubItems(cloth, label)}
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
