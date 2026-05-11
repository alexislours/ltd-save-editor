<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { _ } from 'virtual:i18n/advanced';
  import { binaryArrayElements } from '$lib/sav/codec';
  import { DataType, isInline } from '$lib/sav/dataType';
  import { hexU32 } from '$lib/sav/format';
  import type { Entry } from '$lib/sav/types';
  import { PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import HexViewer from './HexViewer.svelte';
  import ScalarFieldEditor from './ScalarFieldEditor.svelte';
  import { entryScalarAccess, SCALAR_SIZING_PRESETS } from './scalarFieldAccess';

  type Props = { entry: Entry; onCommit: (e: Entry) => void };
  let { entry, onCommit }: Props = $props();

  const access = $derived(entryScalarAccess(entry));

  const binaryBytes = $derived.by(() => {
    if (entry.type !== DataType.Binary) return null;
    return entry.payload ? entry.payload.subarray(4) : new Uint8Array(0);
  });

  const binaryArrayItems = $derived.by(() => {
    if (entry.type !== DataType.BinaryArray) return null;
    return binaryArrayElements(entry);
  });

  const otherHeapBytes = $derived.by(() => {
    if (access) return null;
    if (isInline(entry.type)) return null;
    if (entry.type === DataType.Binary || entry.type === DataType.BinaryArray) return null;
    return entry.payload ?? null;
  });

  let open = $state(false);
  const openItems = new SvelteSet<number>();

  $effect(() => {
    void entry;
    open = false;
    openItems.clear();
  });

  function toggleItem(i: number): void {
    if (openItems.has(i)) openItems.delete(i);
    else openItems.add(i);
  }

  function hashName(): string {
    return hexU32(entry.hash);
  }

  function commit(): void {
    onCommit(entry);
  }

  const buttonClass = `${PILL_BUTTON_CLASS} text-xs`;
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
{:else if binaryBytes}
  <div class="w-full" data-binary data-open={open ? '' : undefined}>
    <button type="button" class={buttonClass} aria-expanded={open} onclick={() => (open = !open)}>
      {open
        ? $_('advanced.hex_hide_action', { values: { bytes: binaryBytes.byteLength } })
        : $_('advanced.hex_view_action', { values: { bytes: binaryBytes.byteLength } })}
    </button>
    {#if open}
      <div class="mt-2 w-full">
        <HexViewer
          bytes={binaryBytes}
          editable
          downloadName={`${hashName()}.bin`}
          onByteChange={commit}
        />
      </div>
    {/if}
  </div>
{:else if binaryArrayItems}
  {@const items = binaryArrayItems}
  <div class="w-full" data-binary data-open={open ? '' : undefined}>
    <button type="button" class={buttonClass} aria-expanded={open} onclick={() => (open = !open)}>
      {open
        ? $_('advanced.hex_hide_blocks_action', { values: { count: items.length } })
        : $_('advanced.hex_view_blocks_action', { values: { count: items.length } })}
    </button>
    {#if open}
      <div class="mt-2 w-full space-y-2">
        {#if items.length === 0}
          <p class="text-xs text-content-muted">{$_('advanced.detail_empty_array')}</p>
        {:else}
          {#each items as item, i (i)}
            <div class="rounded-lg ring-1 ring-edge/40">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-xs text-content hover:bg-surface-muted"
                aria-expanded={openItems.has(i)}
                onclick={() => toggleItem(i)}
              >
                <span class="text-content-muted">
                  {$_('advanced.hex_array_item_label', {
                    values: { index: i, bytes: item.size },
                  })}
                </span>
                <span class="text-content-faint">
                  {openItems.has(i)
                    ? $_('advanced.hex_hide_action', { values: { bytes: item.size } })
                    : $_('advanced.hex_view_action', { values: { bytes: item.size } })}
                </span>
              </button>
              {#if openItems.has(i)}
                <div class="px-3 pb-3">
                  <HexViewer
                    bytes={item.bytes}
                    editable
                    downloadName={`${hashName()}-${i}.bin`}
                    onByteChange={commit}
                  />
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{:else if otherHeapBytes}
  <div class="w-full" data-binary data-open={open ? '' : undefined}>
    <button type="button" class={buttonClass} aria-expanded={open} onclick={() => (open = !open)}>
      {open
        ? $_('advanced.hex_hide_action', { values: { bytes: otherHeapBytes.byteLength } })
        : $_('advanced.hex_view_action', { values: { bytes: otherHeapBytes.byteLength } })}
    </button>
    {#if open}
      <div class="mt-2 w-full">
        <HexViewer bytes={otherHeapBytes} downloadName={`${hashName()}.bin`} />
      </div>
    {/if}
  </div>
{:else}
  <span class="font-mono text-xs text-content-faint">{$_('advanced.hex_no_payload')}</span>
{/if}

<span class="sr-only">{DataType[entry.type]}</span>
