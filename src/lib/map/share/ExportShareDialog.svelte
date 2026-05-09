<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { CHANGELOG } from '$lib/changelog/changelog';
  import { floorTiles, mapState } from '$lib/map/state/mapEditor.svelte';
  import { liveRows } from '$lib/map/state/mapObjectsEditor.svelte';
  import { downloadBlob } from '$lib/sav/download';
  import { showToast } from '$lib/toast/toast.svelte';
  import { defaultMapShareFilename, encodeMapShareFile, MAP_SHARE_EXT } from './codec';

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let busy = $state(false);
  let includeObjects = $state(true);
  let filename = $state('');

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      filename = defaultMapShareFilename();
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function onBackdrop(e: MouseEvent): void {
    if (e.target === dialog) onClose();
  }

  function ensureExt(n: string): string {
    return n.toLowerCase().endsWith(MAP_SHARE_EXT) ? n : `${n}${MAP_SHARE_EXT}`;
  }

  async function onExport(): Promise<void> {
    if (busy) return;
    const tiles = floorTiles();
    if (!tiles) {
      showToast('error', 'Map not loaded');
      return;
    }
    busy = true;
    try {
      const bytes = await encodeMapShareFile({
        tiles,
        objects: includeObjects ? liveRows() : null,
        appVersion: CHANGELOG[0]?.version ?? '0.0.0',
      });
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const name =
        filename.trim().length > 0 ? ensureExt(filename.trim()) : defaultMapShareFilename();
      downloadBlob(new Blob([buffer], { type: 'application/octet-stream' }), name);
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
  class="m-auto w-[min(440px,92vw)] rounded-2xl bg-surface p-0 ring-1 ring-edge/60 shadow-2xl backdrop:bg-black/40"
>
  <div class="flex items-center justify-between border-b border-edge/40 px-5 py-3">
    <h2 class="text-sm font-bold text-content-strong">{$_('map.share.export_title')}</h2>
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
      {$_('map.share.export_intro')}
    </p>

    <label class="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={includeObjects}
        class="mt-0.5 h-4 w-4 accent-orange-500"
        onchange={(e) => (includeObjects = e.currentTarget.checked)}
      />
      <span class="flex flex-col">
        <span class="text-sm font-medium text-content">{$_('map.share.include_objects')}</span>
        <span class="text-[11px] text-content-muted">{$_('map.share.include_objects_hint')}</span>
      </span>
    </label>

    <section>
      <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {$_('map.share.filename')}
      </h3>
      <input
        type="text"
        bind:value={filename}
        spellcheck="false"
        class="w-full rounded-md bg-surface-sunken px-2.5 py-1.5 text-sm font-mono text-content ring-1 ring-edge/60 outline-none focus:ring-orange-500"
      />
    </section>
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
      onclick={onExport}
      disabled={busy || !mapState.ready}
    >
      {busy ? $_('map.share.exporting') : $_('map.share.confirm_export')}
    </button>
  </div>
</dialog>
