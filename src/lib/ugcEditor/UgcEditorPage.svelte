<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { _ } from 'svelte-i18n';
  import Card from '../Card.svelte';
  import SaveBar from '../SaveBar.svelte';
  import SubTabs from '../SubTabs.svelte';
  import { downloadBytes } from '../sav/download';
  import { errorMessage } from '../errorMessage';
  import { getSave } from '../saveFile.svelte';
  import {
    UGC_KINDS,
    buildSidecarZip,
    getUgcSlotName,
    listUgcSlots,
    renameUgcSlot,
    sidecarFromFolderFiles,
    sidecarFromZipFile,
    type UgcKind,
  } from '../shareMii';
  import { ugcCanvasFileName, ugcTexFileName, ugcThumbFileName } from '../shareMii/ugcKinds';
  import type { Matte } from './codec';
  import { markDirty, playerState, syncFromSave } from '../playerEditor.svelte';
  import {
    clearSidecar,
    getSidecarStore,
    hasOriginal,
    mergeSidecarFiles,
    pendingSidecarCount,
    pendingSidecarFiles,
    replaceSidecarFiles,
    revertSidecarFiles,
    sidecarFileCount,
    sidecarOrigin,
  } from '../shareMii/sidecarStore.svelte';
  import { CARD_BASE_CLASS, CARD_CLASS, PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '../styles';
  import { track } from '../analytics';
  import { showToast } from '../toast.svelte';
  import UgcSlotRow from './UgcSlotRow.svelte';

  let activeKind = $state<UgcKind>('Goods');
  let selectedSlot = $state<number | null>(null);
  let busy = $state(false);
  let folderInput = $state<HTMLInputElement | null>(null);
  let zipInput = $state<HTMLInputElement | null>(null);
  let pngInput = $state<HTMLInputElement | null>(null);

  let currentPreview = $state<string | null>(null);
  let newPreview = $state<string | null>(null);
  let pendingDecoded = $state<{ width: number; height: number; rgba: Uint8ClampedArray } | null>(
    null,
  );
  let regenerateThumb = $state(true);
  let fitMode = $state<'fill' | 'contain' | 'cover'>('cover');
  let matteOption = $state<'transparent' | 'white' | 'black' | 'custom'>('transparent');
  let customMatteHex = $state('#000000');
  let editedName = $state('');
  let previewToken = 0;
  let currentPreviewToken = 0;

  const matteColor = $derived.by<Matte | null>(() => {
    switch (matteOption) {
      case 'transparent':
        return null;
      case 'white':
        return { r: 255, g: 255, b: 255, a: 255 };
      case 'black':
        return { r: 0, g: 0, b: 0, a: 255 };
      case 'custom': {
        const hex = customMatteHex.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16) || 0;
        const g = parseInt(hex.slice(2, 4), 16) || 0;
        const b = parseInt(hex.slice(4, 6), 16) || 0;
        return { r, g, b, a: 255 };
      }
    }
  });

  function revokeCurrentPreview(): void {
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
      currentPreview = null;
    }
  }

  function revokeNewPreview(): void {
    if (newPreview) {
      URL.revokeObjectURL(newPreview);
      newPreview = null;
    }
  }

  const playerSave = $derived(getSave('player'));
  const sidecar = $derived(getSidecarStore());

  $effect(() => {
    void playerSave;
    syncFromSave();
  });

  const kindCounts = $derived.by<Record<UgcKind, number>>(() => {
    void playerState.tick;
    const out = Object.fromEntries(UGC_KINDS.map((k) => [k, 0])) as Record<UgcKind, number>;
    if (!playerSave?.parsed) return out;
    for (const k of UGC_KINDS) {
      try {
        const list = listUgcSlots(playerSave.parsed, k, sidecar);
        out[k] = list.filter((s) => !s.isAddNew).length;
      } catch {
        out[k] = 0;
      }
    }
    return out;
  });

  const kindTabs = $derived(
    UGC_KINDS.map((k) => {
      const base = $_(`sharemii.kind.${k}`);
      const n = kindCounts[k];
      return { value: k as UgcKind, label: n > 0 ? `${base} (${n})` : base };
    }),
  );

  type Row = { slot: number; name: string };

  const rows = $derived.by<Row[]>(() => {
    void playerState.tick;
    if (!playerSave?.parsed) return [];
    try {
      const list = listUgcSlots(playerSave.parsed, activeKind, sidecar);
      return list
        .filter((s) => !s.isAddNew)
        .map<Row>((s) => ({
          slot: s.slot,
          name: s.name || $_('ugc_editor.list.unnamed', { values: { slot: s.slot } }),
        }));
    } catch {
      return [];
    }
  });

  const currentName = $derived.by<string>(() => {
    void playerState.tick;
    if (selectedSlot === null || !playerSave?.parsed) return '';
    return getUgcSlotName(playerSave.parsed, activeKind, selectedSlot);
  });

  function slotFileNames(kind: UgcKind, slot: number): string[] {
    const idx = slot - 1;
    return [ugcCanvasFileName(kind, idx), ugcTexFileName(kind, idx), ugcThumbFileName(kind, idx)];
  }

  function isSlotEdited(kind: UgcKind, slot: number): boolean {
    void sidecar.files.size;
    for (const name of slotFileNames(kind, slot)) {
      if (hasOriginal(name)) return true;
    }
    return false;
  }

  const selectedHasThumb = $derived.by(() => {
    if (selectedSlot === null) return false;
    return sidecar.files.has(ugcThumbFileName(activeKind, selectedSlot - 1));
  });

  const selectedIsEdited = $derived.by(() => {
    if (selectedSlot === null) return false;
    return isSlotEdited(activeKind, selectedSlot);
  });

  $effect(() => {
    void sidecar.files.size;
    void playerSave?.loadId;
    untrack(() => {
      if (kindCounts[activeKind] > 0) return;
      const firstWithContent = UGC_KINDS.find((k) => kindCounts[k] > 0);
      if (firstWithContent) activeKind = firstWithContent;
    });
  });

  $effect(() => {
    void activeKind;
    void playerSave?.loadId;
    untrack(() => {
      selectedSlot = null;
      pendingDecoded = null;
      revokeNewPreview();
      revokeCurrentPreview();
    });
  });

  $effect(() => {
    const slot = selectedSlot;
    const kind = activeKind;
    void sidecar.files.size;
    if (slot === null) {
      revokeCurrentPreview();
      return;
    }
    untrack(() => {
      regenerateThumb = true;
      void loadCurrentPreview(kind, slot);
    });
  });

  $effect(() => {
    const next = currentName;
    untrack(() => {
      editedName = next;
    });
  });

  async function pickFolder(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    target.value = '';
    if (files.length === 0) return;
    busy = true;
    try {
      const src = await sidecarFromFolderFiles(files);
      if (src.files.size === 0) {
        showToast('warn', $_('ugc_editor.toast.no_zs_in_folder'));
        return;
      }
      mergeSidecarFiles('folder', src.files);
      showToast(
        'success',
        $_('ugc_editor.toast.loaded_folder', { values: { count: src.files.size } }),
      );
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  async function pickZip(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    busy = true;
    try {
      const src = await sidecarFromZipFile(file);
      if (src.files.size === 0) {
        showToast('warn', $_('ugc_editor.toast.no_zs_in_zip'));
        return;
      }
      mergeSidecarFiles('zip', src.files);
      showToast(
        'success',
        $_('ugc_editor.toast.loaded_zip', { values: { count: src.files.size } }),
      );
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  function commitObjectUrl(blob: Blob, isStillCurrent: () => boolean): string | null {
    const url = URL.createObjectURL(blob);
    if (!isStillCurrent()) {
      URL.revokeObjectURL(url);
      return null;
    }
    return url;
  }

  async function loadCurrentPreview(kind: UgcKind, slot: number): Promise<void> {
    const token = ++currentPreviewToken;
    revokeCurrentPreview();
    const slotIdx = slot - 1;
    const sources = [
      ugcTexFileName(kind, slotIdx),
      ugcCanvasFileName(kind, slotIdx),
      ugcThumbFileName(kind, slotIdx),
    ];
    const codec = await import('./codec');
    for (const name of sources) {
      const bytes = sidecar.files.get(name);
      if (!bytes) continue;
      try {
        const decoded = await codec.decodeZsFile(name, bytes);
        const blob = await codec.rgbaToPngBlob(decoded);
        const url = commitObjectUrl(
          blob,
          () => token === currentPreviewToken && selectedSlot === slot && activeKind === kind,
        );
        if (url) currentPreview = url;
        return;
      } catch (e) {
        console.warn(`UGC preview failed for ${name}`, e);
      }
    }
  }

  async function onPngPicked(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    await loadPng(file);
  }

  async function loadPng(file: File): Promise<void> {
    revokeNewPreview();
    pendingDecoded = null;
    try {
      const { pngFileToRgba } = await import('./codec');
      pendingDecoded = await pngFileToRgba(file);
    } catch (e) {
      showToast('error', errorMessage(e));
    }
  }

  async function rebuildNewPreview(): Promise<void> {
    const token = ++previewToken;
    const decoded = pendingDecoded;
    const matte = matteColor;
    revokeNewPreview();
    if (!decoded) return;
    try {
      const { buildFitPreviewBlob } = await import('./codec');
      const blob = await buildFitPreviewBlob(decoded, 256, fitMode, matte);
      const url = commitObjectUrl(blob, () => token === previewToken && pendingDecoded === decoded);
      if (url) newPreview = url;
    } catch (e) {
      showToast('error', errorMessage(e));
    }
  }

  $effect(() => {
    void fitMode;
    void pendingDecoded;
    void matteColor;
    untrack(() => {
      void rebuildNewPreview();
    });
  });

  async function applyTransform(
    transform: 'rotateCw' | 'rotateCcw' | 'flipH' | 'flipV',
  ): Promise<void> {
    if (!pendingDecoded) return;
    const codec = await import('./codec');
    const fns = {
      rotateCw: codec.rotateRgbaCw,
      rotateCcw: codec.rotateRgbaCcw,
      flipH: codec.flipRgbaH,
      flipV: codec.flipRgbaV,
    };
    pendingDecoded = fns[transform](pendingDecoded);
    track('ugc_editor_transform', { transform });
  }

  function applyRename(): void {
    if (busy || selectedSlot === null || !playerSave?.parsed) return;
    const trimmed = editedName.trim();
    if (trimmed.length === 0) {
      showToast('warn', $_('ugc_editor.editor.rename.empty'));
      return;
    }
    if (trimmed === currentName) return;
    try {
      const entry = renameUgcSlot(playerSave.parsed, activeKind, selectedSlot, trimmed);
      markDirty(entry);
      track('ugc_editor_rename', { kind: activeKind, slot: selectedSlot });
      showToast(
        'success',
        $_('ugc_editor.editor.rename.saved', { values: { slot: selectedSlot } }),
      );
    } catch (e) {
      showToast('error', errorMessage(e));
    }
  }

  const SUPPORTED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

  function isSupportedImage(file: File): boolean {
    const name = file.name.toLowerCase();
    return SUPPORTED_IMAGE_EXTS.some((ext) => name.endsWith(ext));
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!isSupportedImage(file)) {
      showToast('warn', $_('ugc_editor.toast.unsupported_image'));
      return;
    }
    void loadPng(file);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async function applyReplace(): Promise<void> {
    if (busy || selectedSlot === null || !pendingDecoded) return;
    busy = true;
    try {
      const { encodeFromRgba } = await import('./codec');
      const slotIndex = selectedSlot - 1;
      const ugctexName = ugcTexFileName(activeKind, slotIndex);
      const canvasName = ugcCanvasFileName(activeKind, slotIndex);
      const thumbName = ugcThumbFileName(activeKind, slotIndex);
      const original = sidecar.files.get(ugctexName) ?? null;

      const out = await encodeFromRgba(pendingDecoded, {
        originalUgctex: original,
        encodeThumb: regenerateThumb,
        fitMode,
        matte: matteColor,
      });

      const writes = new SvelteMap<string, Uint8Array>();
      writes.set(canvasName, out.canvas);
      writes.set(ugctexName, out.ugctex);
      if (out.thumb) writes.set(thumbName, out.thumb);

      replaceSidecarFiles(writes);

      track('ugc_editor_replace', {
        kind: activeKind,
        slot: selectedSlot,
        thumb: regenerateThumb,
        fit: fitMode,
        matte: matteOption,
      });
      showToast('success', $_('ugc_editor.toast.replaced', { values: { slot: selectedSlot } }));

      revokeNewPreview();
      pendingDecoded = null;
      await loadCurrentPreview(activeKind, selectedSlot);
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  async function exportSelectedAsPng(): Promise<void> {
    if (busy || selectedSlot === null) return;
    busy = true;
    try {
      const slotIdx = selectedSlot - 1;
      const ugctexName = ugcTexFileName(activeKind, slotIdx);
      const canvasName = ugcCanvasFileName(activeKind, slotIdx);
      const thumbName = ugcThumbFileName(activeKind, slotIdx);
      const pickName =
        (sidecar.files.has(ugctexName) && ugctexName) ||
        (sidecar.files.has(canvasName) && canvasName) ||
        (sidecar.files.has(thumbName) && thumbName);
      if (!pickName) {
        showToast('warn', $_('ugc_editor.toast.no_texture'));
        return;
      }
      const bytes = sidecar.files.get(pickName)!;
      const { decodeZsFile, rgbaToPngBlob } = await import('./codec');
      const decoded = await decodeZsFile(pickName, bytes);
      const blob = await rgbaToPngBlob(decoded);
      const ab = await blob.arrayBuffer();
      const fileName = `${activeKind}${String(slotIdx).padStart(3, '0')}.png`;
      downloadBytes(new Uint8Array(ab), fileName);
      track('ugc_editor_export', { kind: activeKind, slot: selectedSlot });
      showToast('success', $_('ugc_editor.toast.exported', { values: { fileName } }));
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  function revertSelected(): void {
    if (busy || selectedSlot === null) return;
    const names = slotFileNames(activeKind, selectedSlot);
    const result = revertSidecarFiles(names);
    if (result.restored.length === 0 && result.removed.length === 0) return;
    track('ugc_editor_revert', { kind: activeKind, slot: selectedSlot });
    showToast('success', $_('ugc_editor.toast.reverted', { values: { slot: selectedSlot } }));
    revokeNewPreview();
    pendingDecoded = null;
    void loadCurrentPreview(activeKind, selectedSlot);
  }

  function downloadPending(): void {
    const files = pendingSidecarFiles();
    if (files.length === 0) return;
    downloadBytes(buildSidecarZip(files), 'UGC-edits.zip');
    track('ugc_editor_pending_downloaded', { count: files.length });
    showToast(
      'success',
      $_('ugc_editor.toast.downloaded_pending', { values: { count: files.length } }),
    );
  }

  const sidecarLabel = $derived.by(() => {
    const o = sidecarOrigin();
    if (o === 'none') return $_('ugc_editor.sidecar.none');
    return $_('ugc_editor.sidecar.loaded', { values: { count: sidecarFileCount() } });
  });

  onDestroy(() => {
    revokeCurrentPreview();
    revokeNewPreview();
  });

  function selectRow(slot: number): void {
    if (selectedSlot === slot) return;
    selectedSlot = slot;
    revokeNewPreview();
    pendingDecoded = null;
    revokeCurrentPreview();
  }
</script>

<div class="grid grid-cols-1 gap-6">
  <header>
    <h2 class="text-2xl font-bold tracking-tight text-content-strong">
      {$_('ugc_editor.title')}
    </h2>
    <p class="mt-1 text-sm text-content">{$_('ugc_editor.description')}</p>
  </header>

  {#if !playerSave}
    <Card>
      <p class="text-sm text-content">
        {$_('ugc_editor.needs_player', { values: { playerSav: 'Player.sav' } })}
      </p>
    </Card>
  {:else}
    {#if pendingSidecarCount() > 0}
      <SaveBar
        dirty={true}
        actionLabel={$_('ugc_editor.save_bar.download_pending', {
          values: { count: pendingSidecarCount() },
        })}
        onAction={downloadPending}
      />
    {:else}
      <SaveBar dirty={playerState.dirty} />
    {/if}

    <section class={[CARD_BASE_CLASS, 'flex flex-col gap-3 px-4 py-3 sm:px-5']}>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          class={[
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
            sidecarOrigin() === 'none'
              ? 'bg-surface-sunken text-warn'
              : 'bg-surface-sunken text-content-strong',
          ]}
        >
          <span
            aria-hidden="true"
            class={[
              'h-2 w-2 rounded-full',
              sidecarOrigin() === 'none' ? 'bg-warn' : 'bg-orange-500',
            ]}
          ></span>
          {sidecarLabel}
        </span>
        <span class="text-xs text-content-muted">{$_('ugc_editor.sidecar.hint')}</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => folderInput?.click()}
          disabled={busy}>{$_('ugc_editor.sidecar.pick_folder')}</button
        >
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => zipInput?.click()}
          disabled={busy}>{$_('ugc_editor.sidecar.pick_zip')}</button
        >
        {#if sidecarOrigin() !== 'none'}
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            onclick={() => clearSidecar()}
            disabled={busy}>{$_('ugc_editor.sidecar.clear')}</button
          >
        {/if}
      </div>
    </section>

    <SubTabs tabs={kindTabs} bind:value={activeKind} label={$_('ugc_editor.kind_tabs_label')} />

    <section class={CARD_CLASS}>
      <div class="grid gap-4 md:grid-cols-[280px_1fr]">
        <div>
          <h3 class="mb-2 text-sm font-bold text-content-strong">
            {$_('ugc_editor.list.title', { values: { count: rows.length } })}
          </h3>
          {#if rows.length === 0}
            <p class="text-sm text-content-muted">{$_('ugc_editor.list.empty')}</p>
          {:else}
            <ul
              class="max-h-[480px] divide-y divide-edge/40 overflow-y-auto rounded-lg bg-surface-sunken ring-1 ring-edge/40"
            >
              {#each rows as r (r.slot)}
                <UgcSlotRow
                  slot={r.slot}
                  name={r.name}
                  kind={activeKind}
                  {sidecar}
                  selected={selectedSlot === r.slot}
                  edited={isSlotEdited(activeKind, r.slot)}
                  onSelect={selectRow}
                />
              {/each}
            </ul>
          {/if}
        </div>

        <div>
          {#if selectedSlot === null}
            <p class="text-sm text-content-muted">{$_('ugc_editor.editor.pick_item')}</p>
          {:else}
            <div class="mb-4">
              <label
                for="ugc-rename-input"
                class="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-content-muted"
              >
                {$_('ugc_editor.editor.rename.label')}
              </label>
              <div class="flex items-center gap-2">
                <input
                  id="ugc-rename-input"
                  type="text"
                  bind:value={editedName}
                  maxlength={63}
                  placeholder={$_('ugc_editor.editor.rename.placeholder')}
                  class="min-w-0 flex-1 rounded-lg border border-edge/60 bg-surface px-3 py-1.5 text-sm text-content-strong focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                <button
                  type="button"
                  class={PILL_BUTTON_CLASS}
                  onclick={applyRename}
                  disabled={busy ||
                    editedName.trim().length === 0 ||
                    editedName.trim() === currentName}
                >
                  {$_('ugc_editor.editor.rename.save')}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <figure class="flex flex-col">
                <figcaption
                  class="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-content-muted"
                >
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
                    {sidecarOrigin() === 'none'
                      ? $_('ugc_editor.editor.needs_sidecar')
                      : $_('ugc_editor.editor.no_current')}
                  </div>
                {/if}
              </figure>

              <div aria-hidden="true" class="text-2xl font-bold text-content-muted">→</div>

              <figure class="flex flex-col">
                <figcaption
                  class="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-content-muted"
                >
                  {$_('ugc_editor.editor.new')}
                </figcaption>
                <button
                  type="button"
                  ondrop={onDrop}
                  ondragover={onDragOver}
                  onclick={() => pngInput?.click()}
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
              </figure>
            </div>

            {#if pendingDecoded}
              <fieldset class="mt-4">
                <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
                  {$_('ugc_editor.editor.transform.label')}
                </legend>
                <div
                  class="mt-1.5 inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
                >
                  <button
                    type="button"
                    onclick={() => void applyTransform('rotateCcw')}
                    title={$_('ugc_editor.editor.transform.rotate_ccw')}
                    aria-label={$_('ugc_editor.editor.transform.rotate_ccw')}
                    disabled={busy}
                    class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onclick={() => void applyTransform('rotateCw')}
                    title={$_('ugc_editor.editor.transform.rotate_cw')}
                    aria-label={$_('ugc_editor.editor.transform.rotate_cw')}
                    disabled={busy}
                    class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onclick={() => void applyTransform('flipH')}
                    title={$_('ugc_editor.editor.transform.flip_h')}
                    aria-label={$_('ugc_editor.editor.transform.flip_h')}
                    disabled={busy}
                    class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M12 3v18" stroke-dasharray="2 2" />
                      <path d="M3 7l6 5-6 5V7z" fill="currentColor" />
                      <path d="M21 7l-6 5 6 5V7z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onclick={() => void applyTransform('flipV')}
                    title={$_('ugc_editor.editor.transform.flip_v')}
                    aria-label={$_('ugc_editor.editor.transform.flip_v')}
                    disabled={busy}
                    class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M3 12h18" stroke-dasharray="2 2" />
                      <path d="M7 3l5 6 5-6H7z" fill="currentColor" />
                      <path d="M7 21l5-6 5 6H7z" />
                    </svg>
                  </button>
                </div>
              </fieldset>

              <fieldset class="mt-4">
                <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
                  {$_('ugc_editor.editor.fit_mode.label')}
                </legend>
                <div
                  class="mt-1.5 inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
                  role="radiogroup"
                  aria-label={$_('ugc_editor.editor.fit_mode.label')}
                >
                  {#each ['cover', 'contain', 'fill'] as const as mode (mode)}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={fitMode === mode}
                      onclick={() => (fitMode = mode)}
                      class={[
                        'rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
                        fitMode === mode
                          ? 'bg-orange-500 text-white shadow'
                          : 'text-content hover:text-content-strong',
                      ]}
                    >
                      {$_(`ugc_editor.editor.fit_mode.${mode}`)}
                    </button>
                  {/each}
                </div>
                <p class="mt-1 text-xs text-content-muted">
                  {$_(`ugc_editor.editor.fit_mode.${fitMode}_hint`)}
                </p>
              </fieldset>

              {#if fitMode === 'contain'}
                <fieldset class="mt-4">
                  <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
                    {$_('ugc_editor.editor.matte.label')}
                  </legend>
                  <div
                    class="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
                    role="radiogroup"
                    aria-label={$_('ugc_editor.editor.matte.label')}
                  >
                    {#each ['transparent', 'white', 'black', 'custom'] as const as opt (opt)}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={matteOption === opt}
                        onclick={() => (matteOption = opt)}
                        class={[
                          'rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
                          matteOption === opt
                            ? 'bg-orange-500 text-white shadow'
                            : 'text-content hover:text-content-strong',
                        ]}
                      >
                        {$_(`ugc_editor.editor.matte.${opt}`)}
                      </button>
                    {/each}
                    {#if matteOption === 'custom'}
                      <input
                        type="color"
                        bind:value={customMatteHex}
                        aria-label={$_('ugc_editor.editor.matte.custom')}
                        class="ml-1 h-6 w-8 cursor-pointer rounded border border-edge/60 bg-transparent"
                      />
                    {/if}
                  </div>
                </fieldset>
              {/if}
            {/if}

            {#if selectedHasThumb}
              <label class="mt-4 flex items-start gap-2 text-xs text-content">
                <input
                  type="checkbox"
                  bind:checked={regenerateThumb}
                  class="mt-0.5 h-4 w-4 rounded border-edge/60 text-orange-500 focus:ring-orange-500/30"
                />
                <span>
                  <span class="block font-bold text-content-strong">
                    {$_('ugc_editor.editor.regenerate_thumb')}
                  </span>
                  <span class="block text-content-muted">
                    {$_('ugc_editor.editor.regenerate_thumb_hint')}
                  </span>
                </span>
              </label>
            {/if}

            <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
              {#if selectedIsEdited}
                <button
                  type="button"
                  class={PILL_BUTTON_CLASS}
                  onclick={revertSelected}
                  disabled={busy}
                >
                  {$_('ugc_editor.editor.revert')}
                </button>
              {/if}
              <button
                type="button"
                class={PILL_BUTTON_CLASS}
                onclick={exportSelectedAsPng}
                disabled={busy || sidecarOrigin() === 'none'}
              >
                {$_('ugc_editor.editor.export_png')}
              </button>
              <button
                type="button"
                class={PRIMARY_BUTTON_CLASS}
                onclick={applyReplace}
                disabled={busy || !pendingDecoded}
              >
                {busy ? $_('ugc_editor.editor.applying') : $_('ugc_editor.editor.replace')}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  <input
    bind:this={folderInput}
    type="file"
    class="hidden"
    multiple
    webkitdirectory
    onchange={pickFolder}
  />
  <input bind:this={zipInput} type="file" class="hidden" accept=".zip" onchange={pickZip} />
  <input
    bind:this={pngInput}
    type="file"
    class="hidden"
    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
    onchange={onPngPicked}
  />
</div>

<style>
  .bg-checker {
    --checker-a: #ffffff;
    --checker-b: #d4d4d8;
    background-color: var(--checker-a);
    background-image:
      linear-gradient(45deg, var(--checker-b) 25%, transparent 25%),
      linear-gradient(-45deg, var(--checker-b) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--checker-b) 75%),
      linear-gradient(-45deg, transparent 75%, var(--checker-b) 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
  }

  :global(html.dark) .bg-checker {
    --checker-a: #1f1f23;
    --checker-b: #2c2c33;
  }
</style>
