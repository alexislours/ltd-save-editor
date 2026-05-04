<script lang="ts">
  import { DataType, isInline } from '$lib/sav/dataType';
  import { hexU32 } from '$lib/sav/format';
  import type { Entry } from '$lib/sav/types';
  import ScalarFieldEditor from './ScalarFieldEditor.svelte';
  import { entryScalarAccess, SCALAR_SIZING_PRESETS } from './scalarFieldAccess';

  type Props = { entry: Entry; onCommit: (e: Entry) => void };
  let { entry, onCommit }: Props = $props();

  const access = $derived(entryScalarAccess(entry));

  function heapPreview(e: Entry): string {
    if (!e.payload) return '(null)';
    const size = e.payload.byteLength;
    if (size === 0) return '(empty)';
    const head = Array.from(e.payload.slice(0, Math.min(24, size)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    return `[${size} bytes] ${head}${size > 24 ? ' …' : ''}`;
  }
</script>

{#if access}
  <ScalarFieldEditor
    {access}
    enumHash={entry.hash}
    sizing={SCALAR_SIZING_PRESETS.entry}
    onCommit={() => onCommit(entry)}
  />
{:else if isInline(entry.type)}
  <span class="font-mono text-xs text-content-muted">{hexU32(entry.inlineRaw ?? 0)}</span>
{:else}
  <span class="font-mono text-xs text-content-faint">{heapPreview(entry)}</span>
{/if}

<span class="sr-only">{DataType[entry.type]}</span>
