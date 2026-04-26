<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { arrSetEnum, arrSetInt } from '../sav/codec';
  import { enumOptionsFor } from '../sav/knownKeys';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';
  import {
    baseRelationTypeLabel,
    blockForCandidate,
    checkCrushAllowed,
    counterpartsFor,
    crushAllowedForType,
    evaluateCoupleConstraints,
    findCrushTarget,
    findRelationEntries,
    hasFightVariant,
    isRomanticTypeHash,
    isValidPair,
    listRelationships,
    readMiiName,
    setCrush,
    setFight,
    setTypeSetSec,
    subRelationKey,
    subRelationLevels,
    type CoupleBlock,
    type CoupleConstraints,
    type CrushBlock,
  } from './relations';

  type Props = {
    entries: Entry[];
    miiIndex: number;
  };
  let { entries, miiIndex }: Props = $props();
  const tick = $derived(miiState.tick);

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const relEntries = $derived(findRelationEntries(byHash));

  const baseTypeOptions = $derived.by(() => {
    const h = murmur3_x86_32('Relation.Info.DirectionalInfo.BaseRelationType') >>> 0;
    return enumOptionsFor(h);
  });

  const myRelationships = $derived.by(() => {
    void tick;
    if (!relEntries) return [];
    const all = listRelationships(relEntries);
    return all
      .filter((r) => r.a === miiIndex || r.b === miiIndex)
      .map((r) => {
        const selfIsA = r.a === miiIndex;
        const otherIndex = selfIsA ? r.b : r.a;
        const outIndex = selfIsA ? r.abIndex : r.baIndex;
        const inIndex = selfIsA ? r.baIndex : r.abIndex;
        const outType = selfIsA ? r.typeAtoB : r.typeBtoA;
        const inType = selfIsA ? r.typeBtoA : r.typeAtoB;
        const outMeter = selfIsA ? r.meterAtoB : r.meterBtoA;
        const inMeter = selfIsA ? r.meterBtoA : r.meterAtoB;
        const crushOut = selfIsA ? r.crushAtoB : r.crushBtoA;
        const crushIn = selfIsA ? r.crushBtoA : r.crushAtoB;
        return {
          slot: r.slot,
          otherIndex,
          otherName: readMiiName(relEntries.name, otherIndex),
          outIndex,
          inIndex,
          outType,
          inType,
          outMeter,
          inMeter,
          isFight: r.isFight,
          crushOut,
          crushIn,
          typeSetSec: r.typeSetSec,
        };
      })
      .sort((a, b) => b.outMeter - a.outMeter);
  });

  const existingCrushTarget = $derived.by(() => {
    void tick;
    if (!relEntries) return null;
    return findCrushTarget(relEntries, miiIndex);
  });

  function commitMeter(directionalIndex: number, raw: string) {
    if (!relEntries) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    arrSetInt(relEntries.meter, directionalIndex, n | 0);
    markDirty(relEntries.meter);
  }

  const nameToHash = $derived.by(() => {
    const m = new SvelteMap<string, number>();
    if (baseTypeOptions) for (const o of baseTypeOptions) m.set(o.name, o.hash);
    return m;
  });

  const FIXED_METER_TYPES = new Set(['Other', 'Invalid']);

  function constraintsFor(slot: number, otherIndex: number): CoupleConstraints | null {
    if (!relEntries) return null;
    return evaluateCoupleConstraints(relEntries, miiIndex, otherIndex, slot);
  }

  function crushBlockFor(slot: number, otherIndex: number): CrushBlock | null {
    if (!relEntries) return null;
    return checkCrushAllowed(relEntries, miiIndex, otherIndex, slot);
  }

  type Chip = {
    tone: 'romance' | 'crush' | 'danger';
    label: string;
    full: string;
    note?: string;
  };

  function buildChips(
    c: CoupleConstraints | null,
    crushTypeAllowed: boolean,
    crushBlockedByFight: boolean,
    crushBlockedByPair: boolean,
    crushBlock: CrushBlock | null,
    crushBlockedByOther: boolean,
  ): Chip[] {
    const out: Chip[] = [];
    if (c) {
      if (c.gender) {
        out.push({
          tone: 'danger',
          label: $_('mii.relations.chip.gender'),
          full: $_('mii.relations.couple_blocked_gender'),
          note: $_('mii.relations.popup_note_crush_too'),
        });
      }
      if (c.blood) {
        out.push({
          tone: 'romance',
          label: $_('mii.relations.chip.blood'),
          full: $_('mii.relations.couple_blocked_blood'),
          note: $_('mii.relations.popup_note_crush_too'),
        });
      }
      if (c.selfActiveSlot !== null) {
        out.push({
          tone: 'romance',
          label: $_('mii.relations.chip.self_paired'),
          full: $_('mii.relations.couple_blocked_self_paired'),
        });
      }
      if (c.otherActiveSlot !== null) {
        out.push({
          tone: 'romance',
          label: $_('mii.relations.chip.other_paired'),
          full: $_('mii.relations.couple_blocked_other_paired'),
        });
      }
    }
    if (!crushTypeAllowed) {
      out.push({
        tone: 'crush',
        label: $_('mii.relations.chip.crush_type'),
        full: $_('mii.relations.crush_requires_friend_know'),
      });
    } else if (crushBlockedByFight) {
      out.push({
        tone: 'crush',
        label: $_('mii.relations.chip.crush_fight'),
        full: $_('mii.relations.crush_blocked_by_fight'),
      });
    } else if (crushBlockedByPair && crushBlock) {
      const dupGender = crushBlock.reason === 'gender_incompatible' && c?.gender;
      const dupBlood = crushBlock.reason === 'blood_related' && c?.blood;
      if (!dupGender && !dupBlood) {
        out.push({
          tone: 'crush',
          label:
            crushBlock.reason === 'gender_incompatible'
              ? $_('mii.relations.chip.crush_gender')
              : $_('mii.relations.chip.crush_blood'),
          full:
            crushBlock.reason === 'gender_incompatible'
              ? $_('mii.relations.crush_blocked_gender')
              : $_('mii.relations.crush_blocked_blood'),
        });
      }
    } else if (crushBlockedByOther) {
      out.push({
        tone: 'crush',
        label: $_('mii.relations.chip.crush_other'),
        full: $_('mii.relations.crush_locked_existing'),
      });
    }
    return out;
  }

  function blockReasonMessage(reason: CoupleBlock['reason']): string {
    switch (reason) {
      case 'gender_incompatible':
        return $_('mii.relations.couple_blocked_gender');
      case 'blood_related':
        return $_('mii.relations.couple_blocked_blood');
      case 'self_already_paired':
        return $_('mii.relations.couple_blocked_self_paired');
      case 'other_already_paired':
        return $_('mii.relations.couple_blocked_other_paired');
    }
  }

  let typeError = $state<string | null>(null);

  // Popup state for chip explanations.
  type PopupContent = { title: string; body: string; note?: string };
  let popup = $state<PopupContent | null>(null);

  function openChipPopup(chip: Chip): void {
    popup = { title: chip.label, body: chip.full, note: chip.note };
  }
  function closeChipPopup(): void {
    popup = null;
  }

  function commitType(
    changedIndex: number,
    otherIndex: number,
    otherType: number,
    rawHash: string,
    slot: number,
  ) {
    if (!relEntries) return;
    const n = Number.parseInt(rawHash, 10);
    if (!Number.isFinite(n)) return;
    const newHash = n >>> 0;

    if (isRomanticTypeHash(newHash)) {
      const c = evaluateCoupleConstraints(relEntries, miiIndex, otherIndex, slot);
      const block = blockForCandidate(c, newHash);
      if (block) {
        typeError = blockReasonMessage(block.reason);
        miiState.tick++;
        return;
      }
    }
    typeError = null;
    arrSetEnum(relEntries.baseType, changedIndex, newHash);

    const newName = baseRelationTypeLabel(newHash);
    const otherName = baseRelationTypeLabel(otherType);
    let finalOtherName = otherName;
    if (!isValidPair(newName, otherName)) {
      const canonical = counterpartsFor(newName)[0];
      const canonicalHash = nameToHash.get(canonical);
      if (canonicalHash !== undefined) {
        arrSetEnum(relEntries.baseType, otherIndex, canonicalHash);
        finalOtherName = canonical;
      }
    }
    markDirty(relEntries.baseType);

    if (FIXED_METER_TYPES.has(newName)) {
      arrSetInt(relEntries.meter, changedIndex, 100);
    }
    if (FIXED_METER_TYPES.has(finalOtherName)) {
      arrSetInt(relEntries.meter, otherIndex, 100);
    }
    if (FIXED_METER_TYPES.has(newName) || FIXED_METER_TYPES.has(finalOtherName)) {
      markDirty(relEntries.meter);
    }

    if (relEntries.bitFlag) {
      let dirty = false;
      if (!crushAllowedForType(newHash) && setCrush(relEntries, changedIndex, false)) dirty = true;
      const otherFinalHash = nameToHash.get(finalOtherName);
      if (
        otherFinalHash !== undefined &&
        !crushAllowedForType(otherFinalHash) &&
        setCrush(relEntries, otherIndex, false)
      ) {
        dirty = true;
      }
      if (dirty) markDirty(relEntries.bitFlag);
    }

    if (relEntries.isFight && !hasFightVariant(newName) && !hasFightVariant(finalOtherName)) {
      const slot = changedIndex >>> 1;
      if (setFight(relEntries, slot, false)) markDirty(relEntries.isFight);
    }
  }

  function unixSecsToDateTimeLocal(secs: bigint | null): string {
    if (secs === null || secs < 0n) return '';
    const n = Number(secs);
    if (!Number.isFinite(n)) return '';
    const d = new Date(n * 1000);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (x: number) => x.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function dateTimeLocalToUnixSecs(raw: string): bigint | null {
    const t = raw.trim();
    if (t.length === 0) return 0n;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return null;
    const secs = Math.floor(d.getTime() / 1000);
    if (!Number.isFinite(secs) || secs < 0) return null;
    return BigInt(secs);
  }

  function commitTypeSetTime(slot: number, raw: string) {
    if (!relEntries?.typeSetTime) return;
    const secs = dateTimeLocalToUnixSecs(raw);
    if (secs === null) return;
    if (setTypeSetSec(relEntries, slot, secs)) markDirty(relEntries.typeSetTime);
  }

  function commitCrush(dirIndex: number, otherIndex: number, value: boolean, slot: number): void {
    if (!relEntries?.bitFlag) return;
    if (value) {
      const block = checkCrushAllowed(relEntries, miiIndex, otherIndex, slot);
      if (block) {
        typeError =
          block.reason === 'gender_incompatible'
            ? $_('mii.relations.crush_blocked_gender')
            : $_('mii.relations.crush_blocked_blood');
        miiState.tick++;
        return;
      }
      typeError = null;
    }
    let prevCrushSlots: number[] = [];
    if (value && existingCrushTarget !== null && existingCrushTarget !== otherIndex) {
      for (const r of listRelationships(relEntries)) {
        if (r.a === miiIndex && r.crushAtoB) {
          setCrush(relEntries, r.abIndex, false);
          prevCrushSlots.push(r.slot);
        } else if (r.b === miiIndex && r.crushBtoA) {
          setCrush(relEntries, r.baIndex, false);
          prevCrushSlots.push(r.slot);
        }
      }
    }
    if (!setCrush(relEntries, dirIndex, value)) return;
    markDirty(relEntries.bitFlag);

    if (value) {
      if (relEntries.isFight && setFight(relEntries, slot, false)) markDirty(relEntries.isFight);
    } else {
      maybeClearFightForSlot(slot);
    }
    for (const s of prevCrushSlots) maybeClearFightForSlot(s);
  }

  function maybeClearFightForSlot(slot: number): void {
    if (!relEntries?.isFight) return;
    const r = listRelationships(relEntries).find((x) => x.slot === slot);
    if (!r || !r.isFight) return;
    const outName = baseRelationTypeLabel(r.typeAtoB);
    const inName = baseRelationTypeLabel(r.typeBtoA);
    if (hasFightVariant(outName) || hasFightVariant(inName)) return;
    if (setFight(relEntries, slot, false)) markDirty(relEntries.isFight);
  }

  /** Translate a base relation type internal name (e.g. "Couple"). Falls back to the raw name. */
  function localizeRelationType(name: string): string {
    if (name.startsWith('0x')) return name;
    const t = $_(`mii.relations.type.${name}`);
    return t && t !== `mii.relations.type.${name}` ? t : name;
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
  {#if !relEntries}
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
            {@const outTypeName = baseRelationTypeLabel(r.outType)}
            {@const inTypeName = baseRelationTypeLabel(r.inType)}
            {@const outFixed = FIXED_METER_TYPES.has(outTypeName)}
            {@const inFixed = FIXED_METER_TYPES.has(inTypeName)}
            {@const outLevels = subRelationLevels(outTypeName, r.isFight)}
            {@const inLevels = subRelationLevels(inTypeName, r.isFight)}
            {@const outActive = subRelationKey(outTypeName, r.outMeter, r.isFight)}
            {@const inActive = subRelationKey(inTypeName, r.inMeter, r.isFight)}
            {@const constraints = constraintsFor(r.slot, r.otherIndex)}
            {@const crushBlock = crushBlockFor(r.slot, r.otherIndex)}
            {@const crushTypeAllowed = crushAllowedForType(r.outType)}
            {@const crushBlockedByOther =
              existingCrushTarget !== null && existingCrushTarget !== r.otherIndex && !r.crushOut}
            {@const crushBlockedByFight = r.isFight}
            {@const crushBlockedByPair = crushBlock !== null && !r.crushOut}
            {@const crushBlocked =
              !crushTypeAllowed || crushBlockedByOther || crushBlockedByFight || crushBlockedByPair}
            {@const chips = buildChips(
              constraints,
              crushTypeAllowed,
              crushBlockedByFight,
              crushBlockedByPair,
              crushBlock,
              crushBlockedByOther,
            )}
            <tr class="align-middle {i > 0 ? 'border-t border-edge/40' : ''}">
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
                      commitType(r.outIndex, r.inIndex, r.inType, e.currentTarget.value, r.slot)}
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
                      <option value={r.outType} selected
                        >{localizeRelationType(baseRelationTypeLabel(r.outType))}</option
                      >
                    {/if}
                  </select>
                {:else}
                  <span class="font-mono text-xs"
                    >{localizeRelationType(baseRelationTypeLabel(r.outType))}</span
                  >
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if outFixed}
                  <span class="font-mono text-xs text-content-faint">-</span>
                {:else if outLevels}
                  <select
                    class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    onchange={(e) => commitMeter(r.outIndex, e.currentTarget.value)}
                  >
                    {#each outLevels as lv (lv.index)}
                      <option value={lv.meter} selected={outActive?.index === lv.index}>
                        {$_(`mii.relations.sub.${lv.key}`)}
                      </option>
                    {/each}
                  </select>
                {:else}
                  <input
                    type="text"
                    inputmode="numeric"
                    class="w-20 rounded-lg border border-edge/60 bg-surface px-2 py-1 text-right font-mono text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    value={r.outMeter.toString()}
                    onchange={(e) => commitMeter(r.outIndex, e.currentTarget.value)}
                  />
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if baseTypeOptions}
                  <select
                    class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    onchange={(e) =>
                      commitType(r.inIndex, r.outIndex, r.outType, e.currentTarget.value, r.slot)}
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
                      <option value={r.inType} selected
                        >{localizeRelationType(baseRelationTypeLabel(r.inType))}</option
                      >
                    {/if}
                  </select>
                {:else}
                  <span class="font-mono text-xs"
                    >{localizeRelationType(baseRelationTypeLabel(r.inType))}</span
                  >
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if inFixed}
                  <span class="font-mono text-xs text-content-faint">-</span>
                {:else if inLevels}
                  <select
                    class="rounded-lg border border-edge/60 bg-surface px-2 py-1 text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    onchange={(e) => commitMeter(r.inIndex, e.currentTarget.value)}
                  >
                    {#each inLevels as lv (lv.index)}
                      <option value={lv.meter} selected={inActive?.index === lv.index}>
                        {$_(`mii.relations.sub.${lv.key}`)}
                      </option>
                    {/each}
                  </select>
                {:else}
                  <input
                    type="text"
                    inputmode="numeric"
                    class="w-20 rounded-lg border border-edge/60 bg-surface px-2 py-1 text-right font-mono text-xs text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    value={r.inMeter.toString()}
                    onchange={(e) => commitMeter(r.inIndex, e.currentTarget.value)}
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
                    disabled={!relEntries?.bitFlag || crushBlocked}
                    aria-label={$_('mii.relations.crush_label_aria')}
                    onchange={(e) =>
                      commitCrush(r.outIndex, r.otherIndex, e.currentTarget.checked, r.slot)}
                  />
                  <span class="text-pink-700" aria-hidden="true">♥</span>
                  <span>{$_('mii.relations.header_crush')}</span>
                  {#if r.crushIn}
                    <span class="text-pink-400" aria-label={$_('mii.relations.crush_incoming_aria')}
                      >♡</span
                    >
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
                    value={unixSecsToDateTimeLocal(r.typeSetSec)}
                    disabled={!relEntries?.typeSetTime}
                    title={$_('mii.relations.type_set_time_aria')}
                    aria-label={$_('mii.relations.type_set_time_aria')}
                    onchange={(e) => commitTypeSetTime(r.slot, e.currentTarget.value)}
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
                        onclick={() => openChipPopup(chip)}
                      >
                        {chip.label}
                      </button>
                    {/each}
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if popup}
    <div
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onclick={closeChipPopup}
    >
      <div
        class="relative w-full max-w-sm rounded-xl bg-surface p-4 shadow-xl ring-1 ring-edge/60"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby="chip-popup-title"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <h4 id="chip-popup-title" class="pr-8 text-sm font-bold text-content-strong">
          {popup.title}
        </h4>
        <p class="mt-2 text-sm text-content">{popup.body}</p>
        {#if popup.note}
          <p
            class="mt-2 rounded-md bg-surface-sunken px-2.5 py-1.5 text-xs text-content-muted ring-1 ring-edge/40"
          >
            {popup.note}
          </p>
        {/if}
        <button
          type="button"
          class="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-content-muted hover:bg-surface-sunken hover:text-content-strong"
          aria-label={$_('mii.relations.change_blocked_dismiss')}
          onclick={closeChipPopup}
        >
          ×
        </button>
        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            onclick={closeChipPopup}
          >
            {$_('mii.relations.popup_ok')}
          </button>
        </div>
      </div>
    </div>
  {/if}
</section>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && popup) closeChipPopup();
  }}
/>
