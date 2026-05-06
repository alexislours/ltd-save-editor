<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { enumOptionsFor } from '$lib/sav/knownKeys';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import { CARD_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import {
    crushAllowedForType,
    evaluateCoupleConstraints,
    findCrushTarget,
    findRelations,
    type CoupleConstraints,
    type CrushBlock,
    checkCrushAllowed,
  } from './relations';
  import { compareByOutMeterDesc, egoView } from './relationsModel';
  import {
    chipText,
    detectChips,
    unixSecsToDateTimeLocal,
    type ChipDescriptor,
    type ChipPopup,
    type ChipView,
  } from './relationsTableHelpers';
  import {
    applyAcquaintAllStrangers,
    commitCrush,
    commitMeter,
    commitType,
    commitTypeSetTime,
  } from './relationsTableActions';
  import MiiRelationsTableRow from './MiiRelationsTableRow.svelte';
  import MiiRelationsTableDialogs from './MiiRelationsTableDialogs.svelte';

  type Props = {
    miiIndex: number;
  };
  let { miiIndex }: Props = $props();

  const mii = $derived(miiAccessor());
  const re = $derived(mii ? findRelations(mii) : null);

  const baseTypeOptions = $derived(
    enumOptionsFor(MII_SCHEMA.Relation.Info.DirectionalInfo.BaseRelationType.hash),
  );

  const myRelationships = $derived.by(() => {
    if (!mii || !re) return [];
    return egoView(mii, re, miiIndex).sort(compareByOutMeterDesc);
  });

  const existingCrushTarget = $derived.by(() => {
    if (!mii || !re) return null;
    return findCrushTarget(mii, re, miiIndex);
  });

  const nameToHash = $derived.by(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const m = new Map<string, number>();
    if (baseTypeOptions) for (const o of baseTypeOptions) m.set(o.name, o.hash);
    return m;
  });

  function constraintsFor(slot: number, otherIndex: number): CoupleConstraints | null {
    if (!mii || !re) return null;
    return evaluateCoupleConstraints(mii, re, miiIndex, otherIndex, slot);
  }

  function crushBlockFor(slot: number, otherIndex: number): CrushBlock | null {
    if (!mii || !re) return null;
    return checkCrushAllowed(mii, re, miiIndex, otherIndex, slot);
  }

  function buildChipViews(descriptors: ChipDescriptor[]): ChipView[] {
    return descriptors.map((d) => ({ ...chipText(d, $_), tone: d.tone }));
  }

  let typeError = $state<string | null>(null);
  let popup = $state<ChipPopup | null>(null);
  let confirmAcquaint = $state(false);

  const strangerCount = $derived(myRelationships.filter((r) => r.outTypeName === 'Other').length);

  function onCommitMeter(idx: number, raw: string): void {
    if (!mii) return;
    commitMeter(mii, idx, raw);
  }

  function onCommitType(
    changedIndex: number,
    otherIndex: number,
    otherMiiIndex: number,
    otherType: number,
    rawHash: string,
    slot: number,
  ): void {
    if (!mii || !re) return;
    const result = commitType({
      mii,
      re,
      miiIndex,
      changedIndex,
      otherIndex,
      otherMiiIndex,
      otherType,
      rawHash,
      slot,
      nameToHash,
      t: $_,
    });
    if (!result.ok) typeError = result.error;
    else if (result.applied) typeError = null;
  }

  function onCommitTypeSetTime(slot: number, raw: string): void {
    if (!mii || !re) return;
    commitTypeSetTime(mii, re, slot, raw);
  }

  function onCommitCrush(dirIndex: number, otherIndex: number, value: boolean, slot: number): void {
    if (!mii || !re) return;
    const result = commitCrush({
      mii,
      re,
      miiIndex,
      dirIndex,
      otherIndex,
      value,
      slot,
      existingCrushTarget,
      t: $_,
    });
    if (!result.ok) typeError = result.error;
    else if (result.applied && value) typeError = null;
  }

  function onApplyAcquaint(): void {
    confirmAcquaint = false;
    if (!mii || !re) return;
    applyAcquaintAllStrangers({ mii, re, miiIndex, nameToHash, t: $_ });
    typeError = null;
  }

  function openChipPopup(chip: ChipView): void {
    popup = { title: chip.label, body: chip.full, note: chip.note };
  }
  function closeChipPopup(): void {
    popup = null;
  }
</script>

<section class={CARD_CLASS}>
  <h3 class="text-base font-bold text-content-strong">{$_('mii.relations.table_title')}</h3>
  <p
    class="mt-2 flex items-start gap-2 rounded-xl bg-danger-bg px-3 py-2 text-xs text-danger ring-1 ring-danger-edge/70"
    role="note"
  >
    <span
      aria-hidden="true"
      class="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
      >!</span
    >
    <span>
      <span class="font-bold">{$_('mii.relations.warning_label')}</span>
      {$_('mii.relations.warning_text')}
    </span>
  </p>
  {#if !re}
    <p class="mt-2 text-sm text-content-muted">{$_('mii.relations.no_table_short')}</p>
  {:else if myRelationships.length === 0}
    <p class="mt-2 text-sm text-content-muted">{$_('mii.relations.no_relations_for_self')}</p>
  {:else}
    <p class="mt-0.5 text-xs text-content-muted">
      {$_('mii.relations.table_intro', { values: { count: myRelationships.length } })}
    </p>
    {#if typeError}
      <div
        class="mt-3 flex items-start gap-3 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger ring-1 ring-danger-edge/70"
        role="alert"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-base font-bold text-white"
          >!</span
        >
        <div class="flex flex-1 flex-col gap-0.5">
          <span class="font-bold">{$_('mii.relations.change_blocked_title')}</span>
          <span>{typeError}</span>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-danger hover:bg-red-600/10"
          onclick={() => (typeError = null)}
          aria-label={$_('mii.relations.change_blocked_dismiss')}
        >
          ×
        </button>
      </div>
    {/if}
    {#if strangerCount > 0}
      <div class="mt-3 flex justify-end">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          onclick={() => (confirmAcquaint = true)}
        >
          {$_('mii.relations.acquaint_button')}
        </button>
      </div>
    {/if}
    <div class="mt-4 overflow-x-auto rounded-xl ring-1 ring-edge/40">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken/70 text-left text-xs font-bold text-content-strong">
          <tr>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_other')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_out_type')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_out_level')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_in_type')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_in_level')}</th>
          </tr>
        </thead>
        <tbody>
          {#each myRelationships as r, i (r.slot)}
            {@const constraints = constraintsFor(r.slot, r.otherIndex)}
            {@const crushBlock = crushBlockFor(r.slot, r.otherIndex)}
            {@const crushTypeAllowed = crushAllowedForType(r.outType)}
            {@const crushBlockedByOther =
              existingCrushTarget !== null && existingCrushTarget !== r.otherIndex && !r.crushOut}
            {@const crushBlockedByFight = r.isFight}
            {@const crushBlockedByPair = crushBlock !== null && !r.crushOut}
            {@const crushBlocked =
              !crushTypeAllowed || crushBlockedByOther || crushBlockedByFight || crushBlockedByPair}
            {@const chips = buildChipViews(
              detectChips(
                constraints,
                crushTypeAllowed,
                crushBlockedByFight,
                crushBlockedByPair,
                crushBlock,
                crushBlockedByOther,
              ),
            )}
            <MiiRelationsTableRow
              edge={r}
              index={i}
              {baseTypeOptions}
              {constraints}
              {crushBlocked}
              {chips}
              reBitFlag={!!re?.bitFlag}
              reTypeSetTime={!!re?.typeSetTime}
              typeSetTimeValue={unixSecsToDateTimeLocal(r.typeSetSec)}
              {onCommitType}
              {onCommitMeter}
              {onCommitTypeSetTime}
              {onCommitCrush}
              onChipClick={openChipPopup}
            />
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <MiiRelationsTableDialogs
    {confirmAcquaint}
    {strangerCount}
    {popup}
    onConfirmAcquaintApply={onApplyAcquaint}
    onConfirmAcquaintClose={() => (confirmAcquaint = false)}
    onChipPopupClose={closeChipPopup}
  />
</section>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    if (popup) closeChipPopup();
    else if (confirmAcquaint) confirmAcquaint = false;
  }}
/>
