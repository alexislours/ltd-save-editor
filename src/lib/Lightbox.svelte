<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { closeLightbox, lightbox } from './lightboxState.svelte';

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (lightbox.src && !dialog.open) dialog.showModal();
    else if (!lightbox.src && dialog.open) dialog.close();
  });

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === dialog) closeLightbox();
  }
</script>

<dialog
  bind:this={dialog}
  onclose={closeLightbox}
  onclick={handleBackdropClick}
  class="lightbox m-auto rounded-3xl bg-transparent p-0 shadow-none"
>
  {#if lightbox.src}
    <div
      class="lightbox-card relative overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-edge/60"
    >
      <div
        class="flex items-center justify-center bg-gradient-to-br from-surface-muted to-surface-sunken/70 p-8 sm:p-10"
      >
        <img
          src={lightbox.src}
          alt={lightbox.alt}
          class="block h-auto w-auto max-w-[80vw] sm:max-h-[60vh] sm:max-w-[60vh]"
          style="image-rendering: -webkit-optimize-contrast;"
        />
      </div>
      {#if lightbox.alt}
        <div class="border-t border-edge/40 bg-surface-muted/60 px-5 py-3 text-center">
          <p class="truncate text-sm font-bold text-content-strong">{lightbox.alt}</p>
        </div>
      {/if}
      <button
        type="button"
        onclick={closeLightbox}
        aria-label={$_('lightbox.close')}
        class="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-base font-bold text-content shadow-md ring-1 ring-edge/60 backdrop-blur-sm transition-all hover:scale-105 hover:bg-surface hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        ✕
      </button>
    </div>
  {/if}
</dialog>

<style>
  .lightbox {
    border: none;
    outline: none;
  }

  .lightbox::backdrop {
    background-color: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .lightbox[open] .lightbox-card {
    animation: lightbox-pop 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .lightbox[open]::backdrop {
    animation: lightbox-fade 180ms ease-out;
  }

  @keyframes lightbox-pop {
    from {
      opacity: 0;
      transform: scale(0.92) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes lightbox-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lightbox[open] .lightbox-card,
    .lightbox[open]::backdrop {
      animation: none;
    }
  }
</style>
