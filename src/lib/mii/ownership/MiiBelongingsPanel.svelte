<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    allCloths,
    CLOTH_COLOR_SLOTS,
    type Cloth,
    clothImageUrl,
    clothLabel,
  } from '$lib/sav/lists/clothList.svelte';
  import {
    allCoordinates,
    type Coordinate,
    COORD_COLOR_SLOTS,
    coordinateImageUrl,
    coordinateLabel,
  } from '$lib/sav/lists/coordinateList.svelte';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { mii, MII_SCHEMA } from '$lib/sav/schema';
  import { CARD_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import MiiGoodsPocketPanel from './MiiGoodsPocketPanel.svelte';
  import MiiOwnedBitmaskPanel from './MiiOwnedBitmaskPanel.svelte';
  import MiiSlotSelector from '$lib/mii/MiiSlotSelector.svelte';
  import MiiWornOutfit from '$lib/mii/outfit/MiiWornOutfit.svelte';
  import { createOwnershipBitmask } from './ownershipBitmask';

  type Props = {
    selectedIndex: number | null;
  };
  let { selectedIndex = $bindable(null) }: Props = $props();

  const SLOTS_PER_MII = 1200;
  const COORD_SLOTS_PER_MII = 400;

  const accessor = $derived(miiAccessor());
  const clothOwn = bindLeaf(miiAccessor, mii.Mii.Belongings.ClothOwnInfo);
  const coordOwn = bindLeaf(miiAccessor, mii.Mii.Belongings.CoordinateOwnInfo);

  const clothBitmask = $derived(
    createOwnershipBitmask({
      mii: accessor,
      leaf: clothOwn.present ? MII_SCHEMA.Mii.Belongings.ClothOwnInfo : null,
      totalCount: clothOwn.value?.length ?? 0,
      miiIndex: selectedIndex,
      slotsPerMii: SLOTS_PER_MII,
      colorSlots: CLOTH_COLOR_SLOTS,
    }),
  );

  const coordBitmask = $derived(
    createOwnershipBitmask({
      mii: accessor,
      leaf: coordOwn.present ? MII_SCHEMA.Mii.Belongings.CoordinateOwnInfo : null,
      totalCount: coordOwn.value?.length ?? 0,
      miiIndex: selectedIndex,
      slotsPerMii: COORD_SLOTS_PER_MII,
      colorSlots: COORD_COLOR_SLOTS,
    }),
  );

  const ownableCloths = $derived(allCloths().filter((c) => c.index < SLOTS_PER_MII));
  const ownableCoordinates = $derived(
    allCoordinates().filter((c) => c.saveIndex >= 0 && c.saveIndex < COORD_SLOTS_PER_MII),
  );

  function clothCategory(name: string): string {
    const m = name.match(/^Cloth([A-Z][a-z]+)/);
    return m ? m[1] : 'Other';
  }
</script>

{#if !accessor || !clothOwn.present}
  <div class="grid gap-4">
    <MiiSlotSelector bind:selectedIndex />
    <section class={CARD_CLASS}>
      <p class="text-sm text-content-muted">{$_('mii.belongings.missing')}</p>
    </section>
  </div>
{:else}
  <div class="grid gap-4">
    <MiiSlotSelector bind:selectedIndex />

    <MiiWornOutfit {selectedIndex} {clothBitmask} {coordBitmask} />

    {#if selectedIndex != null}
      <MiiGoodsPocketPanel {selectedIndex} />

      <MiiOwnedBitmaskPanel
        {selectedIndex}
        items={ownableCloths}
        bitmask={clothBitmask}
        keyFor={(c: Cloth) => c.index}
        indexFor={(c: Cloth) => c.index}
        labelFor={clothLabel}
        nameFor={(c: Cloth) => c.name}
        colorCountFor={(c: Cloth) => c.colorCount}
        imageUrlFor={clothImageUrl}
        categoryOf={(c: Cloth) => clothCategory(c.name)}
        heading={$_('mii.belongings.heading')}
        caption={$_('mii.belongings.caption')}
        summaryFor={(items, total) => $_('mii.belongings.summary', { values: { items, total } })}
      />

      {#if coordBitmask.available}
        <MiiOwnedBitmaskPanel
          {selectedIndex}
          items={ownableCoordinates}
          bitmask={coordBitmask}
          keyFor={(c: Coordinate) => c.saveIndex}
          indexFor={(c: Coordinate) => c.saveIndex}
          labelFor={coordinateLabel}
          nameFor={(c: Coordinate) => c.name}
          colorCountFor={(c: Coordinate) => c.colorCount}
          imageUrlFor={coordinateImageUrl}
          subtitleFor={(c: Coordinate) => `${c.name} · ${c.category}`}
          heading={$_('mii.belongings.coords_heading')}
          caption={$_('mii.belongings.coords_caption')}
          summaryFor={(items, total) =>
            $_('mii.belongings.coords_summary', { values: { items, total } })}
        />
      {/if}
    {/if}
  </div>
{/if}
