<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { mapState } from '$lib/map/state/mapEditor.svelte';
  import { showToast } from '$lib/toast/toast.svelte';
  import { applyMapShare } from './apply';
  import { decodeMapShareFile, MAP_SHARE_EXT, type DecodedShare } from './codec';

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let busy = $state(false);
  let file = $state<File | null>(null);
  let parsed = $state<DecodedShare | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      file = null;
      parsed = null;
      error = null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function onBackdrop(e: MouseEvent): void {
    if (e.target === dialog) onClose();
  }

  async function onFileChange(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const f = target.files?.[0] ?? null;
    file = f;
    parsed = null;
    error = null;
    if (!f) return;
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      parsed = await decodeMapShareFile(bytes);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  async function onApply(): Promise<void> {
    if (busy || !parsed) return;
    busy = true;
    try {
      const result = applyMapShare(parsed);
      showToast(
        'success',
        $_('map.share.applied', {
          values: {
            tiles: result.tilesChanged,
            placed: result.objectsPlaced,
            cleared: result.objectsCleared,
          },
        }),
      );
      if (result.objectsTruncated > 0) {
        showToast(
          'warn',
          $_('map.share.truncated', { values: { count: result.objectsTruncated } }),
        );
      }
      onClose();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  onclose={onClose}
  onclick={onBackdrop}
  class="m-auto w-[min(480px,92vw)] rounded-2xl bg-surface p-0 ring-1 ring-edge/60 shadow-2xl backdrop:bg-black/40"
>
  <div class="flex items-center justify-between border-b border-edge/40 px-5 py-3">
    <h2 class="text-sm font-bold text-content-strong">{$_('map.share.import_title')}</h2>
    <button
      type="button"
      onclick={onClose}
      aria-label={$_('map.common.cancel')}
      class="grid h-7 w-7 place-items-center rounded-full text-base text-content hover:bg-surface-muted"
    >
      ✕
    </button>
  </div>

  <div class="flex flex-col gap-4 p-5">
    <p class="text-xs text-content-muted leading-relaxed">
      {$_('map.share.import_intro')}
    </p>

    <section>
      <label class="block">
        <span class="mb-2 block text-[10px] font-bold uppercase tracking-wide text-content-muted">
          {$_('map.share.file_label')}
        </span>
        <input
          type="file"
          accept={MAP_SHARE_EXT}
          class="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white hover:file:bg-orange-600"
          onchange={onFileChange}
        />
      </label>
      {#if file}
        <p class="mt-1.5 truncate font-mono text-xs text-content-muted">{file.name}</p>
      {/if}
    </section>

    {#if error}
      <p class="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/30">
        {error}
      </p>
    {/if}

    {#if parsed}
      <section class="rounded-lg bg-surface-sunken p-3 ring-1 ring-edge/40">
        <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wide text-content-muted">
          {$_('map.share.preview')}
        </h3>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt class="text-content-muted">{$_('map.share.preview_tiles')}</dt>
          <dd class="text-content tabular-nums">{parsed.tiles.length}</dd>
          <dt class="text-content-muted">{$_('map.share.preview_objects')}</dt>
          <dd class="text-content tabular-nums">
            {parsed.objects ? parsed.objects.length : $_('map.share.preview_no_objects')}
          </dd>
          {#if parsed.doc.meta.appVersion}
            <dt class="text-content-muted">{$_('map.share.preview_app_version')}</dt>
            <dd class="font-mono text-content">{parsed.doc.meta.appVersion}</dd>
          {/if}
        </dl>
      </section>

      <p class="text-[11px] text-amber-400">{$_('map.share.import_warning')}</p>
    {/if}
  </div>

  <div class="flex items-center justify-end gap-2 border-t border-edge/40 px-5 py-3">
    <button
      type="button"
      class="rounded-full px-3 py-1.5 text-sm font-bold ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
      onclick={onClose}
      disabled={busy}
    >
      {$_('map.common.cancel')}
    </button>
    <button
      type="button"
      class="rounded-full px-3 py-1.5 text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
      onclick={onApply}
      disabled={busy || !mapState.ready || !parsed}
    >
      {busy ? $_('map.share.importing') : $_('map.share.confirm_import')}
    </button>
  </div>
</dialog>
