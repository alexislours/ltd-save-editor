<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import { getEnum, getInt, getUInt, setEnum, setInt, setUInt } from '../sav/codec';
  import { DataType } from '../sav/dataType';
  import {
    allTreasures,
    type Treasure,
    treasureImageUrl,
    treasureLabel,
  } from '../sav/treasureList.svelte';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, INPUT_CLASS } from '../styles';
  import BulkEditPanel from './BulkEditPanel.svelte';
  import InventoryRow from './InventoryRow.svelte';
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

  const knownTreasures = $derived.by(() => {
    return allTreasures().filter((t) => byHash.has(t.stateHash) || byHash.has(t.ownNumHash));
  });

  const hasAny = $derived(knownTreasures.length > 0);

  const sortedTreasures = $derived.by(() => {
    return [...knownTreasures].sort((a, b) => {
      const an = treasureLabel(a, ui).toLocaleLowerCase();
      const bn = treasureLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });

  const visibleTreasures = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return sortedTreasures;
    return sortedTreasures.filter(
      (t) =>
        treasureLabel(t, ui).toLocaleLowerCase().includes(q) ||
        t.name.toLocaleLowerCase().includes(q),
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

  function readNumScalar(entry: Entry | null): number {
    if (!entry) return 0;
    void playerState.tick;
    try {
      if (entry.type === DataType.UInt) return getUInt(entry);
      return getInt(entry);
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

  function readState(t: Treasure): number {
    return readEnumScalar(byHash.get(t.stateHash) ?? null);
  }
  function readQty(t: Treasure): number {
    return readNumScalar(byHash.get(t.ownNumHash) ?? null);
  }

  function writeState(t: Treasure, value: number): void {
    writeEnumScalar(byHash.get(t.stateHash) ?? null, value);
  }

  function writeQty(t: Treasure, value: number): void {
    const ownNumEntry = byHash.get(t.ownNumHash) ?? null;
    const stateEntry = byHash.get(t.stateHash) ?? null;
    const newQty = Math.max(0, Math.trunc(value));
    const prev = readNumScalar(ownNumEntry);
    if (!writeNumScalar(ownNumEntry, newQty)) return;
    if (prev === 0 && newQty > 0 && stateEntry) {
      const cur = readEnumScalar(stateEntry);
      if (cur !== OBTAINED_HASH) writeEnumScalar(stateEntry, OBTAINED_HASH);
    }
  }

  function applyBulkState(value: number): void {
    const v = value >>> 0;
    for (const t of visibleTreasures) {
      writeEnumScalar(byHash.get(t.stateHash) ?? null, v);
    }
  }

  function applyBulkQty(value: number): void {
    const v = Math.max(0, value);
    for (const t of visibleTreasures) {
      const ownEntry = byHash.get(t.ownNumHash) ?? null;
      if (!writeNumScalar(ownEntry, v)) continue;
      if (v > 0) {
        const stateEntry = byHash.get(t.stateHash) ?? null;
        if (stateEntry && readEnumScalar(stateEntry) !== OBTAINED_HASH) {
          writeEnumScalar(stateEntry, OBTAINED_HASH);
        }
      }
    }
  }
</script>

{#if !hasAny}
  <section class={CARD_CLASS}>
    <p class="text-sm text-slate-600">{$_('player.treasures.missing')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">{$_('player.treasures.heading')}</h3>
        <p class="text-xs text-slate-600">
          {$_('player.treasures.caption', { values: { count: visibleTreasures.length } })}
        </p>
      </div>
    </header>

    <div class="mt-4">
      <label class="block">
        <span class="block text-xs font-bold text-slate-700">{$_('player.inventory.search')}</span>
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
        visibleCount={visibleTreasures.length}
        hasState={true}
        hasQty={true}
        onApplyState={applyBulkState}
        onApplyQty={applyBulkQty}
      />
    </div>

    <div
      class="mt-4 max-h-160 overflow-y-auto rounded-xl border border-amber-200/60 bg-amber-50/40"
    >
      {#if visibleTreasures.length === 0}
        <p class="p-6 text-sm text-slate-600">{$_('player.inventory.empty')}</p>
      {:else}
        <ul class="divide-y divide-amber-200/60">
          {#each visibleTreasures as treasure (treasure.name)}
            {@const stateEntry = byHash.get(treasure.stateHash) ?? null}
            {@const ownNumEntry = byHash.get(treasure.ownNumHash) ?? null}
            <InventoryRow
              imageUrl={treasureImageUrl(treasure)}
              label={treasureLabel(treasure, ui)}
              internalName={treasure.name}
              hasState={!!stateEntry}
              hasQty={!!ownNumEntry}
              state={readState(treasure)}
              qty={readQty(treasure)}
              onStateChange={(v) => writeState(treasure, v)}
              onQtyChange={(v) => writeQty(treasure, v)}
            />
          {/each}
        </ul>
      {/if}
    </div>
  </section>
{/if}
