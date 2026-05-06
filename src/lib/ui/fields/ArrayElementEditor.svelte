<script lang="ts">
  import { binaryArrayElements } from '$lib/sav/codec';
  import { DataType } from '$lib/sav/dataType';
  import type { Entry } from '$lib/sav/types';
  import ScalarFieldEditor from './ScalarFieldEditor.svelte';
  import { arrayElementScalarAccess, SCALAR_SIZING_PRESETS } from './scalarFieldAccess';

  type Props = {
    entry: Entry;
    index: number;
    onCommit: (e: Entry) => void;
  };
  let { entry, index, onCommit }: Props = $props();

  let tick = $state(0);

  const access = $derived(arrayElementScalarAccess(entry, index));

  function commit(): void {
    onCommit(entry);
    tick++;
  }
</script>

{#key tick}
  {#if access}
    <ScalarFieldEditor
      {access}
      enumHash={entry.hash}
      showUIntEnumHint={entry.type === DataType.UIntArray}
      sizing={SCALAR_SIZING_PRESETS.array}
      onCommit={commit}
    />
  {:else if entry.type === DataType.BinaryArray}
    {@const el = binaryArrayElements(entry)[index]}
    <span class="font-mono text-xs text-content-faint">
      {el ? `${el.size} bytes` : 'n/a'}
    </span>
  {:else}
    <span class="text-xs text-content-faint">n/a</span>
  {/if}
{/key}
