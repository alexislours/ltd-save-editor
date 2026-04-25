<script lang="ts">
  import {
    getBool,
    getEnum,
    getFloat,
    getInt,
    getInt64,
    getString,
    getUInt,
    getUInt64,
    getVector2,
    getVector3,
    isEditable,
    setBool,
    setEnum,
    setFloat,
    setInt,
    setInt64,
    setString,
    setUInt,
    setUInt64,
    setVector2,
    setVector3,
    stringEncodedSize,
  } from '../sav/codec';
  import { DataType, DataTypeName, isInline } from '../sav/dataType';
  import { hexU32, parseMaybeHex } from '../sav/format';
  import { enumOptionName, enumOptionsFor } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty as playerMarkDirty } from '../playerEditor.svelte';
  import { INPUT_CLASS, MONO_INPUT_CLASS } from '../styles';

  type Props = { entry: Entry; markDirty?: (e: Entry) => void };
  let { entry, markDirty = playerMarkDirty }: Props = $props();

  let error = $state<string | null>(null);

  function commit(fn: () => void): void {
    try {
      fn();
      markDirty(entry);
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function heapPreview(e: Entry): string {
    if (!e.payload) return '(null)';
    const size = e.payload.byteLength;
    if (size === 0) return '(empty)';
    const head = Array.from(e.payload.slice(0, Math.min(24, size)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    return `[${size} bytes] ${head}${size > 24 ? ' …' : ''}`;
  }

  const numClass = `w-40 ${MONO_INPUT_CLASS}`;
  const longNumClass = `w-56 ${MONO_INPUT_CLASS}`;
  const vecClass = `w-24 ${MONO_INPUT_CLASS}`;
  const enumHexClass = `w-44 ${MONO_INPUT_CLASS}`;
  const enumSelectClass = `w-56 ${INPUT_CLASS}`;
  const stringClass = `w-72 ${INPUT_CLASS}`;
</script>

{#if entry.type === DataType.Bool}
  <label class="flex items-center gap-2">
    <input
      type="checkbox"
      class="h-4 w-4 rounded border-amber-400/60 text-orange-500 focus:ring-orange-500/30"
      checked={getBool(entry)}
      onchange={(e) => commit(() => setBool(entry, e.currentTarget.checked))}
    />
    <span class="text-sm text-slate-700">{getBool(entry) ? 'true' : 'false'}</span>
  </label>
{:else if entry.type === DataType.Int}
  <input
    type="number"
    class={numClass}
    value={getInt(entry)}
    step="1"
    onchange={(e) => {
      const v = Number(e.currentTarget.value);
      if (Number.isFinite(v)) commit(() => setInt(entry, Math.trunc(v)));
    }}
  />
{:else if entry.type === DataType.UInt}
  <input
    type="number"
    class={numClass}
    value={getUInt(entry)}
    min="0"
    step="1"
    onchange={(e) => {
      const v = Number(e.currentTarget.value);
      if (Number.isFinite(v) && v >= 0) commit(() => setUInt(entry, Math.trunc(v)));
    }}
  />
{:else if entry.type === DataType.Float}
  <input
    type="text"
    inputmode="decimal"
    class={numClass}
    value={String(getFloat(entry))}
    onchange={(e) => {
      const v = Number(e.currentTarget.value);
      if (Number.isFinite(v)) commit(() => setFloat(entry, v));
    }}
  />
{:else if entry.type === DataType.Enum}
  {@const raw = getEnum(entry)}
  {@const options = enumOptionsFor(entry.hash)}
  {#if options && options.length > 0}
    {@const matched = options.some((o) => o.hash === raw)}
    <select
      class={enumSelectClass}
      onchange={(e) => {
        const n = Number.parseInt(e.currentTarget.value, 10);
        if (Number.isFinite(n)) commit(() => setEnum(entry, n));
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
    {@const optionName = enumOptionName(raw)}
    <div class="flex flex-col gap-1">
      <input
        type="text"
        class={enumHexClass}
        value={hexU32(raw)}
        onchange={(e) => {
          const n = parseMaybeHex(e.currentTarget.value);
          if (n == null) error = 'Enter a decimal or 0x-prefixed hex value';
          else commit(() => setEnum(entry, n));
        }}
      />
      {#if optionName}
        <span class="text-xs text-slate-500">= {optionName}</span>
      {/if}
    </div>
  {/if}
{:else if entry.type === DataType.Int64}
  <input
    type="text"
    inputmode="numeric"
    class={longNumClass}
    value={getInt64(entry).toString()}
    onchange={(e) => {
      try {
        const n = BigInt(e.currentTarget.value.trim());
        commit(() => setInt64(entry, n));
      } catch {
        error = 'Enter a valid integer';
      }
    }}
  />
{:else if entry.type === DataType.UInt64}
  <input
    type="text"
    inputmode="numeric"
    class={longNumClass}
    value={getUInt64(entry).toString()}
    onchange={(e) => {
      try {
        const n = BigInt(e.currentTarget.value.trim());
        if (n < 0n) throw new Error('negative');
        commit(() => setUInt64(entry, n));
      } catch {
        error = 'Enter a non-negative integer';
      }
    }}
  />
{:else if entry.type === DataType.Vector2}
  {@const v = getVector2(entry)}
  <div class="flex gap-2">
    <input
      type="text"
      inputmode="decimal"
      class={vecClass}
      value={String(v.x)}
      onchange={(e) => {
        const n = Number(e.currentTarget.value);
        if (Number.isFinite(n)) commit(() => setVector2(entry, { ...getVector2(entry), x: n }));
      }}
    />
    <input
      type="text"
      inputmode="decimal"
      class={vecClass}
      value={String(v.y)}
      onchange={(e) => {
        const n = Number(e.currentTarget.value);
        if (Number.isFinite(n)) commit(() => setVector2(entry, { ...getVector2(entry), y: n }));
      }}
    />
  </div>
{:else if entry.type === DataType.Vector3}
  {@const v = getVector3(entry)}
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
            commit(() => setVector3(entry, { ...getVector3(entry), [axis]: n }));
        }}
      />
    {/each}
  </div>
{:else if isEditable(entry)}
  <input
    type="text"
    class={stringClass}
    value={getString(entry)}
    onchange={(e) => {
      const s = e.currentTarget.value;
      try {
        stringEncodedSize(entry.type, s);
        commit(() => setString(entry, s));
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }}
  />
{:else if isInline(entry.type)}
  <span class="font-mono text-xs text-slate-600">{hexU32(entry.inlineRaw ?? 0)}</span>
{:else}
  <span class="font-mono text-xs text-slate-500">{heapPreview(entry)}</span>
{/if}

{#if error}
  <p class="mt-1 text-xs text-red-600">{error}</p>
{/if}

<span class="sr-only">{DataTypeName[entry.type]}</span>
