<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import {
    arrGetBool,
    arrGetInt,
    arrGetString,
    arrGetUInt,
    arrGetUInt64,
    arrSetBool,
    arrSetInt,
    arrSetUInt,
    arrSetUInt64,
  } from '../sav/codec';
  import { allActors, actorDisplay } from '../mapObjects/actors';
  import { allCloths, clothLabel } from '../sav/clothList.svelte';
  import { allFoods, foodByHash, foodImageUrl, foodLabel } from '../sav/foodList.svelte';
  import { safe } from '../sav/format';
  import { murmur3_x86_32 } from '../sav/hash';
  import { allTreasures, treasureLabel } from '../sav/treasureList.svelte';
  import {
    allTroubles,
    troubleByHash,
    troublePreview,
    type Trouble,
    type TroubleTargetKey,
  } from '../sav/troubleList.svelte';
  import type { Entry } from '../sav/types';
  import {
    CARD_BASE_CLASS,
    CARD_CLASS,
    FORM_INPUT_CLASS,
    LABEL_CLASS,
    PILL_BUTTON_CLASS,
  } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';
  import { NAME_FIELD_HASH } from './miiFields';
  import MiiSlotSelector from './MiiSlotSelector.svelte';
  import { populatedMiiIndices } from './populated';
  import {
    ITEM_TYPE_LABEL_KEY,
    ITEM_TYPE_VALUES,
    TARGET_FIELD_KEYS,
    TROUBLE_FIELDS,
    TROUBLE_TARGET_FIELDS,
    type ItemTypeValue,
    type TroubleField,
    type TroubleFieldKey,
  } from './troubleFields';

  type Props = {
    entries: Entry[];
    selectedIndex: number | null;
  };
  let { entries, selectedIndex = $bindable(null) }: Props = $props();

  const tick = $derived(miiState.tick);
  const ui = $derived($locale);

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const fieldEntries = $derived.by(() => {
    const out = {} as Record<TroubleFieldKey, Entry | null>;
    for (const k of Object.keys(TROUBLE_FIELDS) as TroubleFieldKey[]) {
      const f = TROUBLE_FIELDS[k];
      const e = byHash.get(f.hash) ?? null;
      out[k] = e && e.type === f.type ? e : null;
    }
    return out;
  });

  function getF(key: TroubleFieldKey): TroubleField {
    return TROUBLE_FIELDS[key];
  }

  let originalPayloads = $state<Partial<Record<TroubleFieldKey, Uint8Array>>>({});

  $effect(() => {
    void miiState.loadId;
    const snap: Partial<Record<TroubleFieldKey, Uint8Array>> = {};
    for (const k of Object.keys(TROUBLE_FIELDS) as TroubleFieldKey[]) {
      const e = fieldEntries[k];
      if (e?.payload) snap[k] = new Uint8Array(e.payload);
    }
    originalPayloads = snap;
  });

  function revertTrouble(): void {
    const idx = selectedIndex;
    if (idx == null) return;
    for (const k of Object.keys(TROUBLE_FIELDS) as TroubleFieldKey[]) {
      const e = fieldEntries[k];
      const orig = originalPayloads[k];
      if (!e?.payload || !orig || e.payload.byteLength !== orig.byteLength) continue;
      const f = TROUBLE_FIELDS[k];
      const elemSize = bytesPerElement(f.type);
      if (!elemSize) continue;
      const start = 4 + idx * f.perMii * elemSize;
      const end = start + f.perMii * elemSize;
      if (end > orig.byteLength) continue;
      e.payload.set(orig.subarray(start, end), start);
      markDirty(e);
    }
  }

  function bytesPerElement(t: number): number | null {
    if (t === 3 /* IntArray */ || t === 21 /* UIntArray */) return 4;
    if (t === 23 /* Int64Array */ || t === 25 /* UInt64Array */) return 8;
    return null;
  }

  function revertBoolField(key: TroubleFieldKey): void {
    const idx = selectedIndex;
    if (idx == null) return;
    const e = fieldEntries[key];
    const orig = originalPayloads[key];
    if (!e?.payload || !orig) return;
    const byteIdx = 4 + (idx >>> 3);
    if (byteIdx >= orig.byteLength || byteIdx >= e.payload.byteLength) return;
    const bit = idx & 7;
    const mask = 1 << bit;
    e.payload[byteIdx] = (e.payload[byteIdx] & ~mask) | (orig[byteIdx] & mask);
    markDirty(e);
  }

  function revertAll(): void {
    revertTrouble();
    revertBoolField('isFirstDemoDone');
  }

  const idEntry = $derived(fieldEntries.id);
  const currentTroubleHash = $derived.by(() => {
    void tick;
    const idx = selectedIndex;
    if (!idEntry || idx == null) return 0;
    return safe(() => arrGetUInt(idEntry, idx), 0) >>> 0;
  });
  const currentTrouble = $derived(troubleByHash(currentTroubleHash));

  type TroubleGroup = { category: string; label: string; troubles: Trouble[] };
  const groupedTroubles = $derived.by<TroubleGroup[]>(() => {
    void ui;
    const all = allTroubles();
    const buckets = new SvelteMap<string, Trouble[]>();
    for (const t of all) {
      let arr = buckets.get(t.category);
      if (!arr) {
        arr = [];
        buckets.set(t.category, arr);
      }
      arr.push(t);
    }
    const out: TroubleGroup[] = [];
    for (const [category, list] of buckets) {
      const label = $_(`mii.troubles.category.${category}`, {
        default: category,
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      out.push({ category, label, troubles: list });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  });

  const previewText = $derived(currentTrouble ? troublePreview(currentTrouble, ui) : null);

  function impliedItemType(t: Trouble | null): ItemTypeValue {
    const r = t?.relevantTargets;
    if (!r) return -1;
    if (r.includes('targetUgcFood')) return 6;
    if (r.includes('targetUgcGoods')) return 7;
    if (r.includes('targetFood')) return 0;
    if (r.includes('targetCloth')) return 2;
    if (r.includes('targetCoordinate')) return 3;
    if (r.includes('targetGoods')) return 1;
    if (r.includes('targetMapObject')) return 4;
    return -1;
  }

  function commitTroubleId(rawHash: string): void {
    if (!idEntry || selectedIndex == null) return;
    const newHash = (Number.parseInt(rawHash, 10) || 0) >>> 0;
    if (newHash === currentTroubleHash) return;

    const next = newHash === 0 ? null : troubleByHash(newHash);
    const keepKeys = new SvelteSet<TroubleFieldKey>();
    if (next?.relevantTargets) {
      for (const tk of next.relevantTargets) {
        for (const fk of TROUBLE_TARGET_FIELDS[tk]) keepKeys.add(fk);
      }
    } else if (next) {
      for (const k of TARGET_FIELD_KEYS) keepKeys.add(k);
    }

    arrSetUInt(idEntry, selectedIndex, newHash);
    markDirty(idEntry);

    for (const fk of TARGET_FIELD_KEYS) {
      if (keepKeys.has(fk)) continue;
      clearField(fk);
    }

    if (next) {
      const implied = impliedItemType(next);
      const itEntry = fieldEntries.targetItemType;
      if (itEntry && implied !== -1) {
        arrSetInt(itEntry, selectedIndex, implied);
        markDirty(itEntry);
      }

      applyDefaultSchedule(next);
    }

    if (newHash === 0) {
      const next64 = fieldEntries.nextGameTime;
      const end64 = fieldEntries.endGameTime;
      if (next64) {
        arrSetUInt64(next64, selectedIndex, 0n);
        markDirty(next64);
      }
      if (end64) {
        arrSetUInt64(end64, selectedIndex, 0n);
        markDirty(end64);
      }
      const demo = fieldEntries.isFirstDemoDone;
      if (demo) {
        arrSetBool(demo, selectedIndex, false);
        markDirty(demo);
      }
    }
  }

  function clearField(key: TroubleFieldKey): void {
    if (selectedIndex == null) return;
    const e = fieldEntries[key];
    if (!e) return;
    const f = getF(key);
    for (let s = 0; s < f.perMii; s++) {
      const i = selectedIndex * f.perMii + s;
      switch (f.type) {
        case 3:
          arrSetInt(
            e,
            i,
            key === 'targetMii' ||
              key === 'targetItemType' ||
              key === 'targetUgcFood' ||
              key === 'targetUgcGoods' ||
              key === 'targetUgcText' ||
              key === 'targetPreset'
              ? -1
              : 0,
          );
          break;
        case 21:
          arrSetUInt(e, i, 0);
          break;
        default:
          break;
      }
    }
    markDirty(e);
  }

  function readU64(key: TroubleFieldKey): bigint {
    void tick;
    const idx = selectedIndex;
    if (idx == null) return 0n;
    const e = fieldEntries[key];
    if (!e) return 0n;
    return safe(() => arrGetUInt64(e, idx), 0n);
  }
  function writeU64(key: TroubleFieldKey, v: bigint): void {
    const idx = selectedIndex;
    if (idx == null) return;
    const e = fieldEntries[key];
    if (!e) return;
    arrSetUInt64(e, idx, v < 0n ? 0n : v);
    markDirty(e);
  }

  function readBool(key: TroubleFieldKey): boolean {
    void tick;
    const idx = selectedIndex;
    if (idx == null) return false;
    const e = fieldEntries[key];
    if (!e) return false;
    return safe(() => arrGetBool(e, idx), false);
  }
  function writeBool(key: TroubleFieldKey, v: boolean): void {
    const idx = selectedIndex;
    if (idx == null) return;
    const e = fieldEntries[key];
    if (!e) return;
    arrSetBool(e, idx, v);
    markDirty(e);
  }

  const nextV = $derived(readU64('nextGameTime'));
  const endV = $derived(readU64('endGameTime'));
  const cbV = $derived(readU64('childBirthBlockTime'));
  const isFirstDemo = $derived(readBool('isFirstDemoDone'));

  function toDateInputValue(seconds: bigint): string {
    if (seconds === 0n) return '';
    const d = new Date(Number(seconds) * 1000);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      'T' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  function nowSeconds(): bigint {
    return BigInt(Math.floor(Date.now() / 1000));
  }

  function bumpTime(key: TroubleFieldKey, addSeconds: number): void {
    const cur = readU64(key);
    const base = cur === 0n ? nowSeconds() : cur;
    writeU64(key, base + BigInt(addSeconds));
  }

  function applyDefaultSchedule(t: Trouble | null): void {
    if (!t) return;
    const now = nowSeconds();
    writeU64('nextGameTime', now);
    if (t.endMinute > 0) {
      writeU64('endGameTime', now + BigInt(t.endMinute * 60));
    } else {
      writeU64('endGameTime', 0n);
    }
  }

  function commitDateInput(key: TroubleFieldKey, raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) {
      writeU64(key, 0n);
      return;
    }
    const ms = Date.parse(trimmed);
    if (!Number.isFinite(ms)) return;
    writeU64(key, BigInt(Math.floor(ms / 1000)));
  }

  function fmtMinutes(min: number): string {
    if (min <= 0) return '';
    if (min < 60) return $_('mii.troubles.duration_minutes', { values: { n: min } });
    const hours = Math.round(min / 60);
    if (hours < 48) return $_('mii.troubles.duration_hours', { values: { n: hours } });
    const days = Math.round(min / 1440);
    return $_('mii.troubles.duration_days', { values: { n: days } });
  }

  const activeTargetKeys = $derived.by<TroubleTargetKey[]>(() => {
    if (selectedIndex == null || currentTroubleHash === 0) return [];
    if (currentTrouble?.relevantTargets) return currentTrouble.relevantTargets;
    const keys: TroubleTargetKey[] = [];
    const isPopulated = (fk: TroubleFieldKey): boolean => {
      const e = fieldEntries[fk];
      if (!e || selectedIndex == null) return false;
      const f = getF(fk);
      for (let s = 0; s < f.perMii; s++) {
        const i = selectedIndex * f.perMii + s;
        try {
          if (f.type === 21) {
            if (arrGetUInt(e, i) !== 0) return true;
          } else if (f.type === 3) {
            if (arrGetInt(e, i) !== -1 && arrGetInt(e, i) !== 0) return true;
          }
        } catch {
          /* empty */
        }
      }
      return false;
    };
    for (const tk of Object.keys(TROUBLE_TARGET_FIELDS) as TroubleTargetKey[]) {
      const fields = TROUBLE_TARGET_FIELDS[tk];
      if (fields.some((fk) => isPopulated(fk))) keys.push(tk);
    }
    return keys;
  });

  const nameEntry = $derived(byHash.get(NAME_FIELD_HASH) ?? null);
  const miiOptions = $derived.by(() => {
    void tick;
    if (!nameEntry) return [] as { index: number; name: string }[];
    return populatedMiiIndices(byHash).map((i) => {
      let n = '';
      try {
        n = arrGetString(nameEntry, i);
      } catch {
        /* empty */
      }
      return { index: i, name: n };
    });
  });

  function arrIndex(key: TroubleFieldKey, slot: number): number {
    if (selectedIndex == null) return -1;
    return selectedIndex * getF(key).perMii + slot;
  }
  function getInt(key: TroubleFieldKey, slot: number, fallback: number): number {
    void tick;
    const e = fieldEntries[key];
    if (!e) return fallback;
    return safe(() => arrGetInt(e, arrIndex(key, slot)), fallback);
  }
  function setInt(key: TroubleFieldKey, slot: number, v: number): void {
    const e = fieldEntries[key];
    if (!e) return;
    arrSetInt(e, arrIndex(key, slot), v | 0);
    markDirty(e);
  }
  function getUInt(key: TroubleFieldKey, slot: number, fallback = 0): number {
    void tick;
    const e = fieldEntries[key];
    if (!e) return fallback;
    return safe(() => arrGetUInt(e, arrIndex(key, slot)), fallback) >>> 0;
  }
  function setUInt(key: TroubleFieldKey, slot: number, v: number): void {
    const e = fieldEntries[key];
    if (!e) return;
    arrSetUInt(e, arrIndex(key, slot), v >>> 0);
    markDirty(e);
  }

  const sortedFoods = $derived.by(() => {
    const list = allFoods();
    return [...list].sort((a, b) => {
      const an = foodLabel(a, ui).toLocaleLowerCase();
      const bn = foodLabel(b, ui).toLocaleLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  });
  type ClothEntry = { hash: number; index: number; label: string };
  const sortedClothes = $derived.by<ClothEntry[]>(() => {
    return [...allCloths()]
      .map((c) => ({
        hash: murmur3_x86_32(c.name) >>> 0,
        index: c.index,
        label: clothLabel(c, ui),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });
  function clothByHash(hash: number): ClothEntry | null {
    if (hash === 0) return null;
    for (const c of allCloths()) {
      if (murmur3_x86_32(c.name) >>> 0 === hash >>> 0) {
        return { hash, index: c.index, label: clothLabel(c, ui) };
      }
    }
    return null;
  }
  type TreasureEntry = { hash: number; name: string; label: string };
  const sortedTreasures = $derived.by<TreasureEntry[]>(() => {
    return [...allTreasures()]
      .map((t) => ({
        hash: murmur3_x86_32(t.name) >>> 0,
        name: t.name,
        label: treasureLabel(t, ui),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });
  function treasureByHash(hash: number): TreasureEntry | null {
    if (hash === 0) return null;
    for (const t of allTreasures()) {
      if (murmur3_x86_32(t.name) >>> 0 === hash >>> 0) {
        return { hash, name: t.name, label: treasureLabel(t, ui) };
      }
    }
    return null;
  }

  const sortedActors = $derived(allActors());

  const ready = $derived(idEntry != null);

  const issuesUrl =
    'https://github.com/alexislours/ltd-save-editor/issues/new?template=bug_report.yml';
</script>

{#snippet complexityWarning()}
  <aside
    role="note"
    class="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4 dark:bg-amber-500/15"
  >
    <div class="flex items-start gap-3">
      <span
        aria-hidden="true"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-base font-bold text-white"
        >!</span
      >
      <div class="flex-1">
        <h3 class="text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          {$_('mii.troubles.complexity_warning_title')}
        </h3>
        <p class="mt-2 text-sm text-amber-900 dark:text-amber-200">
          {$_('mii.troubles.complexity_warning_body')}
        </p>
        <p class="mt-2 text-sm text-amber-900 dark:text-amber-200">
          {$_('mii.troubles.complexity_warning_no_support')}
          <a
            href={issuesUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
          >
            {$_('mii.troubles.complexity_warning_report_link')}
          </a>.
        </p>
      </div>
    </div>
  </aside>
{/snippet}

{#if !ready}
  <div class="grid gap-4">
    {@render complexityWarning()}
    <MiiSlotSelector {entries} bind:selectedIndex />
    <section class={CARD_CLASS}>
      <p class="text-sm text-content-muted">{$_('mii.troubles.missing')}</p>
    </section>
  </div>
{:else}
  <div class="grid gap-4">
    {@render complexityWarning()}
    <MiiSlotSelector {entries} bind:selectedIndex />

    {#if selectedIndex != null}
      <section class={CARD_CLASS}>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="text-base font-bold text-content-strong">
              {$_('mii.troubles.section_active')}
            </h3>
            <p class="mt-0.5 text-xs text-content-muted">
              {$_('mii.troubles.section_active_caption')}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-edge/50 bg-transparent px-3 py-1.5 text-sm font-bold text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
              onclick={revertAll}
              title={$_('mii.troubles.revert_tip')}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
                <path d="M5 4V1L0 5l5 4V6h6a3 3 0 0 1 0 6H4v2h7a5 5 0 0 0 0-10H5z" />
              </svg>
              {$_('mii.troubles.revert_action')}
            </button>
            {#if currentTroubleHash !== 0}
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-danger-edge bg-surface px-3 py-1.5 text-sm font-bold text-danger shadow-sm transition-colors hover:bg-danger-bg"
                onclick={() => commitTroubleId('0')}
                title={$_('mii.troubles.reset_trouble_tip')}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
                  <path
                    d="M12.71 4.71 11.29 3.29 8 6.59 4.71 3.29 3.29 4.71 6.59 8l-3.3 3.29 1.42 1.42L8 9.41l3.29 3.3 1.42-1.42L9.41 8z"
                  />
                </svg>
                {$_('mii.troubles.reset_trouble_action')}
              </button>
            {/if}
          </div>
        </div>

        <div class="mt-4 grid gap-4">
          <label class="block min-w-0">
            <span class={LABEL_CLASS}>{$_('mii.troubles.active_label')}</span>
            <select
              class={FORM_INPUT_CLASS}
              value={currentTroubleHash.toString()}
              onchange={(e) => commitTroubleId(e.currentTarget.value)}
            >
              <option value="0">{$_('mii.troubles.active_none')}</option>
              {#if currentTroubleHash !== 0 && !currentTrouble}
                <option value={currentTroubleHash.toString()} selected>
                  {$_('mii.troubles.unknown', {
                    values: { hash: '0x' + currentTroubleHash.toString(16).padStart(8, '0') },
                  })}
                </option>
              {/if}
              {#each groupedTroubles as group (group.category)}
                <optgroup label={group.label}>
                  {#each group.troubles as t (t.hash)}
                    <option value={t.hash.toString()}>
                      {troublePreview(t, ui) ?? t.name} · {t.name}
                    </option>
                  {/each}
                </optgroup>
              {/each}
            </select>
            {#if currentTrouble}
              <span class="mt-1 block font-mono text-[11px] text-content-faint">
                {currentTrouble.name} · 0x{currentTroubleHash.toString(16).padStart(8, '0')}
              </span>
            {/if}
          </label>

          {#if previewText}
            <blockquote
              class="rounded-md border-l-4 border-orange-500/70 bg-surface-muted px-3 py-2 text-sm italic text-content"
            >
              <span class="block text-[10px] font-bold tracking-wide text-content-faint uppercase">
                {$_('mii.troubles.preview_label')}
              </span>
              {previewText}
            </blockquote>
          {/if}

          {#if currentTrouble}
            <div class="flex flex-wrap gap-1.5 text-xs">
              <span
                class="rounded-full bg-surface-sunken px-2.5 py-0.5 font-bold text-content"
                title={$_('mii.troubles.meta.category_tip')}
              >
                {$_(`mii.troubles.category.${currentTrouble.category}`, {
                  default: currentTrouble.category,
                })}
              </span>
              <span
                class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
                title={$_('mii.troubles.meta.method_tip')}
              >
                {currentTrouble.methodKey}
              </span>
              {#if currentTrouble.targetMiiNum > 0}
                <span
                  class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
                  title={$_('mii.troubles.meta.target_mii_num_tip')}
                >
                  {$_('mii.troubles.meta.target_mii_num', {
                    values: { n: currentTrouble.targetMiiNum },
                  })}
                </span>
              {/if}
              {#if currentTrouble.endMinute > 0}
                <span
                  class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
                  title={$_('mii.troubles.meta.duration_tip')}
                >
                  ⏱ {fmtMinutes(currentTrouble.endMinute)}
                </span>
              {/if}
              {#if currentTrouble.nextTimeMinute > 0}
                <span
                  class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
                  title={$_('mii.troubles.meta.cooldown_tip')}
                >
                  ↻ {fmtMinutes(currentTrouble.nextTimeMinute)}
                </span>
              {/if}
              {#if currentTrouble.rescueDay > 0}
                <span
                  class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
                  title={$_('mii.troubles.meta.rescue_day_tip')}
                >
                  {$_('mii.troubles.meta.rescue_day', {
                    values: { n: currentTrouble.rescueDay },
                  })}
                </span>
              {/if}
              {#if currentTrouble.enableIntroductionId}
                <span
                  class="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-800 dark:text-amber-300"
                  title={$_('mii.troubles.meta.gated_tip')}
                >
                  🔒 {currentTrouble.enableIntroductionId}
                </span>
              {/if}
              {#if currentTrouble.foodAttr}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  🍽 {currentTrouble.foodAttr}
                </span>
              {/if}
              {#if currentTrouble.goodsAttr}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  🎁 {currentTrouble.goodsAttr}
                </span>
              {/if}
              {#if currentTrouble.clothType}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  👕 {currentTrouble.clothType}
                </span>
              {/if}
              {#if currentTrouble.clothEventType}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  🎉 {currentTrouble.clothEventType}
                </span>
              {/if}
              {#if currentTrouble.clothSeasonType && currentTrouble.clothSeasonType !== 'All'}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  🌤 {currentTrouble.clothSeasonType}
                </span>
              {/if}
              {#if currentTrouble.islandEditType}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  🏝 {currentTrouble.islandEditType}
                  {#if currentTrouble.islandEditMapObjCategory}
                    · {currentTrouble.islandEditMapObjCategory}
                  {/if}
                </span>
              {/if}
              {#if currentTrouble.islandEditPrices.length > 0}
                <span
                  class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
                  title={$_('mii.troubles.meta.prices_tip')}
                >
                  💰 {currentTrouble.islandEditPrices.join(' / ')}
                </span>
              {/if}
              {#if currentTrouble.boostType}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  ⚡ {currentTrouble.boostType}
                </span>
              {/if}
              {#if currentTrouble.feelingType && currentTrouble.feelingType !== 'Normal'}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  💭 {currentTrouble.feelingType}
                </span>
              {/if}
              {#if currentTrouble.fightFlagType}
                <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
                  ⚔ {currentTrouble.fightFlagType}
                </span>
              {/if}
              {#each currentTrouble.flags as flag (flag)}
                <span
                  class="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-orange-700 dark:text-orange-300"
                >
                  {$_(`mii.troubles.flag.${flag}`)}
                </span>
              {/each}
              {#if currentTrouble.generateRate === 0}
                <span
                  class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content-muted italic"
                  title={$_('mii.troubles.meta.scripted_tip')}
                >
                  {$_('mii.troubles.meta.scripted')}
                </span>
              {/if}
            </div>
          {/if}
        </div>
      </section>

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
              onclick={() => applyDefaultSchedule(currentTrouble)}
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
              <button
                type="button"
                class={PILL_BUTTON_CLASS}
                onclick={() => writeU64('endGameTime', 0n)}
              >
                {$_('mii.troubles.disable_action')}
              </button>
            </div>
            {#if nextV > 0n && endV > 0n && endV < nextV}
              <span class="mt-1 block text-xs text-warn">
                {$_('mii.troubles.end_before_next_warning')}
              </span>
            {/if}
          </div>

          {#if fieldEntries.isFirstDemoDone}
            <label class="flex items-center gap-2 text-sm text-content">
              <input
                type="checkbox"
                checked={isFirstDemo}
                onchange={(e) => writeBool('isFirstDemoDone', e.currentTarget.checked)}
                class="h-4 w-4 rounded border-edge text-orange-500 focus:ring-orange-500/40"
              />
              <span class="font-bold text-content-strong">
                {$_('mii.troubles.first_demo_label')}
              </span>
            </label>
          {/if}
        </div>
      </section>

      {#if currentTroubleHash !== 0 && activeTargetKeys.length > 0}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-content-strong">
            {$_('mii.troubles.targets_heading')}
          </h3>

          <div class="mt-4 grid gap-4">
            {#each activeTargetKeys as targetKey (targetKey)}
              {#if targetKey === 'targetMii'}
                {@const slotCount = Math.max(1, Math.min(4, currentTrouble?.targetMiiNum ?? 4))}
                {@const slots = Array.from({ length: slotCount }, (_, i) => i)}
                <div class="grid gap-3 sm:grid-cols-2">
                  {#each slots as slot (slot)}
                    {@const v = getInt('targetMii', slot, -1)}
                    <label class="block min-w-0">
                      <span class={LABEL_CLASS}>
                        {$_('mii.troubles.target_mii', { values: { n: slot + 1 } })}
                      </span>
                      <select
                        class={FORM_INPUT_CLASS}
                        value={v.toString()}
                        onchange={(e) =>
                          setInt('targetMii', slot, Number.parseInt(e.currentTarget.value, 10))}
                      >
                        <option value="-1">{$_('mii.troubles.target_none')}</option>
                        {#each miiOptions as m (m.index)}
                          <option value={m.index.toString()}>
                            #{m.index + 1} · {m.name}
                          </option>
                        {/each}
                        {#if v >= 0 && !miiOptions.some((m) => m.index === v)}
                          <option value={v.toString()} selected>
                            #{v + 1} · {$_('mii.troubles.target_mii_unknown')}
                          </option>
                        {/if}
                      </select>
                    </label>
                  {/each}
                </div>
              {:else if targetKey === 'targetItemType'}
                {@const tv = getInt('targetItemType', 0, -1) as ItemTypeValue}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_item_type')}</span>
                  <select
                    class={FORM_INPUT_CLASS}
                    value={tv.toString()}
                    onchange={(e) =>
                      setInt('targetItemType', 0, Number.parseInt(e.currentTarget.value, 10))}
                  >
                    {#each ITEM_TYPE_VALUES as v (v)}
                      <option value={v.toString()}>
                        {$_(`mii.troubles.item_type.${ITEM_TYPE_LABEL_KEY[v]}`)}
                      </option>
                    {/each}
                  </select>
                </label>
              {:else if targetKey === 'targetFood'}
                {@const fv = getUInt('targetFood', 0)}
                {@const food = foodByHash(fv)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_food')}</span>
                  <div class="mt-1.5 flex items-start gap-3">
                    <div
                      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
                    >
                      {#if food && foodImageUrl(food.textureId)}
                        <img
                          src={foodImageUrl(food.textureId)}
                          alt={foodLabel(food, ui)}
                          class="h-full w-full object-contain p-0.5"
                          loading="lazy"
                        />
                      {:else}
                        <span class="text-[10px] text-content-faint">-</span>
                      {/if}
                    </div>
                    <select
                      class="{FORM_INPUT_CLASS} mt-0 flex-1"
                      value={fv.toString()}
                      onchange={(e) =>
                        setUInt(
                          'targetFood',
                          0,
                          (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0,
                        )}
                    >
                      <option value="0">{$_('mii.troubles.target_none')}</option>
                      {#if !food && fv !== 0}
                        <option value={fv.toString()} selected>
                          {$_('mii.troubles.unknown', {
                            values: { hash: '0x' + fv.toString(16).padStart(8, '0') },
                          })}
                        </option>
                      {/if}
                      {#each sortedFoods as f (f.hash)}
                        <option value={f.hash.toString()}>{foodLabel(f, ui)}</option>
                      {/each}
                    </select>
                  </div>
                </label>
              {:else if targetKey === 'targetCloth'}
                {@const cv = getUInt('targetCloth', 0)}
                {@const cloth = clothByHash(cv)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_cloth')}</span>
                  <select
                    class={FORM_INPUT_CLASS}
                    value={cv.toString()}
                    onchange={(e) =>
                      setUInt(
                        'targetCloth',
                        0,
                        (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0,
                      )}
                  >
                    <option value="0">{$_('mii.troubles.target_none')}</option>
                    {#if !cloth && cv !== 0}
                      <option value={cv.toString()} selected>
                        {$_('mii.troubles.unknown', {
                          values: { hash: '0x' + cv.toString(16).padStart(8, '0') },
                        })}
                      </option>
                    {/if}
                    {#each sortedClothes as c (c.hash)}
                      <option value={c.hash.toString()}>{c.label}</option>
                    {/each}
                  </select>
                </label>
              {:else if targetKey === 'targetCoordinate'}
                {@const cov = getUInt('targetCoordinate', 0)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_coordinate')}</span>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="{FORM_INPUT_CLASS} font-mono"
                    value={cov.toString()}
                    onchange={(e) =>
                      setUInt(
                        'targetCoordinate',
                        0,
                        (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0,
                      )}
                  />
                  <span class="mt-1 block text-xs text-content-muted">
                    {$_('mii.troubles.target_coordinate_hint')}
                  </span>
                </label>
              {:else if targetKey === 'targetGoods'}
                {@const gv = getUInt('targetGoods', 0)}
                {@const treasure = treasureByHash(gv)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_goods')}</span>
                  <select
                    class={FORM_INPUT_CLASS}
                    value={gv.toString()}
                    onchange={(e) =>
                      setUInt(
                        'targetGoods',
                        0,
                        (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0,
                      )}
                  >
                    <option value="0">{$_('mii.troubles.target_none')}</option>
                    {#if !treasure && gv !== 0}
                      <option value={gv.toString()} selected>
                        {$_('mii.troubles.unknown', {
                          values: { hash: '0x' + gv.toString(16).padStart(8, '0') },
                        })}
                      </option>
                    {/if}
                    {#each sortedTreasures as t (t.hash)}
                      <option value={t.hash.toString()}>{t.label}</option>
                    {/each}
                  </select>
                </label>
              {:else if targetKey === 'targetUgcFood'}
                {@const uv = getInt('targetUgcFood', 0, -1)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_ugc_food')}</span>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="{FORM_INPUT_CLASS} font-mono"
                    value={uv.toString()}
                    onchange={(e) =>
                      setInt('targetUgcFood', 0, Number.parseInt(e.currentTarget.value, 10))}
                  />
                </label>
              {:else if targetKey === 'targetUgcGoods'}
                {@const uv = getInt('targetUgcGoods', 0, -1)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_ugc_goods')}</span>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="{FORM_INPUT_CLASS} font-mono"
                    value={uv.toString()}
                    onchange={(e) =>
                      setInt('targetUgcGoods', 0, Number.parseInt(e.currentTarget.value, 10))}
                  />
                </label>
              {:else if targetKey === 'targetUgcText'}
                {@const uv = getInt('targetUgcText', 0, -1)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_ugc_text')}</span>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="{FORM_INPUT_CLASS} font-mono"
                    value={uv.toString()}
                    onchange={(e) =>
                      setInt('targetUgcText', 0, Number.parseInt(e.currentTarget.value, 10))}
                  />
                </label>
              {:else if targetKey === 'targetPreset'}
                {@const pv = getInt('targetPreset', 0, -1)}
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.target_preset_index')}</span>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="{FORM_INPUT_CLASS} font-mono"
                    value={pv.toString()}
                    onchange={(e) =>
                      setInt('targetPreset', 0, Number.parseInt(e.currentTarget.value, 10))}
                  />
                </label>
              {:else if targetKey === 'targetMapObject'}
                <div class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('mii.troubles.map_objects_heading')}</span>
                  <div class="mt-1.5 grid gap-2">
                    {#each [0, 1, 2, 3, 4] as slot (slot)}
                      {@const idV = getUInt('mapObjId', slot)}
                      {@const xV = getInt('mapObjX', slot, 0)}
                      {@const yV = getInt('mapObjY', slot, 0)}
                      {@const display = idV === 0 ? null : actorDisplay(idV)}
                      <div
                        class="{CARD_BASE_CLASS} grid grid-cols-2 items-end gap-2 px-3 py-2 sm:grid-cols-[2fr_1fr_1fr]"
                      >
                        <label class="col-span-2 block min-w-0 sm:col-span-1">
                          <span class="text-[11px] font-bold text-content-faint">
                            {$_('mii.troubles.map_object_label', { values: { n: slot + 1 } })}
                          </span>
                          <select
                            class={FORM_INPUT_CLASS}
                            value={idV.toString()}
                            onchange={(e) =>
                              setUInt(
                                'mapObjId',
                                slot,
                                (Number.parseInt(e.currentTarget.value, 10) || 0) >>> 0,
                              )}
                          >
                            <option value="0">{$_('mii.troubles.target_none')}</option>
                            {#if display && !display.key && idV !== 0}
                              <option value={idV.toString()} selected>
                                {$_('mii.troubles.unknown', {
                                  values: { hash: '0x' + idV.toString(16).padStart(8, '0') },
                                })}
                              </option>
                            {/if}
                            {#each sortedActors as a (a.hash)}
                              <option value={a.hash.toString()}>{a.label}</option>
                            {/each}
                          </select>
                        </label>
                        <label class="block min-w-0">
                          <span class="text-[11px] font-bold text-content-faint">X</span>
                          <input
                            type="text"
                            inputmode="numeric"
                            class="{FORM_INPUT_CLASS} font-mono"
                            value={xV.toString()}
                            onchange={(e) =>
                              setInt('mapObjX', slot, Number.parseInt(e.currentTarget.value, 10))}
                          />
                        </label>
                        <label class="block min-w-0">
                          <span class="text-[11px] font-bold text-content-faint">Y</span>
                          <input
                            type="text"
                            inputmode="numeric"
                            class="{FORM_INPUT_CLASS} font-mono"
                            value={yV.toString()}
                            onchange={(e) =>
                              setInt('mapObjY', slot, Number.parseInt(e.currentTarget.value, 10))}
                          />
                        </label>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </section>
      {/if}

      {#if fieldEntries.childBirthBlockTime}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-content-strong">
            {$_('mii.troubles.cooldowns_heading')}
          </h3>
          <div class="mt-4 block min-w-0 max-w-md">
            <span class={LABEL_CLASS}>{$_('mii.troubles.child_birth_block_label')}</span>
            <input
              type="datetime-local"
              class={FORM_INPUT_CLASS}
              value={toDateInputValue(cbV)}
              onchange={(e) => commitDateInput('childBirthBlockTime', e.currentTarget.value)}
            />
            <span class="mt-1 block text-xs text-content-muted">
              {cbV === 0n
                ? $_('mii.troubles.disabled')
                : $_('mii.troubles.epoch_label', {
                    values: { seconds: cbV.toString() },
                  })}
            </span>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                class={PILL_BUTTON_CLASS}
                onclick={() => writeU64('childBirthBlockTime', nowSeconds())}
              >
                {$_('mii.troubles.now_action')}
              </button>
              <button
                type="button"
                class={PILL_BUTTON_CLASS}
                onclick={() => bumpTime('childBirthBlockTime', 86400)}
              >
                {$_('mii.troubles.plus_day_action')}
              </button>
              <button
                type="button"
                class={PILL_BUTTON_CLASS}
                onclick={() => writeU64('childBirthBlockTime', 0n)}
              >
                {$_('mii.troubles.disable_action')}
              </button>
            </div>
          </div>
        </section>
      {/if}
    {/if}
  </div>
{/if}
