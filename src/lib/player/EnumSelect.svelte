<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { hexU32 } from '../sav/format';
  import type { EnumOption } from '../sav/knownKeys';

  type Props = {
    value: number;
    options: readonly EnumOption[];
    onChange: (value: number) => void;
    selectClass: string;
    labelFor?: (opt: EnumOption) => string;
    i18nPrefix?: string;
  };

  let { value, options, onChange, selectClass, labelFor, i18nPrefix }: Props = $props();

  const normalized = $derived(value >>> 0);
  const matched = $derived(options.some((o) => o.hash >>> 0 === normalized));

  function defaultLabel(opt: EnumOption): string {
    if (i18nPrefix) return $_(`${i18nPrefix}.${opt.name}`);
    return opt.label ?? opt.name;
  }
</script>

<select
  class={selectClass}
  value={normalized}
  onchange={(e) => {
    const n = Number.parseInt(e.currentTarget.value, 10);
    if (Number.isFinite(n)) onChange(n);
  }}
>
  {#each options as opt (opt.hash)}
    <option value={opt.hash >>> 0}>{(labelFor ?? defaultLabel)(opt)}</option>
  {/each}
  {#if !matched}
    <option value={normalized}>{hexU32(normalized)}</option>
  {/if}
</select>
