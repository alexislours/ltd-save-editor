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
    counterpartsFor,
    findRelationEntries,
    isValidPair,
    listRelationships,
    readMiiName,
    subRelationKey,
    subRelationLevels,
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
        };
      })
      .sort((a, b) => b.outMeter - a.outMeter);
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

  function commitType(
    changedIndex: number,
    otherIndex: number,
    otherType: number,
    rawHash: string,
  ) {
    if (!relEntries) return;
    const n = Number.parseInt(rawHash, 10);
    if (!Number.isFinite(n)) return;
    const newHash = n >>> 0;
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
  }

  /** Translate a base relation type internal name (e.g. "Couple"). Falls back to the raw name. */
  function localizeRelationType(name: string): string {
    if (name.startsWith('0x')) return name;
    const t = $_(`mii.relations.type.${name}`);
    return t && t !== `mii.relations.type.${name}` ? t : name;
  }
</script>

<section class={CARD_CLASS}>
  <h3 class="text-base font-bold text-slate-900">{$_('mii.relations.table_title')}</h3>
  <p
    class="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-900 ring-1 ring-red-400/70"
    role="note"
  >
    <span
      aria-hidden="true"
      class="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white"
      >!</span
    >
    <span>
      <span class="font-bold text-red-700">{$_('mii.relations.warning_label')}</span>
      {$_('mii.relations.warning_text')}
    </span>
  </p>
  {#if !relEntries}
    <p class="mt-2 text-sm text-slate-600">{$_('mii.relations.no_table_short')}</p>
  {:else if myRelationships.length === 0}
    <p class="mt-2 text-sm text-slate-600">{$_('mii.relations.no_relations_for_self')}</p>
  {:else}
    <p class="mt-0.5 text-xs text-slate-600">
      {$_('mii.relations.table_intro', { values: { count: myRelationships.length } })}
    </p>
    <div class="mt-4 overflow-x-auto rounded-xl ring-1 ring-amber-400/40">
      <table class="w-full text-sm">
        <thead class="bg-amber-100/70 text-left text-xs font-bold text-slate-900">
          <tr>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_other')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_out_type')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_out_level')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_in_type')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_in_level')}</th>
            <th class="px-3 py-2 font-bold">{$_('mii.relations.header_fight')}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-amber-200/60">
          {#each myRelationships as r (r.slot)}
            {@const outTypeName = baseRelationTypeLabel(r.outType)}
            {@const inTypeName = baseRelationTypeLabel(r.inType)}
            {@const outFixed = FIXED_METER_TYPES.has(outTypeName)}
            {@const inFixed = FIXED_METER_TYPES.has(inTypeName)}
            {@const outLevels = subRelationLevels(outTypeName, r.isFight)}
            {@const inLevels = subRelationLevels(inTypeName, r.isFight)}
            {@const outActive = subRelationKey(outTypeName, r.outMeter, r.isFight)}
            {@const inActive = subRelationKey(inTypeName, r.inMeter, r.isFight)}
            <tr class="align-middle">
              <td class="px-3 py-2 font-bold text-slate-900">
                {r.otherName ||
                  $_('mii.relations.slot_placeholder', {
                    values: { index: r.otherIndex + 1 },
                  })}
              </td>
              <td class="px-3 py-2">
                {#if baseTypeOptions}
                  <select
                    class="rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    onchange={(e) =>
                      commitType(r.outIndex, r.inIndex, r.inType, e.currentTarget.value)}
                  >
                    {#each baseTypeOptions as opt (opt.hash)}
                      <option value={opt.hash} selected={opt.hash === r.outType}>
                        {localizeRelationType(opt.name)}
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
                  <span class="font-mono text-xs text-slate-500">—</span>
                {:else if outLevels}
                  <select
                    class="rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
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
                    class="w-20 rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-right font-mono text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    value={r.outMeter.toString()}
                    onchange={(e) => commitMeter(r.outIndex, e.currentTarget.value)}
                  />
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if baseTypeOptions}
                  <select
                    class="rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    onchange={(e) =>
                      commitType(r.inIndex, r.outIndex, r.outType, e.currentTarget.value)}
                  >
                    {#each baseTypeOptions as opt (opt.hash)}
                      <option value={opt.hash} selected={opt.hash === r.inType}>
                        {localizeRelationType(opt.name)}
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
                  <span class="font-mono text-xs text-slate-500">—</span>
                {:else if inLevels}
                  <select
                    class="rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
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
                    class="w-20 rounded-lg border border-amber-400/60 bg-white px-2 py-1 text-right font-mono text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    value={r.inMeter.toString()}
                    onchange={(e) => commitMeter(r.inIndex, e.currentTarget.value)}
                  />
                {/if}
              </td>
              <td class="px-3 py-2 text-xs">
                {#if r.isFight}
                  <span
                    class="text-red-600"
                    aria-label={$_('mii.relations.fight_marker_aria')}
                    title={$_('mii.relations.fight_marker_aria')}>⚔︎</span
                  >
                {:else}
                  <span class="text-slate-400">-</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
