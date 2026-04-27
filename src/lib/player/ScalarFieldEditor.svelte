<script lang="ts">
  import { hexU32, parseMaybeHex } from '../sav/format';
  import { enumOptionName, enumOptionsFor } from '../sav/knownKeys';
  import EnumSelect from './EnumSelect.svelte';
  import { fieldWriteError, type ScalarAccess, type ScalarSizing } from './scalarFieldAccess';

  type Props = {
    access: ScalarAccess;
    enumHash: number;
    showUIntEnumHint?: boolean;
    sizing: ScalarSizing;
    onCommit: () => void;
  };
  let { access, enumHash, showUIntEnumHint = false, sizing, onCommit }: Props = $props();

  let error = $state<string | null>(null);

  function commit(fn: () => void): void {
    error = fieldWriteError(fn);
    if (error == null) onCommit();
  }
</script>

{#if access.kind === 'bool'}
  {@const a = access}
  <input
    type="checkbox"
    class="h-4 w-4 rounded border-edge/60 text-orange-500 focus:ring-orange-500/30"
    checked={a.read()}
    onchange={(e) => commit(() => a.write(e.currentTarget.checked))}
  />
  <span class="ml-2 text-sm text-content">{a.read() ? 'true' : 'false'}</span>
{:else if access.kind === 'int'}
  {@const a = access}
  <input
    type="number"
    class={sizing.numClass}
    value={a.read()}
    step="1"
    onchange={(e) => {
      const v = Number(e.currentTarget.value);
      if (Number.isFinite(v)) commit(() => a.write(Math.trunc(v)));
    }}
  />
{:else if access.kind === 'uint'}
  {@const a = access}
  {@const raw = a.read()}
  {@const optName = showUIntEnumHint ? enumOptionName(raw) : null}
  <div class="flex flex-col gap-0.5">
    <input
      type="number"
      class={sizing.numClass}
      value={raw}
      min="0"
      step="1"
      onchange={(e) => {
        const v = Number(e.currentTarget.value);
        if (Number.isFinite(v) && v >= 0) commit(() => a.write(Math.trunc(v)));
      }}
    />
    {#if optName}
      <span class="text-[11px] text-content-faint">≈ {optName}</span>
    {/if}
  </div>
{:else if access.kind === 'float'}
  {@const a = access}
  <input
    type="text"
    inputmode="decimal"
    class={sizing.numClass}
    value={String(a.read())}
    onchange={(e) => {
      const v = Number(e.currentTarget.value);
      if (Number.isFinite(v)) commit(() => a.write(v));
    }}
  />
{:else if access.kind === 'enum'}
  {@const a = access}
  {@const raw = a.read()}
  {@const options = enumOptionsFor(enumHash)}
  {#if options && options.length > 0}
    <EnumSelect
      value={raw}
      {options}
      onChange={(n) => commit(() => a.write(n))}
      selectClass={sizing.enumSelectClass}
    />
  {:else}
    {@const optName = enumOptionName(raw)}
    <div class="flex flex-col gap-0.5">
      <input
        type="text"
        class={sizing.enumHexClass}
        value={hexU32(raw)}
        onchange={(e) => {
          const n = parseMaybeHex(e.currentTarget.value);
          if (n == null) error = 'Enter a decimal or 0x-prefixed hex value';
          else commit(() => a.write(n));
        }}
      />
      {#if optName}
        <span class="text-[11px] text-content-faint">= {optName}</span>
      {/if}
    </div>
  {/if}
{:else if access.kind === 'int64'}
  {@const a = access}
  <input
    type="text"
    inputmode="numeric"
    class={sizing.longNumClass}
    value={a.read().toString()}
    onchange={(e) => {
      try {
        const n = BigInt(e.currentTarget.value.trim());
        commit(() => a.write(n));
      } catch {
        error = 'Enter a valid integer';
      }
    }}
  />
{:else if access.kind === 'uint64'}
  {@const a = access}
  <input
    type="text"
    inputmode="numeric"
    class={sizing.longNumClass}
    value={a.read().toString()}
    onchange={(e) => {
      try {
        const n = BigInt(e.currentTarget.value.trim());
        if (n < 0n) throw new Error('negative');
        commit(() => a.write(n));
      } catch {
        error = 'Enter a non-negative integer';
      }
    }}
  />
{:else if access.kind === 'vector2'}
  {@const a = access}
  {@const v = a.read()}
  <div class="flex gap-2">
    <input
      type="text"
      inputmode="decimal"
      class={sizing.vecClass}
      value={String(v.x)}
      onchange={(e) => {
        const n = Number(e.currentTarget.value);
        if (Number.isFinite(n)) commit(() => a.write({ ...a.read(), x: n }));
      }}
    />
    <input
      type="text"
      inputmode="decimal"
      class={sizing.vecClass}
      value={String(v.y)}
      onchange={(e) => {
        const n = Number(e.currentTarget.value);
        if (Number.isFinite(n)) commit(() => a.write({ ...a.read(), y: n }));
      }}
    />
  </div>
{:else if access.kind === 'vector3'}
  {@const a = access}
  {@const v = a.read()}
  <div class="flex gap-2">
    {#each ['x', 'y', 'z'] as axis (axis)}
      <input
        type="text"
        inputmode="decimal"
        class={sizing.vecClass}
        value={String(v[axis as 'x' | 'y' | 'z'])}
        onchange={(e) => {
          const n = Number(e.currentTarget.value);
          if (Number.isFinite(n)) commit(() => a.write({ ...a.read(), [axis]: n }));
        }}
      />
    {/each}
  </div>
{:else if access.kind === 'string'}
  {@const a = access}
  <input
    type="text"
    class={sizing.stringClass}
    value={a.read()}
    onchange={(e) => {
      const s = e.currentTarget.value;
      try {
        a.validate(s);
        commit(() => a.write(s));
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }}
  />
{/if}

{#if error}
  <p class="mt-1 text-xs text-danger">{error}</p>
{/if}
