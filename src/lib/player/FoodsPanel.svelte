<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { allFoods, type Food, foodImageUrl, foodLabel } from '../sav/foodList.svelte';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import {
    buildEntryMap,
    readSlotQty,
    readSlotState,
    type Slot,
    writeSlotQty,
    writeSlotState,
  } from './inventoryHelpers';
  import InventoryListPanel from './InventoryListPanel.svelte';
  import InventoryRow from './InventoryRow.svelte';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const byHash = $derived(buildEntryMap(entries));

  const STATE_HASH = murmur3_x86_32('Player.FoodInfo.State') >>> 0;
  const OWN_NUM_HASH = murmur3_x86_32('Player.FoodInfo.OwnNum') >>> 0;

  const stateEntry = $derived(byHash.get(STATE_HASH) ?? null);
  const ownNumEntry = $derived(byHash.get(OWN_NUM_HASH) ?? null);

  const items = $derived(allFoods().filter((f) => f.id >= 0));

  function slotFor(food: Food): Slot {
    return { state: stateEntry, qty: ownNumEntry, index: food.id };
  }
</script>

<InventoryListPanel
  available={!!stateEntry || !!ownNumEntry}
  missingMessage={$_('player.foods.missing')}
  heading={$_('player.foods.heading')}
  captionFor={(count) => $_('player.foods.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState={!!stateEntry}
  bulkHasQty={!!ownNumEntry}
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
      hasState={!!stateEntry}
      hasQty={!!ownNumEntry}
      state={readSlotState(slot)}
      qty={readSlotQty(slot)}
      onStateChange={(v) => writeSlotState(slot, v)}
      onQtyChange={(v) => writeSlotQty(slot, v)}
    />
  {/snippet}
</InventoryListPanel>
