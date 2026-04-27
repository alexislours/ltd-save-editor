<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import { getEnum, getInt, getUInt, setEnum, setInt, setUInt } from '../sav/codec';
  import { DataType } from '../sav/dataType';
  import {
    allRoomStyleGroups,
    type RoomStyleGroup,
    roomStyleGroupLabel,
  } from '../sav/roomStyleList.svelte';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, INPUT_CLASS } from '../styles';
  import BulkEditPanel from './BulkEditPanel.svelte';
  import InteriorRow from './InteriorRow.svelte';
  import { OBTAINED_HASH } from './stateOptions';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const ui = $derived($locale);

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  let query = $state('');

  const knownGroups = $derived.by(() => {
    return allRoomStyleGroups().filter((group) =>
      group.variants.some((v) => byHash.has(v.stateHash) || byHash.has(v.ownNumHash)),
    );
  });

  const hasAny = $derived(knownGroups.length > 0);

  const sortedGroups = $derived.by(() => {
    return [...knownGroups].sort((a, b) => {
      const an = roomStyleGroupLabel(a, ui).toLocaleLowerCase();
      const bn = roomStyleGroupLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const visibleGroups = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return sortedGroups;
    return sortedGroups.filter(
      (g) =>
        roomStyleGroupLabel(g, ui).toLocaleLowerCase().includes(q) ||
        g.groupKey.toLocaleLowerCase().includes(q) ||
        g.variants.some((v) => v.name.toLocaleLowerCase().includes(q)),
    );
  });

  function readEnumScalar(entry: Entry | null): number {
    if (!entry) return 0;
    void playerState.tick;
    try {
      return getEnum(entry);
    } catch {
      return 0;
    }
  }

  // Clamp to 0 for display
  function readNumScalar(entry: Entry | null): number {
    if (!entry) return 0;
    void playerState.tick;
    try {
      const raw = entry.type === DataType.UInt ? getUInt(entry) : getInt(entry);
      return raw < 0 ? 0 : raw;
    } catch {
      return 0;
    }
  }

  function writeEnumScalar(entry: Entry | null, value: number): boolean {
    if (!entry) return false;
    try {
      setEnum(entry, value >>> 0);
      markDirty(entry);
      return true;
    } catch {
      return false;
    }
  }

  function writeNumScalar(entry: Entry | null, value: number): boolean {
    if (!entry) return false;
    const v = Math.max(0, Math.trunc(value));
    try {
      if (entry.type === DataType.UInt) setUInt(entry, v >>> 0);
      else setInt(entry, v);
      markDirty(entry);
      return true;
    } catch {
      return false;
    }
  }

  function readVariantState(group: RoomStyleGroup, variantIndex: number): number {
    const v = group.variants[variantIndex];
    if (!v) return 0;
    return readEnumScalar(byHash.get(v.stateHash) ?? null);
  }
  function readVariantQty(group: RoomStyleGroup, variantIndex: number): number {
    const v = group.variants[variantIndex];
    if (!v) return 0;
    return readNumScalar(byHash.get(v.ownNumHash) ?? null);
  }

  function writeVariantState(group: RoomStyleGroup, variantIndex: number, value: number): void {
    const v = group.variants[variantIndex];
    if (!v) return;
    writeEnumScalar(byHash.get(v.stateHash) ?? null, value);
  }

  function writeVariantQty(group: RoomStyleGroup, variantIndex: number, value: number): void {
    const v = group.variants[variantIndex];
    if (!v) return;
    const ownNumEntry = byHash.get(v.ownNumHash) ?? null;
    const stateEntry = byHash.get(v.stateHash) ?? null;
    const newQty = Math.max(0, Math.trunc(value));
    const prev = readNumScalar(ownNumEntry);
    if (!writeNumScalar(ownNumEntry, newQty)) return;
    if (prev === 0 && newQty > 0 && stateEntry) {
      const cur = readEnumScalar(stateEntry);
      if (cur !== OBTAINED_HASH) writeEnumScalar(stateEntry, OBTAINED_HASH);
    }
  }

  function writeGroupStateAll(group: RoomStyleGroup, value: number): void {
    for (let i = 0; i < group.variants.length; i++) writeVariantState(group, i, value);
  }
  function writeGroupQtyAll(group: RoomStyleGroup, value: number): void {
    for (let i = 0; i < group.variants.length; i++) writeVariantQty(group, i, value);
  }

  function applyBulkState(value: number): void {
    for (const g of visibleGroups) writeGroupStateAll(g, value);
  }

  function applyBulkQty(value: number): void {
    for (const g of visibleGroups) writeGroupQtyAll(g, value);
  }
</script>

{#if !hasAny}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.interiors.missing')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-content-strong">
          {$_('player.interiors.heading')}
        </h3>
        <p class="text-xs text-content-muted">
          {$_('player.interiors.caption', { values: { count: visibleGroups.length } })}
        </p>
      </div>
    </header>

    <div class="mt-4">
      <label class="block">
        <span class="block text-xs font-bold text-content">{$_('player.inventory.search')}</span>
        <input
          type="search"
          class="{INPUT_CLASS} mt-1 w-full"
          placeholder={$_('player.inventory.search_placeholder')}
          bind:value={query}
        />
      </label>
    </div>

    <div class="mt-3">
      <BulkEditPanel
        visibleCount={visibleGroups.length}
        hasState={true}
        hasQty={true}
        onApplyState={applyBulkState}
        onApplyQty={applyBulkQty}
      />
    </div>

    <p class="mt-3 text-xs text-content-muted">{$_('player.interiors.variant_note')}</p>

    <div
      class="mt-2 max-h-160 overflow-y-auto rounded-xl border border-edge/40 bg-surface-muted/40"
    >
      {#if visibleGroups.length === 0}
        <p class="p-6 text-sm text-content-muted">{$_('player.inventory.empty')}</p>
      {:else}
        <ul class="divide-y divide-edge/40">
          {#each visibleGroups as group (group.groupKey)}
            <InteriorRow
              {group}
              label={roomStyleGroupLabel(group, ui)}
              primaryState={readVariantState(group, 0)}
              primaryQty={readVariantQty(group, 0)}
              readState={(vi) => readVariantState(group, vi)}
              readQty={(vi) => readVariantQty(group, vi)}
              writeStateAll={(v) => writeGroupStateAll(group, v)}
              writeQtyAll={(v) => writeGroupQtyAll(group, v)}
              writeStateOne={(vi, v) => writeVariantState(group, vi, v)}
              writeQtyOne={(vi, v) => writeVariantQty(group, vi, v)}
            />
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}
