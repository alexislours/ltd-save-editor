<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allTreasures,
    type Treasure,
    treasureImageUrl,
    treasureLabel,
  } from '$lib/sav/lists/treasureList.svelte';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import {
    leafForHash,
    readSlotQty,
    readSlotState,
    type Slot,
    writeSlotQty,
    writeSlotState,
  } from './inventoryHelpers';
  import InventoryListPanel from './InventoryListPanel.svelte';
  import InventoryRow from './InventoryRow.svelte';

  const acc = $derived(playerAccessor());

  function slotFor(t: Treasure): Slot {
    return {
      state: leafForHash(t.stateHash),
      qty: leafForHash(t.ownNumHash),
      index: null,
    };
  }

  const items = $derived(
    allTreasures().filter((t) => leafForHash(t.stateHash) || leafForHash(t.ownNumHash)),
  );
</script>

<InventoryListPanel
  available={items.length > 0}
  missingMessage={$_('player.treasures.missing')}
  heading={$_('player.treasures.heading')}
  captionFor={(count) => $_('player.treasures.caption', { values: { count } })}
  emptyMessage={$_('player.inventory.empty')}
  bulkHasState
  bulkHasQty
  {items}
  label={(t, ui) => treasureLabel(t, ui)}
  searchKeys={(t, ui) => [treasureLabel(t, ui), t.name]}
  slotsFor={(t) => [slotFor(t)]}
  keyFor={(t) => t.name}
>
  {#snippet row(treasure, slots, ui)}
    {@const slot = slots[0]}
    <InventoryRow
      imageUrl={treasureImageUrl(treasure)}
      label={treasureLabel(treasure, ui)}
      internalName={treasure.name}
      hasState={!!slot.state}
      hasQty={!!slot.qty}
      state={readSlotState(acc, slot)}
      qty={readSlotQty(acc, slot)}
      onStateChange={(v) => writeSlotState(acc, slot, v)}
      onQtyChange={(v) => writeSlotQty(acc, slot, v)}
    />
  {/snippet}
</InventoryListPanel>
