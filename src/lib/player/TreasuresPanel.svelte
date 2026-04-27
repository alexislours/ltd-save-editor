<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allTreasures,
    type Treasure,
    treasureImageUrl,
    treasureLabel,
  } from '../sav/treasureList.svelte';
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

  function slotFor(t: Treasure): Slot {
    return {
      state: byHash.get(t.stateHash) ?? null,
      qty: byHash.get(t.ownNumHash) ?? null,
      index: null,
    };
  }

  const items = $derived(
    allTreasures().filter((t) => byHash.has(t.stateHash) || byHash.has(t.ownNumHash)),
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
      state={readSlotState(slot)}
      qty={readSlotQty(slot)}
      onStateChange={(v) => writeSlotState(slot, v)}
      onQtyChange={(v) => writeSlotQty(slot, v)}
    />
  {/snippet}
</InventoryListPanel>
