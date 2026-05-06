<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { showToast } from '$lib/toast/toast.svelte';
  import { isSupportedImage } from './textureReplaceState.svelte';

  type Props = {
    currentPreview: string | null;
    newPreview: string | null;
    newPreviewElapsedMs?: number | null;
    sidecarMissing: boolean;
    dropTutorialId?: string;
    onPick: () => void;
    onDropFile: (file: File) => void;
  };

  let {
    currentPreview,
    newPreview,
    newPreviewElapsedMs = null,
    sidecarMissing,
    dropTutorialId,
    onPick,
    onDropFile,
  }: Props = $props();

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!isSupportedImage(file)) {
      showToast('warn', $_('ugc_editor.toast.unsupported_image'));
      return;
    }
    onDropFile(file);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
  }
</script>

<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
  <figure class="flex flex-col">
    <figcaption class="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-content-muted">
      {$_('ugc_editor.editor.current')}
    </figcaption>
    {#if currentPreview}
      <img
        src={currentPreview}
        alt={$_('ugc_editor.editor.current')}
        class="aspect-square w-full rounded-lg bg-checker object-contain ring-1 ring-edge/40"
      />
    {:else}
      <div
        class="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-sunken text-center text-xs text-content-muted ring-1 ring-edge/40"
      >
        {sidecarMissing
          ? $_('ugc_editor.editor.needs_sidecar')
          : $_('ugc_editor.editor.no_current')}
      </div>
    {/if}
  </figure>

  <div aria-hidden="true" class="text-2xl font-bold text-content-muted">→</div>

  <figure class="flex flex-col">
    <figcaption class="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-content-muted">
      {$_('ugc_editor.editor.new')}
    </figcaption>
    <button
      type="button"
      data-tutorial={dropTutorialId}
      ondrop={onDrop}
      ondragover={onDragOver}
      onclick={onPick}
      class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-surface-sunken ring-1 ring-edge/40 transition-colors hover:ring-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
    >
      {#if newPreview}
        <img
          src={newPreview}
          alt={$_('ugc_editor.editor.new')}
          class="h-full w-full bg-checker object-contain"
        />
      {:else}
        <span
          class="flex h-full w-full items-center justify-center px-3 text-center text-xs text-content-muted"
        >
          {$_('ugc_editor.editor.drop_png')}
        </span>
      {/if}
    </button>
    {#if newPreview && newPreviewElapsedMs != null}
      <figcaption class="mt-1 text-center text-[11px] text-content-muted tabular-nums">
        {$_('ugc_editor.editor.preview_elapsed', {
          values: { ms: newPreviewElapsedMs.toFixed(2) },
        })}
      </figcaption>
    {/if}
  </figure>
</div>
