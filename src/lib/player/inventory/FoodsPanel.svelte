<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { allFoods, type Food, foodImageUrl, foodLabel } from '$lib/sav/lists/foodList.svelte';
  import { PLAYER_SCHEMA } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import {
    readSlotQty,
    readSlotState,
    type Slot,
    writeSlotQty,
    writeSlotState,
  } from './inventoryHelpers';
  import InventoryListPanel from './InventoryListPanel.svelte';
  import InventoryRow from './InventoryRow.svelte';

  const STATE_LEAF = PLAYER_SCHEMA.Player.FoodInfo.State;
  const QTY_LEAF = PLAYER_SCHEMA.Player.FoodInfo.OwnNum;

  const acc = $derived(playerAccessor());
  const hasState = $derived(acc != null && acc.has(STATE_LEAF));
  const hasQty = $derived(acc != null && acc.has(QTY_LEAF));

  const items = $derived(allFoods().filter((f) => f.id >= 0));

  function slotFor(food: Food): Slot {
    return {
      state: hasState ? STATE_LEAF : null,
      qty: hasQty ? QTY_LEAF : null,
      index: food.id,
    };
  }
</script>

<InventoryListPanel
  available={hasState || hasQty}
  missingMessage={$_('player.foods.missing')}
  heading={$_('player.foods.heading')}
  captionFor={(count) => $_('player.foods.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={hasState}
  bulkHasQty={hasQty}
  {items}
  label={(f, ui) => foodLabel(f, ui)}
  searchKeys={(f, ui) => [foodLabel(f, ui), f.name]}
  slotsFor={(f) => [slotFor(f)]}
  keyFor={(f) => f.hash}
>
  {#snippet row(food, slots, ui)}
    {@const slot = slots[0]}
    <InventoryRow
      imageUrl={foodImageUrl(food.textureId)}
      label={foodLabel(food, ui)}
      internalName={food.name}
      {hasState}
      {hasQty}
      state={readSlotState(acc, slot)}
      qty={readSlotQty(acc, slot)}
      onStateChange={(v) => writeSlotState(acc, slot, v)}
      onQtyChange={(v) => writeSlotQty(acc, slot, v)}
    />
  {/snippet}
</InventoryListPanel>
