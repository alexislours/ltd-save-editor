<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import {
    allCloths,
    type Cloth,
    clothImageUrl,
    clothLabel,
  } from '$lib/sav/lists/clothList.svelte';
  import {
    allCoordinates,
    type Coordinate,
    coordinateByKey,
    coordinateImageUrl,
    coordinateLabel,
  } from '$lib/sav/lists/coordinateList.svelte';
  import { safe } from '$lib/sav/format';
  import { murmur3_x86_32 } from '$lib/sav/hash';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import type { SchemaLeaf } from '$lib/sav/schema/leaf';
  import { CARD_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import type { BitmaskAccess } from '$lib/mii/ownership/ownershipBitmask';
  import WornSlotEditor, { type ColorPicker, type WornOption } from './WornSlotEditor.svelte';

  type Props = {
    selectedIndex: number | null;
    clothBitmask: BitmaskAccess;
    coordBitmask: BitmaskAccess;
  };

  let { selectedIndex, clothBitmask, coordBitmask }: Props = $props();

  const mii = $derived(miiAccessor());
  const ui = $derived($locale);

  type WornSlotKey =
    | 'All'
    | 'Topslong'
    | 'Tops'
    | 'BottomsA'
    | 'BottomsB'
    | 'Headwear'
    | 'Shoes'
    | 'Accessory';

  type WornSlotConfig = {
    key: WornSlotKey;
    keyLeaf: SchemaLeaf;
    colorLeaf: SchemaLeaf;
    prefixes: string[];
  };

  const WORN_SLOTS: WornSlotConfig[] = [
    {
      key: 'All',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.All.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.All.ColorIndex,
      prefixes: ['ClothAll'],
    },
    {
      key: 'Topslong',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Topslong.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Topslong.ColorIndex,
      prefixes: ['ClothTopslong'],
    },
    {
      key: 'Tops',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Tops.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Tops.ColorIndex,
      prefixes: ['ClothTops'],
    },
    {
      key: 'BottomsA',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.BottomsA.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.BottomsA.ColorIndex,
      prefixes: ['ClothBottoms'],
    },
    {
      key: 'BottomsB',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.BottomsB.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.BottomsB.ColorIndex,
      prefixes: ['ClothBottoms', 'ClothSocks'],
    },
    {
      key: 'Headwear',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Headwear.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Headwear.ColorIndex,
      prefixes: ['ClothHeadwear'],
    },
    {
      key: 'Shoes',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Shoes.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Shoes.ColorIndex,
      prefixes: ['ClothShoes'],
    },
    {
      key: 'Accessory',
      keyLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Accessory.KeyHash,
      colorLeaf: MII_SCHEMA.Mii.MiiMisc.ClothInfo.Accessory.ColorIndex,
      prefixes: ['ClothAccessory'],
    },
  ];

  const COORDINATE_KEY_LEAF = MII_SCHEMA.Mii.MiiMisc.ClothInfo.Coordinate.KeyHash;
  const COORDINATE_COLOR_LEAF = MII_SCHEMA.Mii.MiiMisc.ClothInfo.Coordinate.ColorIndex;

  const sortedCloths = $derived.by(() => {
    return [...allCloths()].sort((a, b) => {
      const an = clothLabel(a, ui).toLocaleLowerCase();
      const bn = clothLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const clothByNameHash = $derived.by(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const m = new Map<number, Cloth>();
    for (const c of allCloths()) m.set(murmur3_x86_32(c.name) >>> 0, c);
    return m;
  });

  type WornSlotState = {
    config: WornSlotConfig;
    hasKey: boolean;
    hasColor: boolean;
    keyHash: number;
    cloth: Cloth | null;
    colorIndex: number;
  };

  const wornSlots = $derived.by<WornSlotState[]>(() => {
    return WORN_SLOTS.map((cfg) => {
      const hasKey = mii != null && mii.has(cfg.keyLeaf);
      const hasColor = mii != null && mii.has(cfg.colorLeaf);
      let keyHash = 0;
      let colorIndex = 0;
      if (mii && selectedIndex != null) {
        if (hasKey) {
          keyHash = safe(() => mii.getElement(cfg.keyLeaf, selectedIndex!) as number, 0) >>> 0;
        }
        if (hasColor) {
          colorIndex = safe(() => mii.getElement(cfg.colorLeaf, selectedIndex!) as number, 0);
        }
      }
      const cloth = keyHash === 0 ? null : (clothByNameHash.get(keyHash) ?? null);
      return { config: cfg, hasKey, hasColor, keyHash, cloth, colorIndex };
    });
  });

  const hasCoordKey = $derived(mii != null && mii.has(COORDINATE_KEY_LEAF));
  const hasCoordColor = $derived(mii != null && mii.has(COORDINATE_COLOR_LEAF));

  const coordKeyHash = $derived.by(() => {
    if (!mii || !hasCoordKey || selectedIndex == null) return 0;
    return safe(() => mii.getElement(COORDINATE_KEY_LEAF, selectedIndex!) as number, 0) >>> 0;
  });

  const coordColorIndex = $derived.by(() => {
    if (!mii || !hasCoordColor || selectedIndex == null) return 0;
    return safe(() => mii.getElement(COORDINATE_COLOR_LEAF, selectedIndex!) as number, 0);
  });

  const currentCoordinate = $derived<Coordinate | null>(
    coordKeyHash === 0 ? null : coordinateByKey(coordKeyHash),
  );

  const ownedCoordinateOptions = $derived.by<WornOption[]>(() => {
    if (selectedIndex == null) return [];
    return allCoordinates()
      .filter((c) => coordBitmask.ownedColors(c.saveIndex, c.colorCount).length > 0)
      .sort((a, b) => {
        const an = coordinateLabel(a, ui).toLocaleLowerCase();
        const bn = coordinateLabel(b, ui).toLocaleLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      })
      .map((c) => ({ keyHash: c.keyHash, label: coordinateLabel(c, ui) }));
  });

  function clothesForSlot(slot: WornSlotState): WornOption[] {
    if (selectedIndex == null) return [];
    return sortedCloths
      .filter((c) => {
        if (!slot.config.prefixes.some((p) => c.name.startsWith(p))) return false;
        const mask = clothBitmask.read(c.index) & clothBitmask.validMask(c.colorCount);
        return mask !== 0;
      })
      .map((c) => ({ keyHash: murmur3_x86_32(c.name) >>> 0, label: clothLabel(c, ui) }));
  }

  function commitCoordKey(rawHash: string): void {
    if (!mii || !hasCoordKey || selectedIndex == null) return;
    const next = (Number.parseInt(rawHash, 10) || 0) >>> 0;
    mii.setElement(COORDINATE_KEY_LEAF, selectedIndex, next);
    if (hasCoordColor) {
      const c = next === 0 ? null : coordinateByKey(next);
      const owned = c ? coordBitmask.ownedColors(c.saveIndex, c.colorCount) : [];
      const cur = safe(() => mii.getElement(COORDINATE_COLOR_LEAF, selectedIndex!) as number, 0);
      const fallback = owned.length > 0 ? owned[0] : 0;
      if (next === 0 || !owned.includes(cur)) {
        mii.setElement(COORDINATE_COLOR_LEAF, selectedIndex, fallback);
      }
    }
  }

  function commitCoordColor(raw: string): void {
    if (!mii || !hasCoordColor || selectedIndex == null) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    mii.setElement(COORDINATE_COLOR_LEAF, selectedIndex, n | 0);
  }

  function clearCoordinate(): void {
    if (!mii || selectedIndex == null) return;
    if (hasCoordKey) {
      mii.setElement(COORDINATE_KEY_LEAF, selectedIndex, 0);
    }
    if (hasCoordColor) {
      mii.setElement(COORDINATE_COLOR_LEAF, selectedIndex, 0);
    }
  }

  function commitKeyHash(slot: WornSlotState, rawHash: string): void {
    if (!mii || selectedIndex == null || !slot.hasKey) return;
    const next = (Number.parseInt(rawHash, 10) || 0) >>> 0;
    mii.setElement(slot.config.keyLeaf, selectedIndex, next);
    if (slot.hasColor) {
      const c = next === 0 ? null : (clothByNameHash.get(next) ?? null);
      const owned = c ? clothBitmask.ownedColors(c.index, c.colorCount) : [];
      const fallback = owned.length > 0 ? owned[0] : 0;
      const cur = safe(() => mii.getElement(slot.config.colorLeaf, selectedIndex!) as number, 0);
      if (next === 0 || !owned.includes(cur)) {
        mii.setElement(slot.config.colorLeaf, selectedIndex, fallback);
      }
    }
  }

  function commitColorIndex(slot: WornSlotState, raw: string): void {
    if (!mii || selectedIndex == null || !slot.hasColor) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    mii.setElement(slot.config.colorLeaf, selectedIndex, n | 0);
  }

  function clearWornSlot(slot: WornSlotState): void {
    if (!mii || selectedIndex == null) return;
    if (slot.hasKey) {
      mii.setElement(slot.config.keyLeaf, selectedIndex, 0);
    }
    if (slot.hasColor) {
      mii.setElement(slot.config.colorLeaf, selectedIndex, 0);
    }
  }

  function slotColorPicker(slot: WornSlotState): ColorPicker {
    if (!slot.hasColor) return { mode: 'hidden' };
    if (!slot.cloth) return { mode: 'numeric' };
    return {
      mode: 'select',
      ownedIndices: clothBitmask.ownedColors(slot.cloth.index, slot.cloth.colorCount),
    };
  }

  function coordColorPicker(): ColorPicker {
    if (!hasCoordColor) return { mode: 'hidden' };
    if (!currentCoordinate) return { mode: 'numeric' };
    return {
      mode: 'select',
      ownedIndices: coordBitmask.ownedColors(
        currentCoordinate.saveIndex,
        currentCoordinate.colorCount,
      ),
    };
  }

  type CoordPiece = { slotKey: string; cloth: Cloth | null; keyHash: number };

  const coordPieces = $derived.by<CoordPiece[]>(() => {
    if (!currentCoordinate) return [];
    const out: CoordPiece[] = [];
    for (const [slotKey, keyHash] of Object.entries(currentCoordinate.pieces)) {
      const h = (keyHash >>> 0) | 0;
      if (h === 0) continue;
      out.push({
        slotKey,
        cloth: clothByNameHash.get(h >>> 0) ?? null,
        keyHash: h >>> 0,
      });
    }
    return out;
  });

  const hasWornFields = $derived(wornSlots.some((s) => s.hasKey || s.hasColor) || hasCoordKey);

  let manualMode = $state<'coordinate' | 'individual' | null>(null);
  const wornMode = $derived<'coordinate' | 'individual'>(
    manualMode ?? (coordKeyHash !== 0 ? 'coordinate' : 'individual'),
  );

  function switchToCoordinate(): void {
    manualMode = 'coordinate';
  }

  function switchToIndividual(): void {
    manualMode = 'individual';
  }

  $effect(() => {
    void selectedIndex;
    manualMode = null;
  });

  const coordImageUrl = $derived.by<string | null>(() => {
    if (!currentCoordinate) return null;
    const max = Math.max(0, currentCoordinate.colorCount - 1);
    return coordinateImageUrl(currentCoordinate, Math.max(0, Math.min(max, coordColorIndex)));
  });

  const coordSubtitle = $derived<string | null>(
    currentCoordinate
      ? `${currentCoordinate.name} · ${currentCoordinate.category} · ${currentCoordinate.gender}`
      : null,
  );

  function clothImageForSlot(slot: WornSlotState): string | null {
    if (!slot.cloth) return null;
    const max = Math.max(0, slot.cloth.colorCount - 1);
    return clothImageUrl(slot.cloth, Math.max(0, Math.min(max, slot.colorIndex)));
  }
</script>

{#if selectedIndex != null && hasWornFields}
  <section class={CARD_CLASS}>
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-base font-bold text-content-strong">
          {$_('mii.belongings.worn_heading')}
        </h3>
        <p class="mt-0.5 text-xs text-content-muted">
          {$_('mii.belongings.worn_caption')}
        </p>
      </div>
      {#if wornMode === 'coordinate' && wornSlots.some((s) => s.hasKey)}
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={switchToIndividual}
          title={$_('mii.belongings.worn_switch_individual_tip')}
        >
          {$_('mii.belongings.worn_switch_individual')}
        </button>
      {:else if wornMode === 'individual' && hasCoordKey}
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={switchToCoordinate}
          title={$_('mii.belongings.worn_switch_coordinate_tip')}
        >
          {$_('mii.belongings.worn_switch_coordinate')}
        </button>
      {/if}
    </div>

    {#if wornMode === 'coordinate' && hasCoordKey}
      <div class="mt-4">
        <WornSlotEditor
          slotLabel={$_('mii.belongings.worn_coordinate')}
          headerCaption={$_('mii.belongings.worn_coordinate_caption')}
          keyHash={coordKeyHash}
          options={ownedCoordinateOptions}
          subtitle={coordSubtitle}
          imageUrl={coordImageUrl}
          imageAlt={currentCoordinate ? coordinateLabel(currentCoordinate, ui) : ''}
          colorIndex={coordColorIndex}
          colorPicker={coordColorPicker()}
          onCommitKey={commitCoordKey}
          onCommitColor={commitCoordColor}
          onClear={clearCoordinate}
          size="large"
          accent="highlight"
        />
        {#if coordPieces.length > 0}
          <div class="mt-3">
            <span class="block text-xs font-bold text-content-muted">
              {$_('mii.belongings.worn_coordinate_pieces')}
            </span>
            <ul class="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {#each coordPieces as piece (piece.slotKey)}
                <li class="flex items-center gap-2 rounded bg-surface-muted px-2 py-1 text-xs">
                  <span class="font-bold text-content-faint">
                    {$_(`mii.belongings.worn_slot.${piece.slotKey}`, {
                      default: piece.slotKey,
                    })}
                  </span>
                  {#if piece.cloth}
                    <img
                      src={clothImageUrl(piece.cloth, 0)}
                      alt=""
                      loading="lazy"
                      class="h-6 w-6 shrink-0 object-contain"
                    />
                    <span class="truncate">{clothLabel(piece.cloth, ui)}</span>
                  {:else}
                    <span class="truncate font-mono text-content-faint">
                      0x{piece.keyHash.toString(16).padStart(8, '0')}
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}

    {#if wornMode === 'individual'}
      {#if coordKeyHash !== 0}
        <div
          class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <span>{$_('mii.belongings.worn_individual_blocked_warning')}</span>
          <button
            type="button"
            class="rounded-full border border-amber-500/60 bg-surface px-3 py-1 text-xs font-bold text-amber-800 shadow-sm hover:bg-amber-500/10 dark:text-amber-200"
            onclick={clearCoordinate}
          >
            {$_('mii.belongings.worn_individual_clear_coord_action')}
          </button>
        </div>
      {/if}
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        {#each wornSlots as slot (slot.config.key)}
          {#if slot.hasKey}
            <WornSlotEditor
              slotLabel={$_(`mii.belongings.worn_slot.${slot.config.key}`)}
              keyHash={slot.keyHash}
              options={clothesForSlot(slot)}
              subtitle={slot.cloth ? slot.cloth.name : null}
              imageUrl={clothImageForSlot(slot)}
              imageAlt={slot.cloth ? clothLabel(slot.cloth, ui) : ''}
              colorIndex={slot.colorIndex}
              colorPicker={slotColorPicker(slot)}
              onCommitKey={(raw) => commitKeyHash(slot, raw)}
              onCommitColor={(raw) => commitColorIndex(slot, raw)}
              onClear={() => clearWornSlot(slot)}
            />
          {/if}
        {/each}
      </div>
    {/if}
  </section>
{/if}
