<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import {
    localizeRelationType as localizeRelationTypeFor,
    subRelationLabel,
  } from '$lib/mii/miiLabelList.svelte';
  import {
    blockForCandidate,
    subRelationKey,
    subRelationLevels,
    type CoupleConstraints,
  } from './relations';
  import type { EgoEdge } from './relationsModel';
  import { FIXED_METER_TYPES, type ChipView } from './relationsTableHelpers';

  type BaseTypeOption = { hash: number; name: string };

  type Props = {
    edge: EgoEdge;
    index: number;
    baseTypeOptions: readonly BaseTypeOption[] | null;
    constraints: CoupleConstraints | null;
    crushBlocked: boolean;
    chips: ChipView[];
    reBitFlag: boolean;
    reTypeSetTime: boolean;
    typeSetTimeValue: string;
    onCommitType: (
      changedIndex: number,
      otherIndex: number,
      otherMiiIndex: number,
      otherType: number,
      rawHash: string,
      slot: number,
    ) => void;
    onCommitMeter: (directionalIndex: number, raw: string) => void;
    onCommitTypeSetTime: (slot: number, raw: string) => void;
    onCommitCrush: (dirIndex: number, otherIndex: number, value: boolean, slot: number) => void;
    onChipClick: (chip: ChipView) => void;
  };

  let {
    edge: r,
    index,
    baseTypeOptions,
    constraints,
    crushBlocked,
    chips,
    reBitFlag,
    reTypeSetTime,
    typeSetTimeValue,
    onCommitType,
    onCommitMeter,
    onCommitTypeSetTime,
    onCommitCrush,
    onChipClick,
  }: Props = $props();

  const outFixed = $derived(FIXED_METER_TYPES.has(r.outTypeName));
  const inFixed = $derived(FIXED_METER_TYPES.has(r.inTypeName));
  const outLevels = $derived(subRelationLevels(r.outTypeName, r.isFight));
  const inLevels = $derived(subRelationLevels(r.inTypeName, r.isFight));
  const outActive = $derived(subRelationKey(r.outTypeName, r.outMeter, r.isFight));
  const inActive = $derived(subRelationKey(r.inTypeName, r.inMeter, r.isFight));

  const localizeRelationType = $derived((name: string) => localizeRelationTypeFor(name, $locale));
</script>

<tr class="align-middle {index > 0 ? 'border-t border-edge/40' : ''}">
  <td class="px-3 py-2 font-bold text-content-strong">
    {r.otherName ||
      $_('mii.relations.slot_placeholder', {
        values: { index: r.otherIndex + 1 },
      })}
  </td>
  <td class="px-3 py-2">
    {#if baseTypeOptions}
      <select
        class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        onchange={(e) =>
          onCommitType(
            r.outIndex,
            r.inIndex,
            r.otherIndex,
            r.inType,
            e.currentTarget.value,
            r.slot,
          )}
      >
        {#each baseTypeOptions as opt (opt.hash)}
          {@const block = constraints ? blockForCandidate(constraints, opt.hash) : null}
          {@const blocked = block !== null && opt.hash !== r.outType}
          <option value={opt.hash} selected={opt.hash === r.outType} disabled={blocked}>
            {localizeRelationType(opt.name)}{blocked
              ? ` ${$_('mii.relations.option_blocked_suffix')}`
              : ''}
          </option>
        {/each}
        {#if !baseTypeOptions.some((o) => o.hash === r.outType)}
          <option value={r.outType} selected>{localizeRelationType(r.outTypeName)}</option>
        {/if}
      </select>
    {:else}
      <span class="font-mono text-xs">{localizeRelationType(r.outTypeName)}</span>
    {/if}
  </td>
  <td class="px-3 py-2">
    {#if outFixed}
      <span class="font-mono text-xs text-content-faint">-</span>
    {:else if outLevels}
      <select
        class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        onchange={(e) => onCommitMeter(r.outIndex, e.currentTarget.value)}
      >
        {#each outLevels as lv (lv.index)}
          <option value={lv.meter} selected={outActive?.index === lv.index}>
            {subRelationLabel(lv.key, $locale) ?? lv.key}
          </option>
        {/each}
      </select>
    {:else}
      <input
        type="text"
        inputmode="numeric"
        class="w-20 rounded-lg border border-edge/60 bg-surface px-2 py-1 text-right font-mono text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        value={r.outMeter.toString()}
        onchange={(e) => onCommitMeter(r.outIndex, e.currentTarget.value)}
      />
    {/if}
  </td>
  <td class="px-3 py-2">
    {#if baseTypeOptions}
      <select
        class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        onchange={(e) =>
          onCommitType(
            r.inIndex,
            r.outIndex,
            r.otherIndex,
            r.outType,
            e.currentTarget.value,
            r.slot,
          )}
      >
        {#each baseTypeOptions as opt (opt.hash)}
          {@const block = constraints ? blockForCandidate(constraints, opt.hash) : null}
          {@const blocked = block !== null && opt.hash !== r.inType}
          <option value={opt.hash} selected={opt.hash === r.inType} disabled={blocked}>
            {localizeRelationType(opt.name)}{blocked
              ? ` ${$_('mii.relations.option_blocked_suffix')}`
              : ''}
          </option>
        {/each}
        {#if !baseTypeOptions.some((o) => o.hash === r.inType)}
          <option value={r.inType} selected>{localizeRelationType(r.inTypeName)}</option>
        {/if}
      </select>
    {:else}
      <span class="font-mono text-xs">{localizeRelationType(r.inTypeName)}</span>
    {/if}
  </td>
  <td class="px-3 py-2">
    {#if inFixed}
      <span class="font-mono text-xs text-content-faint">-</span>
    {:else if inLevels}
      <select
        class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        onchange={(e) => onCommitMeter(r.inIndex, e.currentTarget.value)}
      >
        {#each inLevels as lv (lv.index)}
          <option value={lv.meter} selected={inActive?.index === lv.index}>
            {subRelationLabel(lv.key, $locale) ?? lv.key}
          </option>
        {/each}
      </select>
    {:else}
      <input
        type="text"
        inputmode="numeric"
        class="w-20 rounded-lg border border-edge/60 bg-surface px-2 py-1 text-right font-mono text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        value={r.inMeter.toString()}
        onchange={(e) => onCommitMeter(r.inIndex, e.currentTarget.value)}
      />
    {/if}
  </td>
</tr>
<tr class="align-middle">
  <td class="px-3 pb-2 pt-0"></td>
  <td class="px-3 pb-2 pt-0">
    <label class="inline-flex items-center gap-1.5 text-xs text-content">
      <input
        type="checkbox"
        class="h-3.5 w-3.5 accent-pink-600"
        checked={r.crushOut}
        disabled={!reBitFlag || crushBlocked}
        aria-label={$_('mii.relations.crush_label_aria')}
        onchange={(e) => onCommitCrush(r.outIndex, r.otherIndex, e.currentTarget.checked, r.slot)}
      />
      <span class="text-pink-700" aria-hidden="true">♥</span>
      <span>{$_('mii.relations.header_crush')}</span>
      {#if r.crushIn}
        <span class="text-pink-400" aria-label={$_('mii.relations.crush_incoming_aria')}>♡</span>
      {/if}
    </label>
  </td>
  <td class="px-3 pb-2 pt-0">
    {#if r.isFight}
      <span
        class="inline-flex items-center gap-1.5 text-xs text-content"
        aria-label={$_('mii.relations.fight_marker_aria')}
      >
        <span class="text-red-600" aria-hidden="true">⚔︎</span>
        <span>{$_('mii.relations.header_fight_label')}</span>
      </span>
    {/if}
  </td>
  <td class="px-3 pb-2 pt-0"></td>
  <td class="px-3 pb-2 pt-0">
    <label class="inline-flex items-center gap-1.5 text-xs text-content">
      <span class="whitespace-nowrap">{$_('mii.relations.header_type_set_time')}</span>
      <input
        type="datetime-local"
        step="1"
        class="rounded-md border border-edge/60 bg-surface px-1.5 py-0.5 font-mono text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
        value={typeSetTimeValue}
        disabled={!reTypeSetTime}
        title={$_('mii.relations.type_set_time_aria')}
        aria-label={$_('mii.relations.type_set_time_aria')}
        onchange={(e) => onCommitTypeSetTime(r.slot, e.currentTarget.value)}
      />
    </label>
  </td>
</tr>
{#if chips.length > 0}
  <tr>
    <td class="px-3 pb-2 pt-0"></td>
    <td colspan="4" class="px-3 pb-2 pt-0">
      <div class="flex flex-wrap gap-1">
        {#each chips as chip, ci (ci)}
          {@const chipClass =
            chip.tone === 'danger'
              ? 'inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-red-800 ring-1 ring-red-300/70 transition-colors hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-red-900/40 dark:text-red-200 dark:ring-red-600/50 dark:hover:bg-red-800/60'
              : chip.tone === 'romance'
                ? 'inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-900 ring-1 ring-amber-300/70 transition-colors hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-600/50 dark:hover:bg-amber-800/60'
                : 'inline-flex items-center gap-1 rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-pink-900 ring-1 ring-pink-300/70 transition-colors hover:bg-pink-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 dark:bg-pink-900/40 dark:text-pink-200 dark:ring-pink-600/50 dark:hover:bg-pink-800/60'}
          <button
            type="button"
            class={chipClass}
            aria-label={chip.full}
            onclick={() => onChipClick(chip)}
          >
            {chip.label}
          </button>
        {/each}
      </div>
    </td>
  </tr>
{/if}
