<script lang="ts">
  import { DataTypeName, isInline } from '../sav/dataType';
  import { hexU32 } from '../sav/format';
  import type { Entry } from '../sav/types';
  import { markDirty as playerMarkDirty } from '../playerEditor.svelte';
  import ScalarFieldEditor from './ScalarFieldEditor.svelte';
  import { entryScalarAccess, SCALAR_SIZING_PRESETS } from './scalarFieldAccess';

  type Props = { entry: Entry; markDirty?: (e: Entry) => void };
  let { entry, markDirty = playerMarkDirty }: Props = $props();

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
    onCommit={() => markDirty(entry)}
  />
{:else if isInline(entry.type)}
  <span class="font-mono text-xs text-content-muted">{hexU32(entry.inlineRaw ?? 0)}</span>
{:else}
  <span class="font-mono text-xs text-content-faint">{heapPreview(entry)}</span>
{/if}

<span class="sr-only">{DataTypeName[entry.type]}</span>
