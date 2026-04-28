<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { arrGetInt, arrGetString } from '../sav/codec';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import { miiState } from './miiEditor.svelte';
  import { NAME_FIELD_HASH } from './miiFields';
  import { populatedMiiIndices } from './populated';

  type Props = {
    entries: Entry[];
    selectedIndex: number | null;
  };
  let { entries, selectedIndex = $bindable(null) }: Props = $props();

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });
  const nameEntry = $derived(byHash.get(NAME_FIELD_HASH) ?? null);

  const SATISFY_LEVEL_HASH = murmur3_x86_32('Mii.MiiMisc.SatisfyInfo.Level') >>> 0;
  const SATISFY_METER_HASH = murmur3_x86_32('Mii.MiiMisc.SatisfyInfo.Meter') >>> 0;
  const levelEntry = $derived(byHash.get(SATISFY_LEVEL_HASH) ?? null);
  const meterEntry = $derived(byHash.get(SATISFY_METER_HASH) ?? null);

  type Slot = {
    index: number;
    name: string;
    level: number | null;
    xpPercent: number | null;
  };
  const slots = $derived.by<Slot[]>(() => {
    void miiState.tick;
    if (!nameEntry) return [];
    const out: Slot[] = [];
    for (const i of populatedMiiIndices(byHash)) {
      let n: string;
      try {
        n = arrGetString(nameEntry, i);
      } catch {
        n = '';
      }
      let level: number | null = null;
      if (levelEntry) {
        try {
          level = arrGetInt(levelEntry, i) + 1;
        } catch {
          level = null;
        }
      }
      let xpPercent: number | null = null;
      if (meterEntry) {
        try {
          const m = arrGetInt(meterEntry, i);
          xpPercent = Math.max(0, Math.min(100, m));
        } catch {
          xpPercent = null;
        }
      }
      out.push({ index: i, name: n, level, xpPercent });
    }
    return out;
  });

  $effect(() => {
    if (slots.length === 0) {
      selectedIndex = null;
      return;
    }
    if (selectedIndex == null || !slots.some((s) => s.index === selectedIndex)) {
      selectedIndex = slots[0].index;
    }
  });

  const selectedSlot = $derived(
    selectedIndex == null ? null : (slots.find((s) => s.index === selectedIndex) ?? null),
  );

  function slotLabel(slot: Slot): string {
    const params = { index: slot.index + 1, name: slot.name };
    if (slot.level == null) {
      return $_('mii.panel.slot_label', { values: params });
    }
    return $_('mii.panel.slot_label_with_level', {
      values: { ...params, level: slot.level },
    });
  }
</script>

{#if !nameEntry}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('mii.panel.no_name_spine')}</p>
  </section>
{:else if slots.length === 0}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('mii.panel.no_slots')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <label class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.panel.selector_label')}</span>
      <select
        class="{FORM_INPUT_CLASS} max-w-md"
        value={selectedIndex ?? ''}
        onchange={(e) => {
          const n = Number.parseInt(e.currentTarget.value, 10);
          selectedIndex = Number.isFinite(n) ? n : null;
        }}
      >
        {#each slots as slot (slot.index)}
          <option value={slot.index}>{slotLabel(slot)}</option>
        {/each}
      </select>
      <span class="mt-1 block text-xs text-content-muted">
        {$_('mii.panel.slot_count', { values: { count: slots.length } })}
      </span>
    </label>

    {#if selectedSlot}
      <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="text-2xl font-bold text-content-strong">
          {selectedSlot.name}
        </span>
        {#if selectedSlot.level != null}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 font-mono text-xs font-bold text-warn"
            title="Mii.MiiMisc.SatisfyInfo.Level"
          >
            {$_('mii.panel.level_pill', { values: { level: selectedSlot.level } })}
          </span>
        {/if}
        <span class="text-xs text-content-muted">
          {$_('mii.panel.slot_short', { values: { index: selectedSlot.index + 1 } })}
        </span>
      </div>
      {#if selectedSlot.xpPercent != null}
        <div class="mt-3 max-w-md" title="Mii.MiiMisc.SatisfyInfo.Meter">
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-bold text-content-strong">
              {$_('mii.panel.level_meter_label')}
            </span>
            <span class="font-mono text-xs text-content">
              {selectedSlot.xpPercent}%
            </span>
          </div>
          <div
            class="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={selectedSlot.xpPercent}
          >
            <div
              class="h-full rounded-full bg-orange-500 transition-[width]"
              style:width="{selectedSlot.xpPercent}%"
            ></div>
          </div>
        </div>
      {/if}
    {/if}
  </section>
{/if}
