<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { downloadBytes } from '$lib/sav/download';
  import { errorMessage } from '$lib/errorMessage';
  import { facepaintCanvasFileName, facepaintTexFileName } from '$lib/shareMii/codec/ugcKinds';
  import {
    getSidecarStore,
    hasOriginal,
    replaceSidecarFiles,
    revertSidecarFiles,
    sidecarOrigin,
  } from '$lib/shareMii/sidecar/sidecarStore.svelte';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import { track } from '$lib/analytics';
  import { showToast } from '$lib/toast/toast.svelte';
  import type { Accessor } from '$lib/sav/materialized/accessor';
  import { TextureReplaceState } from '$lib/ugc/texture/textureReplaceState.svelte';
  import PreviewPair from '$lib/ugc/texture/PreviewPair.svelte';
  import TextureControls from '$lib/ugc/texture/TextureControls.svelte';
  import { listFacepaints } from './list';
  import FacepaintRow from './FacepaintRow.svelte';

  type Props = {
    player: Accessor<'player'>;
    mii: Accessor<'mii'> | null;
  };
  let { player, mii }: Props = $props();

  let selectedId = $state<number | null>(null);
  let busy = $state(false);
  let pngInput = $state<HTMLInputElement | null>(null);

  let currentPreview = $state<string | null>(null);
  let currentPreviewToken = 0;

  const tx = new TextureReplaceState(
    (e) => showToast('error', errorMessage(e)),
    (transform) => track('facepaint_editor_transform', { transform }),
  );

  function revokeCurrentPreview(): void {
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
      currentPreview = null;
    }
  }

  const sidecar = $derived(getSidecarStore());

  type Row = { id: number; label: string };

  const rows = $derived.by<Row[]>(() => {
    try {
      const list = listFacepaints(player, mii);
      return list.map<Row>((f) => ({
        id: f.id,
        label: f.ownerName
          ? $_('ugc_editor.list.facepaint_owned', { values: { name: f.ownerName } })
          : $_('ugc_editor.list.facepaint_unassigned'),
      }));
    } catch {
      return [];
    }
  });

  function slotFileNames(id: number): string[] {
    return [facepaintCanvasFileName(id), facepaintTexFileName(id)];
  }

  function isSlotEdited(id: number): boolean {
    void sidecar.files.size;
    for (const name of slotFileNames(id)) {
      if (hasOriginal(name)) return true;
    }
    return false;
  }

  const selectedIsEdited = $derived.by(() => {
    if (selectedId === null) return false;
    return isSlotEdited(selectedId);
  });

  $effect(() => {
    const id = selectedId;
    void sidecar.files.size;
    if (id === null) {
      revokeCurrentPreview();
      tx.originalUgctex = null;
      return;
    }
    tx.originalUgctex = sidecar.files.get(facepaintTexFileName(id)) ?? null;
    untrack(() => {
      void loadCurrentPreview(id);
    });
  });

  async function loadCurrentPreview(id: number): Promise<void> {
    const token = ++currentPreviewToken;
    revokeCurrentPreview();
    const sources = [facepaintTexFileName(id), facepaintCanvasFileName(id)];
    const codec = await import('$lib/ugc/codec');
    for (const name of sources) {
      const bytes = sidecar.files.get(name);
      if (!bytes) continue;
      try {
        const decoded = await codec.decodeZsFile(name, bytes);
        const blob = await codec.rgbaToPngBlob(decoded);
        const stillCurrent = token === currentPreviewToken && selectedId === id;
        if (!stillCurrent) return;
        currentPreview = URL.createObjectURL(blob);
        return;
      } catch (e) {
        console.warn(`Facepaint preview failed for ${name}`, e);
      }
    }
  }

  function onPngPicked(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    void tx.loadFile(file);
  }

  async function applyReplace(): Promise<void> {
    if (busy || selectedId === null || !tx.pendingDecoded) return;
    busy = true;
    try {
      const { encodeFromRgba } = await import('$lib/ugc/codec');
      const id = selectedId;
      const ugctexName = facepaintTexFileName(id);
      const canvasName = facepaintCanvasFileName(id);
      const original = sidecar.files.get(ugctexName) ?? null;

      const out = await encodeFromRgba(tx.pendingDecoded, {
        originalUgctex: original,
        encodeThumb: false,
        fitMode: tx.fitMode,
        matte: tx.matteColor,
        bc1Mode: tx.bc1Mode,
        encoder: tx.encoder,
      });

      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const writes = new Map<string, Uint8Array>();
      writes.set(canvasName, out.canvas);
      writes.set(ugctexName, out.ugctex);

      replaceSidecarFiles(writes);

      track('facepaint_editor_replace', {
        id,
        fit: tx.fitMode,
        matte: tx.matteOption,
        bc1Mode: tx.bc1Mode,
        encoder: tx.encoder,
      });
      showToast('success', $_('ugc_editor.toast.replaced', { values: { slot: id } }));

      tx.reset();
      await loadCurrentPreview(id);
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  async function exportSelectedAsPng(): Promise<void> {
    if (busy || selectedId === null) return;
    busy = true;
    try {
      const id = selectedId;
      const ugctexName = facepaintTexFileName(id);
      const canvasName = facepaintCanvasFileName(id);
      const pickName =
        (sidecar.files.has(ugctexName) && ugctexName) ||
        (sidecar.files.has(canvasName) && canvasName);
      if (!pickName) {
        showToast('warn', $_('ugc_editor.toast.no_texture'));
        return;
      }
      const bytes = sidecar.files.get(pickName)!;
      const { decodeZsFile, rgbaToPngBlob } = await import('$lib/ugc/codec');
      const decoded = await decodeZsFile(pickName, bytes);
      const blob = await rgbaToPngBlob(decoded);
      const ab = await blob.arrayBuffer();
      const fileName = `Facepaint${String(id).padStart(3, '0')}.png`;
      downloadBytes(new Uint8Array(ab), fileName);
      track('facepaint_editor_export', { id });
      showToast('success', $_('ugc_editor.toast.exported', { values: { fileName } }));
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  function revertSelected(): void {
    if (busy || selectedId === null) return;
    const names = slotFileNames(selectedId);
    const result = revertSidecarFiles(names);
    if (result.restored.length === 0 && result.removed.length === 0) return;
    track('facepaint_editor_revert', { id: selectedId });
    showToast('success', $_('ugc_editor.toast.reverted', { values: { slot: selectedId } }));
    tx.reset();
    void loadCurrentPreview(selectedId);
  }

  function selectRow(id: number): void {
    if (selectedId === id) return;
    selectedId = id;
    tx.reset();
    revokeCurrentPreview();
  }

  onDestroy(() => {
    revokeCurrentPreview();
    tx.revokeNewPreview();
  });
</script>

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
        {#each rows as r (r.id)}
          <FacepaintRow
            id={r.id}
            label={r.label}
            {sidecar}
            selected={selectedId === r.id}
            edited={isSlotEdited(r.id)}
            onSelect={selectRow}
          />
        {/each}
      </ul>
    {/if}
  </div>

  <div>
    {#if selectedId === null}
      <p class="text-sm text-content-muted">{$_('ugc_editor.editor.pick_item')}</p>
    {:else}
      <PreviewPair
        {currentPreview}
        newPreview={tx.newPreview}
        newPreviewElapsedMs={tx.previewElapsedMs}
        sidecarMissing={sidecarOrigin() === 'none'}
        onPick={() => pngInput?.click()}
        onDropFile={(file) => void tx.loadFile(file)}
      />

      {#if tx.pendingDecoded}
        <TextureControls state={tx} {busy} />
      {/if}

      <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
        {#if selectedIsEdited}
          <button type="button" class={PILL_BUTTON_CLASS} onclick={revertSelected} disabled={busy}>
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
          disabled={busy || !tx.pendingDecoded}
        >
          {busy ? $_('ugc_editor.editor.applying') : $_('ugc_editor.editor.replace')}
        </button>
      </div>
    {/if}
  </div>
</div>

<input
  bind:this={pngInput}
  type="file"
  class="hidden"
  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
  onchange={onPngPicked}
/>
