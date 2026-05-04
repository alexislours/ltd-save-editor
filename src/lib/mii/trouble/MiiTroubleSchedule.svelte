<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { safe } from '$lib/sav/format';
  import type { Trouble } from '$lib/sav/lists/troubleList.svelte';
  import { FORM_INPUT_CLASS, LABEL_CLASS, CARD_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import { TROUBLE_FIELDS, type TroubleFieldKey } from './troubleFields';
  import {
    applyDefaultSchedule,
    nowSeconds,
    parseDateInput,
    toDateInputValue,
  } from './troubleTime';

  type ScheduleKey = 'nextGameTime' | 'endGameTime';

  type Props = {
    selectedIndex: number;
    currentTrouble: Trouble | null;
  };
  let { selectedIndex, currentTrouble }: Props = $props();

  const mii = $derived(miiAccessor());
  const hasFirstDemo = $derived(mii != null && mii.has(TROUBLE_FIELDS.isFirstDemoDone.leaf));

  function has(key: TroubleFieldKey): boolean {
    return mii != null && mii.has(TROUBLE_FIELDS[key].leaf);
  }

  function readU64(key: ScheduleKey): bigint {
    if (!mii || !has(key)) return 0n;
    return safe(() => mii.getElement(TROUBLE_FIELDS[key].leaf, selectedIndex) as bigint, 0n);
  }
  function writeU64(key: ScheduleKey, v: bigint): void {
    if (!mii || !has(key)) return;
    try {
      mii.setElement(TROUBLE_FIELDS[key].leaf, selectedIndex, v < 0n ? 0n : v);
    } catch {
      /* skip */
    }
  }

  function readFirstDemo(): boolean {
    if (!mii || !hasFirstDemo) return false;
    return safe(
      () => mii.getElement(TROUBLE_FIELDS.isFirstDemoDone.leaf, selectedIndex) as boolean,
      false,
    );
  }
  function writeFirstDemo(v: boolean): void {
    if (!mii || !hasFirstDemo) return;
    try {
      mii.setElement(TROUBLE_FIELDS.isFirstDemoDone.leaf, selectedIndex, v);
    } catch {
      /* skip */
    }
  }

  function bumpTime(key: ScheduleKey, addSeconds: number): void {
    const cur = readU64(key);
    const base = cur === 0n ? nowSeconds() : cur;
    writeU64(key, base + BigInt(addSeconds));
  }

  function commitDateInput(key: ScheduleKey, raw: string): void {
    const parsed = parseDateInput(raw);
    if (parsed == null) return;
    writeU64(key, parsed);
  }

  const nextV = $derived(readU64('nextGameTime'));
  const endV = $derived(readU64('endGameTime'));
  const isFirstDemo = $derived(readFirstDemo());
</script>

<section class={CARD_CLASS}>
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div class="min-w-0">
      <h3 class="text-base font-bold text-content-strong">
        {$_('mii.troubles.schedule_heading')}
      </h3>
      <p class="mt-0.5 text-xs text-content-muted">
        {$_('mii.troubles.schedule_caption')}
      </p>
    </div>
    {#if currentTrouble}
      <button
        type="button"
        class={PILL_BUTTON_CLASS}
        onclick={() => applyDefaultSchedule(mii, selectedIndex, currentTrouble)}
        title={$_('mii.troubles.reset_schedule_tip', {
          values: { minutes: currentTrouble.endMinute },
        })}
      >
        ↺ {$_('mii.troubles.reset_schedule_action')}
      </button>
    {/if}
  </div>

  <div class="mt-4 grid gap-4 sm:grid-cols-2">
    <div class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.troubles.next_label')}</span>
      <input
        type="datetime-local"
        class={FORM_INPUT_CLASS}
        value={toDateInputValue(nextV)}
        onchange={(e) => commitDateInput('nextGameTime', e.currentTarget.value)}
      />
      <span class="mt-1 block text-xs text-content-muted">
        {$_('mii.troubles.next_hint')}
      </span>
      <span class="mt-0.5 block font-mono text-[11px] text-content-faint">
        {nextV === 0n
          ? $_('mii.troubles.disabled')
          : $_('mii.troubles.epoch_label', {
              values: { seconds: nextV.toString() },
            })}
      </span>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => writeU64('nextGameTime', nowSeconds())}
        >
          {$_('mii.troubles.now_action')}
        </button>
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => bumpTime('nextGameTime', 3600)}
        >
          {$_('mii.troubles.plus_hour_action')}
        </button>
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => bumpTime('nextGameTime', 86400)}
        >
          {$_('mii.troubles.plus_day_action')}
        </button>
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => writeU64('nextGameTime', 0n)}
        >
          {$_('mii.troubles.disable_action')}
        </button>
      </div>
    </div>

    <div class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.troubles.end_label')}</span>
      <input
        type="datetime-local"
        class={FORM_INPUT_CLASS}
        value={toDateInputValue(endV)}
        onchange={(e) => commitDateInput('endGameTime', e.currentTarget.value)}
      />
      <span class="mt-1 block text-xs text-content-muted">
        {$_('mii.troubles.end_hint')}
      </span>
      <span class="mt-0.5 block font-mono text-[11px] text-content-faint">
        {endV === 0n
          ? $_('mii.troubles.disabled')
          : $_('mii.troubles.epoch_label', {
              values: { seconds: endV.toString() },
            })}
      </span>
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => writeU64('endGameTime', nowSeconds())}
        >
          {$_('mii.troubles.now_action')}
        </button>
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => bumpTime('endGameTime', 3600)}
        >
          {$_('mii.troubles.plus_hour_action')}
        </button>
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => bumpTime('endGameTime', 86400)}
        >
          {$_('mii.troubles.plus_day_action')}
        </button>
        <button type="button" class={PILL_BUTTON_CLASS} onclick={() => writeU64('endGameTime', 0n)}>
          {$_('mii.troubles.disable_action')}
        </button>
      </div>
      {#if nextV > 0n && endV > 0n && endV < nextV}
        <span class="mt-1 block text-xs text-warn">
          {$_('mii.troubles.end_before_next_warning')}
        </span>
      {/if}
    </div>

    {#if hasFirstDemo}
      <label class="flex items-center gap-2 text-sm text-content">
        <input
          type="checkbox"
          checked={isFirstDemo}
          onchange={(e) => writeFirstDemo(e.currentTarget.checked)}
          class="h-4 w-4 rounded border-edge text-orange-500 focus:ring-orange-500/40"
        />
        <span class="font-bold text-content-strong">
          {$_('mii.troubles.first_demo_label')}
        </span>
      </label>
    {/if}
  </div>
</section>
