<script lang="ts">
  import {
    arrGetBool,
    arrGetEnum,
    arrGetFloat,
    arrGetInt,
    arrGetInt64,
    arrGetString,
    arrGetUInt,
    arrGetUInt64,
    arrGetVector2,
    arrGetVector3,
    arrSetBool,
    arrSetEnum,
    arrSetFloat,
    arrSetInt,
    arrSetInt64,
    arrSetString,
    arrSetUInt,
    arrSetUInt64,
    arrSetVector2,
    arrSetVector3,
    binaryArrayElements,
  } from '../sav/codec';
  import { DataType } from '../sav/dataType';
  import { hexU32, parseMaybeHex } from '../sav/format';
  import { enumOptionName, enumOptionsFor } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty as playerMarkDirty } from '../playerEditor.svelte';
  import { INPUT_CLASS, MONO_INPUT_CLASS } from '../styles';

  type Props = {
    entry: Entry;
    index: number;
    markDirty?: (e: Entry) => void;
  };
  let { entry, index, markDirty = playerMarkDirty }: Props = $props();

  let tick = $state(0);

  let error = $state<string | null>(null);

  function commit(fn: () => void): void {
    try {
      fn();
      markDirty(entry);
      tick++;
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const numClass = `w-32 ${MONO_INPUT_CLASS}`;
  const longNumClass = `w-48 ${MONO_INPUT_CLASS}`;
  const vecClass = `w-20 ${MONO_INPUT_CLASS}`;
  const enumHexClass = `w-40 ${MONO_INPUT_CLASS}`;
  const enumSelectClass = `w-56 ${INPUT_CLASS}`;
  const stringClass = `w-64 ${INPUT_CLASS}`;
</script>

{#key tick}
  {#if entry.type === DataType.BoolArray}
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-edge/60 text-orange-500 focus:ring-orange-500/30"
      checked={arrGetBool(entry, index)}
      onchange={(e) => commit(() => arrSetBool(entry, index, e.currentTarget.checked))}
    />
  {:else if entry.type === DataType.IntArray}
    <input
      type="number"
      class={numClass}
      value={arrGetInt(entry, index)}
      step="1"
      onchange={(e) => {
        const v = Number(e.currentTarget.value);
        if (Number.isFinite(v)) commit(() => arrSetInt(entry, index, Math.trunc(v)));
      }}
    />
  {:else if entry.type === DataType.UIntArray}
    {@const raw = arrGetUInt(entry, index)}
    {@const optName = enumOptionName(raw)}
    <div class="flex flex-col gap-0.5">
      <input
        type="number"
        class={numClass}
        value={raw}
        min="0"
        step="1"
        onchange={(e) => {
          const v = Number(e.currentTarget.value);
          if (Number.isFinite(v) && v >= 0) commit(() => arrSetUInt(entry, index, Math.trunc(v)));
        }}
      />
      {#if optName}
        <span class="text-[11px] text-content-faint">≈ {optName}</span>
      {/if}
    </div>
  {:else if entry.type === DataType.FloatArray}
    <input
      type="text"
      inputmode="decimal"
      class={numClass}
      value={String(arrGetFloat(entry, index))}
      onchange={(e) => {
        const v = Number(e.currentTarget.value);
        if (Number.isFinite(v)) commit(() => arrSetFloat(entry, index, v));
      }}
    />
  {:else if entry.type === DataType.EnumArray}
    {@const raw = arrGetEnum(entry, index)}
    {@const options = enumOptionsFor(entry.hash)}
    {#if options && options.length > 0}
      {@const matched = options.some((o) => o.hash === raw)}
      <select
        class={enumSelectClass}
        onchange={(e) => {
          const n = Number.parseInt(e.currentTarget.value, 10);
          if (Number.isFinite(n)) commit(() => arrSetEnum(entry, index, n));
        }}
      >
        {#each options as opt (opt.hash)}
          <option value={opt.hash} selected={opt.hash === raw}>{opt.label ?? opt.name}</option>
        {/each}
        {#if !matched}
          <option value={raw} selected>{hexU32(raw)}</option>
        {/if}
      </select>
    {:else}
      {@const optName = enumOptionName(raw)}
      <div class="flex flex-col gap-0.5">
        <input
          type="text"
          class={enumHexClass}
          value={hexU32(raw)}
          onchange={(e) => {
            const n = parseMaybeHex(e.currentTarget.value);
            if (n == null) error = 'Enter decimal or 0x-hex';
            else commit(() => arrSetEnum(entry, index, n));
          }}
        />
        {#if optName}
          <span class="text-[11px] text-content-faint">= {optName}</span>
        {/if}
      </div>
    {/if}
  {:else if entry.type === DataType.Int64Array}
    <input
      type="text"
      inputmode="numeric"
      class={longNumClass}
      value={arrGetInt64(entry, index).toString()}
      onchange={(e) => {
        try {
          commit(() => arrSetInt64(entry, index, BigInt(e.currentTarget.value.trim())));
        } catch {
          error = 'Enter a valid integer';
        }
      }}
    />
  {:else if entry.type === DataType.UInt64Array}
    <input
      type="text"
      inputmode="numeric"
      class={longNumClass}
      value={arrGetUInt64(entry, index).toString()}
      onchange={(e) => {
        try {
          const n = BigInt(e.currentTarget.value.trim());
          if (n < 0n) throw new Error('negative');
          commit(() => arrSetUInt64(entry, index, n));
        } catch {
          error = 'Enter a non-negative integer';
        }
      }}
    />
  {:else if entry.type === DataType.Vector2Array}
    {@const v = arrGetVector2(entry, index)}
    <div class="flex gap-2">
      <input
        type="text"
        inputmode="decimal"
        class={vecClass}
        value={String(v.x)}
        onchange={(e) => {
          const n = Number(e.currentTarget.value);
          if (Number.isFinite(n))
            commit(() =>
              arrSetVector2(entry, index, {
                ...arrGetVector2(entry, index),
                x: n,
              }),
            );
        }}
      />
      <input
        type="text"
        inputmode="decimal"
        class={vecClass}
        value={String(v.y)}
        onchange={(e) => {
          const n = Number(e.currentTarget.value);
          if (Number.isFinite(n))
            commit(() =>
              arrSetVector2(entry, index, {
                ...arrGetVector2(entry, index),
                y: n,
              }),
            );
        }}
      />
    </div>
  {:else if entry.type === DataType.Vector3Array}
    {@const v = arrGetVector3(entry, index)}
    <div class="flex gap-2">
      {#each ['x', 'y', 'z'] as axis (axis)}
        <input
          type="text"
          inputmode="decimal"
          class={vecClass}
          value={String(v[axis as 'x' | 'y' | 'z'])}
          onchange={(e) => {
            const n = Number(e.currentTarget.value);
            if (Number.isFinite(n))
              commit(() =>
                arrSetVector3(entry, index, {
                  ...arrGetVector3(entry, index),
                  [axis]: n,
                }),
              );
          }}
        />
      {/each}
    </div>
  {:else if entry.type === DataType.String16Array || entry.type === DataType.String32Array || entry.type === DataType.String64Array || entry.type === DataType.WString16Array || entry.type === DataType.WString32Array || entry.type === DataType.WString64Array}
    <input
      type="text"
      class={stringClass}
      value={arrGetString(entry, index)}
      onchange={(e) => {
        try {
          commit(() => arrSetString(entry, index, e.currentTarget.value));
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
      }}
    />
  {:else if entry.type === DataType.BinaryArray}
    {@const el = binaryArrayElements(entry)[index]}
    <span class="font-mono text-xs text-content-faint">
      {el ? `${el.size} bytes` : 'n/a'}
    </span>
  {:else}
    <span class="text-xs text-content-faint">n/a</span>
  {/if}

  {#if error}
    <p class="mt-1 text-xs text-danger">{error}</p>
  {/if}
{/key}
