<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { fade, slide } from 'svelte/transition';
  import InventoryImageButton from './InventoryImageButton.svelte';
  import InventoryQtyStepper from './InventoryQtyStepper.svelte';
  import InventoryRowBody from './InventoryRowBody.svelte';
  import InventoryStateSelect from './InventoryStateSelect.svelte';

  export type SubItem = {
    key: string | number;
    imageUrl: string | null;
    imageLabel: string;
    label: string;
    internalName?: string;
  };

  type Props = {
    imageUrl: string | null;
    label: string;
    caption: string;
    primaryState: number;
    primaryQty: number;
    subItems: SubItem[];
    readSubState: (index: number) => number;
    readSubQty: (index: number) => number;
    writeStateAll: (value: number) => void;
    writeQtyAll: (value: number) => void;
    writeSubState: (index: number, value: number) => void;
    writeSubQty: (index: number, value: number) => void;
    expandLabel: string;
    collapseLabel: string;
  };

  let {
    imageUrl,
    label,
    caption,
    primaryState,
    primaryQty,
    subItems,
    readSubState,
    readSubQty,
    writeStateAll,
    writeQtyAll,
    writeSubState,
    writeSubQty,
    expandLabel,
    collapseLabel,
  }: Props = $props();

  let expanded = $state(false);
  const canExpand = $derived(subItems.length > 1);
</script>

<li class="expandable-row">
  <InventoryRowBody
    {imageUrl}
    {label}
    {caption}
    state={primaryState}
    qty={primaryQty}
    onStateChange={writeStateAll}
    onQtyChange={writeQtyAll}
  >
    {#snippet leading()}
      <button
        type="button"
        aria-label={expanded ? collapseLabel : expandLabel}
        aria-expanded={expanded}
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm font-bold text-content-muted transition-colors duration-150 hover:bg-surface-sunken/40 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
        disabled={!canExpand}
        onclick={() => (expanded = !expanded)}
      >
        <span
          class:rotate-90={expanded}
          class="inline-block transition-transform duration-200 ease-out"
        >
          ▶
        </span>
      </button>
    {/snippet}
  </InventoryRowBody>

  {#if expanded && canExpand}
    <ul
      class="overflow-hidden border-t border-edge/40 bg-surface-sunken/30 px-3 py-2"
      transition:slide={{ duration: 220, easing: cubicOut }}
    >
      {#each subItems as sub, i (sub.key)}
        <li
          class="sub-row items-center gap-x-3 gap-y-2 py-1.5 pl-3 sm:pl-9"
          in:fade={{ duration: 180, delay: 60 + i * 25 }}
        >
          <div class="flex min-w-0 items-center gap-3">
            <InventoryImageButton imageUrl={sub.imageUrl} label={sub.imageLabel} size="sm" />
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold text-content">{sub.label}</div>
              {#if sub.internalName}
                <div class="truncate font-mono text-[10px] text-content-faint">
                  {sub.internalName}
                </div>
              {/if}
            </div>
          </div>
          <div class="sub-row-controls flex items-center justify-end gap-2">
            <InventoryStateSelect value={readSubState(i)} onChange={(v) => writeSubState(i, v)} />
            <InventoryQtyStepper
              value={readSubQty(i)}
              onChange={(v) => writeSubQty(i, v)}
              size="sm"
            />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</li>

<style>
  .expandable-row {
    content-visibility: auto;
    contain-intrinsic-size: 72px auto;
  }
  .sub-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
  .sub-row-controls {
    grid-column: 1;
  }
  @container (min-width: 30rem) {
    .sub-row {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .sub-row-controls {
      grid-column: 2;
    }
  }
</style>
