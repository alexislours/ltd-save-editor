<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { mapState } from '$lib/map/state/mapEditor.svelte';
  import { downloadBlob } from '$lib/sav/download';
  import { showToast } from '$lib/toast/toast.svelte';
  import {
    defaultExportFilename,
    exportPng,
    type ExportBackground,
    type ExportPngLayers,
  } from './exportPng';

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let busy = $state(false);

  let scale = $state<1 | 2 | 4 | 8>(2);
  let background = $state<ExportBackground>('dark');
  let filename = $state('');
  let lyrs = $state<ExportPngLayers>({
    floor: true,
    objects: true,
    fence: true,
    ugc: false,
    diff: false,
    grid: false,
  });

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      filename = defaultExportFilename();
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function onBackdrop(e: MouseEvent): void {
    if (e.target === dialog) onClose();
  }

  const dimensions = $derived.by(() => {
    const w = 480 * scale;
    const h = 320 * scale;
    return `${w} × ${h}`;
  });

  async function onExport(): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      const blob = await exportPng({ scale, background, layers: lyrs });
      const name =
        filename.trim().length > 0 ? ensurePng(filename.trim()) : defaultExportFilename();
      downloadBlob(blob, name);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast('error', msg);
    } finally {
      busy = false;
    }
  }

  function ensurePng(n: string): string {
    return /\.png$/i.test(n) ? n : `${n}.png`;
  }

  const SCALES: { v: 1 | 2 | 4 | 8; key: string }[] = [
    { v: 1, key: 'map.export.scale_1x' },
    { v: 2, key: 'map.export.scale_2x' },
    { v: 4, key: 'map.export.scale_4x' },
    { v: 8, key: 'map.export.scale_8x' },
  ];

  const BG_OPTIONS: { v: ExportBackground; key: string }[] = [
    { v: 'dark', key: 'map.export.bg_dark' },
    { v: 'light', key: 'map.export.bg_light' },
    { v: 'transparent', key: 'map.export.bg_transparent' },
  ];

  const LAYER_KEYS: { id: keyof ExportPngLayers; label: string }[] = [
    { id: 'floor', label: 'map.toolbar.layer_floor' },
    { id: 'objects', label: 'map.toolbar.layer_objects' },
    { id: 'fence', label: 'map.toolbar.layer_fence' },
    { id: 'ugc', label: 'map.toolbar.layer_ugc' },
    { id: 'diff', label: 'map.toolbar.layer_diff' },
    { id: 'grid', label: 'map.toolbar.layer_grid' },
  ];
</script>

<dialog
  bind:this={dialog}
  onclose={onClose}
  onclick={onBackdrop}
  class="m-auto w-[min(480px,92vw)] max-w-md rounded-2xl bg-surface p-0 ring-1 ring-edge/60 shadow-2xl backdrop:bg-black/40"
>
  <div class="flex items-center justify-between border-b border-edge/40 px-5 py-3">
    <h2 class="text-sm font-bold text-content-strong">{$_('map.export.title')}</h2>
    <button
      type="button"
      onclick={onClose}
      aria-label="Close"
      class="grid h-7 w-7 place-items-center rounded-full text-base text-content hover:bg-surface-muted"
    >
      ✕
    </button>
  </div>

  <div class="flex flex-col gap-4 p-5">
    <section>
      <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {$_('map.export.resolution')}
      </h3>
      <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
        {#each SCALES as s, i (s.v)}
          <button
            type="button"
            class={[
              'min-w-16 px-3 py-1.5 text-sm font-bold transition-colors',
              i > 0 && 'border-l border-edge/60',
              scale === s.v ? 'bg-orange-500 text-white' : 'bg-surface text-content',
            ]}
            aria-pressed={scale === s.v}
            onclick={() => (scale = s.v)}
          >
            {$_(s.key)}
          </button>
        {/each}
      </div>
      <p class="mt-1.5 text-[11px] font-mono text-content-muted">{dimensions}</p>
    </section>

    <section>
      <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {$_('map.toolbar.layers_button')}
      </h3>
      <ul class="grid grid-cols-2 gap-1">
        {#each LAYER_KEYS as l (l.id)}
          <li>
            <label class="flex items-center gap-2 py-1 text-sm text-content cursor-pointer">
              <input
                type="checkbox"
                checked={lyrs[l.id]}
                class="h-4 w-4 accent-orange-500"
                onchange={(e) => (lyrs = { ...lyrs, [l.id]: e.currentTarget.checked })}
              />
              {$_(l.label)}
            </label>
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {$_('map.export.background')}
      </h3>
      <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
        {#each BG_OPTIONS as b, i (b.v)}
          <button
            type="button"
            class={[
              'px-3 py-1.5 text-sm font-bold transition-colors',
              i > 0 && 'border-l border-edge/60',
              background === b.v ? 'bg-orange-500 text-white' : 'bg-surface text-content',
            ]}
            aria-pressed={background === b.v}
            onclick={() => (background = b.v)}
          >
            {$_(b.key)}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <h3 class="mb-2 text-[10px] font-bold uppercase tracking-wide text-content-muted">
        {$_('map.export.filename')}
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
      {busy ? $_('map.export.exporting') : $_('map.export.confirm')}
    </button>
  </div>
</dialog>
