<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { arrayCount } from '../sav/codec';
  import {
    allCloths,
    CLOTH_COLOR_SLOTS,
    type Cloth,
    clothImageUrl,
    clothLabel,
  } from '../sav/clothList.svelte';
  import {
    allCoordinates,
    type Coordinate,
    COORD_COLOR_SLOTS,
    coordinateImageUrl,
    coordinateLabel,
  } from '../sav/coordinateList.svelte';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS } from '../styles';
  import MiiGoodsPocketPanel from './MiiGoodsPocketPanel.svelte';
  import MiiOwnedBitmaskPanel from './MiiOwnedBitmaskPanel.svelte';
  import MiiSlotSelector from './MiiSlotSelector.svelte';
  import MiiWornOutfit from './MiiWornOutfit.svelte';
  import { createOwnershipBitmask } from './ownershipBitmask';

  type Props = {
    entries: Entry[];
    selectedIndex: number | null;
  };
  let { entries, selectedIndex = $bindable(null) }: Props = $props();

  const CLOTH_OWN_INFO_HASH = murmur3_x86_32('Mii.Belongings.ClothOwnInfo') >>> 0;
  const COORD_OWN_INFO_HASH = murmur3_x86_32('Mii.Belongings.CoordinateOwnInfo') >>> 0;
  const SLOTS_PER_MII = 1200;
  const COORD_SLOTS_PER_MII = 400;

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const clothEntry = $derived(byHash.get(CLOTH_OWN_INFO_HASH) ?? null);
  const coordOwnEntry = $derived(byHash.get(COORD_OWN_INFO_HASH) ?? null);

  const clothBitmask = $derived(
    createOwnershipBitmask({
      entry: clothEntry,
      totalCount: clothEntry ? arrayCount(clothEntry) : 0,
      miiIndex: selectedIndex,
      slotsPerMii: SLOTS_PER_MII,
      colorSlots: CLOTH_COLOR_SLOTS,
    }),
  );

  const coordBitmask = $derived(
    createOwnershipBitmask({
      entry: coordOwnEntry,
      totalCount: coordOwnEntry ? arrayCount(coordOwnEntry) : 0,
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

{#if !clothEntry}
  <div class="grid gap-4">
    <MiiSlotSelector {entries} bind:selectedIndex />
    <section class={CARD_CLASS}>
      <p class="text-sm text-content-muted">{$_('mii.belongings.missing')}</p>
    </section>
  </div>
{:else}
  <div class="grid gap-4">
    <MiiSlotSelector {entries} bind:selectedIndex />

    <MiiWornOutfit {byHash} {selectedIndex} {clothBitmask} {coordBitmask} />

    {#if selectedIndex != null}
      <MiiGoodsPocketPanel {byHash} {selectedIndex} />

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
