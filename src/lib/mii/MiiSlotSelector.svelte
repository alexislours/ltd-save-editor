<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { safe } from '$lib/sav/format';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from './miiEditor.svelte';
  import { populatedMiiIndices } from './ownership/populated';

  type Props = {
    selectedIndex: number | null;
  };
  let { selectedIndex = $bindable(null) }: Props = $props();

  const mii = $derived(miiAccessor());
  const hasName = $derived(mii != null && mii.has(MII_SCHEMA.Mii.Name.Name));

  type Slot = {
    index: number;
    name: string;
    level: number | null;
    xpPercent: number | null;
  };
  const slots = $derived.by<Slot[]>(() => {
    if (!mii || !hasName) return [];
    const out: Slot[] = [];
    const hasLevel = mii.has(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level);
    const hasMeter = mii.has(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Meter);
    for (const i of populatedMiiIndices(mii)) {
      const n = safe(() => mii.getElement(MII_SCHEMA.Mii.Name.Name, i), '');
      const level = hasLevel
        ? safe(
            () => mii.getElement(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level, i) + 1,
            null as number | null,
          )
        : null;
      let xpPercent: number | null = null;
      if (hasMeter) {
        const m = safe(() => mii.getElement(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Meter, i), null);
        if (m !== null) xpPercent = Math.max(0, Math.min(100, m));
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

{#if !hasName}
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
