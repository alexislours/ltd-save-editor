<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { openLightbox } from '../lightboxState.svelte';

  type Size = 'sm' | 'md';

  type Props = {
    imageUrl: string | null;
    label: string;
    size?: Size;
  };

  let { imageUrl, label, size = 'md' }: Props = $props();

  const boxClass = $derived(size === 'sm' ? 'h-10 w-10' : 'h-14 w-14');
</script>

{#if imageUrl}
  <button
    type="button"
    onclick={() => openLightbox(imageUrl, label)}
    aria-label={$_('lightbox.open', { values: { label } })}
    class="{boxClass} flex shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-edge/40 bg-surface transition-colors hover:border-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
  >
    <img
      src={imageUrl}
      alt={label}
      loading="lazy"
      decoding="async"
      class="h-full w-full object-contain p-1"
    />
  </button>
{:else}
  <div
    class="{boxClass} flex shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
  >
    <span class="text-[10px] text-content-faint">·</span>
  </div>
{/if}
