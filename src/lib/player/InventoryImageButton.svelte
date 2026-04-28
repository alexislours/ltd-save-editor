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
    class="group {boxClass} flex shrink-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-edge/40 bg-surface transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/20 active:translate-y-0 active:scale-95 active:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
  >
    <img
      src={imageUrl}
      alt={label}
      loading="lazy"
      decoding="async"
      class="h-full w-full object-contain p-1 transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-100"
    />
  </button>
{:else}
  <div
    class="{boxClass} flex shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface"
  >
    <span class="text-[10px] text-content-faint">·</span>
  </div>
{/if}
