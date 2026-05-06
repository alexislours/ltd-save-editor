<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allCloths,
    type Cloth,
    CLOTH_COLOR_SLOTS,
    clothImageUrl,
    clothLabel,
  } from '$lib/sav/lists/clothList.svelte';
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

  const STATE_LEAF = PLAYER_SCHEMA.Player.ClothInfo.OwnInfoArray.State;
  const QTY_LEAF = PLAYER_SCHEMA.Player.ClothInfo.OwnInfoArray.OwnNum;

  const acc = $derived(playerAccessor());
  const hasState = $derived(acc != null && acc.has(STATE_LEAF));
  const hasQty = $derived(acc != null && acc.has(QTY_LEAF));

  const stateLen = $derived(acc && hasState ? (acc.get(STATE_LEAF) as number[]).length : 0);
  const ownNumLen = $derived(acc && hasQty ? (acc.get(QTY_LEAF) as number[]).length : 0);

  function inRange(cloth: Cloth, len: number): boolean {
    return cloth.index >= 0 && cloth.index * CLOTH_COLOR_SLOTS < len;
  }

  const items = $derived.by(() => {
    const max = Math.max(stateLen, ownNumLen);
    return allCloths().filter((c) => inRange(c, max));
  });

  function colorSlot(cloth: Cloth, colorIndex: number): Slot {
    return {
      state: hasState ? STATE_LEAF : null,
      qty: hasQty ? QTY_LEAF : null,
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
  available={hasState || hasQty}
  missingMessage={$_('player.clothes.missing')}
  heading={$_('player.clothes.heading')}
  captionFor={(count) => $_('player.clothes.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={hasState}
  bulkHasQty={hasQty}
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
      primaryState={readSlotState(acc, slots[0])}
      primaryQty={readSlotQty(acc, slots[0])}
      subItems={colorSubItems(cloth, label)}
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
