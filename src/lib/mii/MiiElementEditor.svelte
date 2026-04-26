<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    arrGetEnum,
    arrGetInt,
    arrGetString,
    arrGetUInt,
    arrSetEnum,
    arrSetInt,
    arrSetString,
    arrSetUInt,
  } from '../sav/codec';
  import { safe } from '../sav/format';
  import { enumOptionName, enumOptionsFor } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';
  import type { MiiField } from './miiFields';

  type Props = {
    entry: Entry;
    index: number;
    field: MiiField;
  };
  let { entry, index, field }: Props = $props();

  const tick = $derived(miiState.tick);

  let error = $state<string | null>(null);

  const stringValue = $derived.by(() => {
    void tick;
    if (field.kind !== 'string') return '';
    return safe(() => arrGetString(entry, index), '');
  });

  const numberValue = $derived.by(() => {
    void tick;
    const offset = field.displayOffset ?? 0;
    if (field.kind === 'uint') return safe(() => arrGetUInt(entry, index), 0) + offset;
    if (field.kind === 'int') return safe(() => arrGetInt(entry, index), 0) + offset;
    return 0;
  });

  const enumValue = $derived.by(() => {
    void tick;
    if (field.kind !== 'enum') return 0;
    return safe(() => arrGetEnum(entry, index), 0);
  });

  const enumOptions = $derived.by(() => {
    if (field.kind !== 'enum') return null;
    return enumOptionsFor(field.hash);
  });

  // Map a curated enum option name to a localized label, when we have one.
  function localizeEnumOption(name: string, fallbackLabel: string | undefined): string {
    if (field.name === 'Mii.Name.PronounType') {
      const t = $_(`mii.pronoun.${name}`);
      if (t && t !== `mii.pronoun.${name}`) return t;
    }
    if (field.name === 'Mii.MiiMisc.FaceInfo.Gender') {
      const t = $_(`mii.gender.${name}`);
      if (t && t !== `mii.gender.${name}`) return t;
    }
    return fallbackLabel ?? name;
  }

  function commitString(raw: string): void {
    try {
      arrSetString(entry, index, raw);
      markDirty(entry);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function commitNumber(raw: string): void {
    const trimmed = raw.replace(/[,\s]/g, '');
    if (trimmed === '') {
      error = $_('mii.errors.required');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      error = $_('mii.errors.must_be_number');
      return;
    }
    const truncated = Math.trunc(n);
    if (field.min != null && truncated < field.min) {
      error = $_('mii.errors.must_be_min', { values: { min: field.min } });
      return;
    }
    if (field.max != null && truncated > field.max) {
      error = $_('mii.errors.must_be_max', { values: { max: field.max } });
      return;
    }

    const stored = truncated - (field.displayOffset ?? 0);
    try {
      if (field.kind === 'uint') {
        if (stored < 0) {
          error = $_('mii.errors.must_be_non_negative');
          return;
        }
        arrSetUInt(entry, index, stored >>> 0);
      } else if (field.kind === 'int') {
        arrSetInt(entry, index, stored | 0);
      }
      markDirty(entry);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function commitEnum(rawHash: string): void {
    const n = Number.parseInt(rawHash, 10);
    if (!Number.isFinite(n)) return;
    try {
      arrSetEnum(entry, index, n >>> 0);
      markDirty(entry);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const numberClass = `${FORM_INPUT_CLASS} font-mono`;
</script>

<label class="block min-w-0">
  <span class={LABEL_CLASS}>{$_(`mii.fields.${field.labelKey}`)}</span>

  {#if field.kind === 'string'}
    <input
      type="text"
      class={FORM_INPUT_CLASS}
      value={stringValue}
      onchange={(e) => commitString(e.currentTarget.value)}
    />
  {:else if field.kind === 'uint' || field.kind === 'int'}
    {#if field.presentation === 'slider' && field.min != null && field.max != null}
      {@const pct = ((numberValue - field.min) / (field.max - field.min)) * 100}
      <div class="mt-1.5 flex items-center gap-3">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step="1"
          value={numberValue}
          oninput={(e) => commitNumber(e.currentTarget.value)}
          class="block h-2 w-full cursor-pointer appearance-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40
                 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-edge [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110
                 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-edge [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110"
          style="background: linear-gradient(to right, rgb(249 115 22) 0%, rgb(249 115 22) {pct}%, rgb(254 215 170) {pct}%, rgb(254 215 170) 100%);"
        />
        <span class="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-content">
          {numberValue}
        </span>
      </div>
    {:else}
      <input
        type="text"
        inputmode="numeric"
        class={numberClass}
        value={numberValue.toString()}
        onchange={(e) => commitNumber(e.currentTarget.value)}
      />
    {/if}
  {:else if field.kind === 'enum'}
    <select class={FORM_INPUT_CLASS} onchange={(e) => commitEnum(e.currentTarget.value)}>
      {#if enumOptions}
        {#each enumOptions as opt (opt.hash)}
          <option value={opt.hash} selected={opt.hash === enumValue}>
            {localizeEnumOption(opt.name, opt.label)}
          </option>
        {/each}
        {#if !enumOptions.some((o) => o.hash === enumValue)}
          <option value={enumValue} selected>
            {enumOptionName(enumValue) ?? '0x' + enumValue.toString(16).padStart(8, '0')}
          </option>
        {/if}
      {:else}
        <option value={enumValue} selected>
          {enumOptionName(enumValue) ?? '0x' + enumValue.toString(16).padStart(8, '0')}
        </option>
      {/if}
    </select>
  {/if}

  {#if field.hintKey}
    <span class="mt-1 block text-xs text-content-muted">
      {$_(`mii.fields.${field.hintKey}`)}
    </span>
  {/if}
  {#if error}
    <span class="mt-1 block text-xs text-danger">{error}</span>
  {/if}
</label>
