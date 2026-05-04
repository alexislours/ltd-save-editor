<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'svelte-i18n';
  import Card from '../Card.svelte';
  import SaveBar from '../SaveBar.svelte';
  import SubTabs from '../SubTabs.svelte';
  import Tutorial from '../Tutorial.svelte';
  import { downloadBytes } from '../sav/download';
  import { errorMessage } from '../errorMessage';
  import { getSave } from '../saveFile.svelte';
  import {
    UGC_KINDS,
    buildSidecarZip,
    listUgcSlots,
    sidecarFromFolderFiles,
    sidecarFromZipFile,
    type UgcKind,
  } from '../shareMii';
  import { ugcCanvasFileName, ugcTexFileName, ugcThumbFileName } from '../shareMii/ugcKinds';
  import { playerAccessor, playerState, syncFromSave } from '../playerEditor.svelte';
  import { miiAccessor } from '../mii/miiEditor.svelte';
  import { PLAYER_SCHEMA } from '../sav/schema';
  import { TextureReplaceState } from '../textureEditor/textureReplaceState.svelte';
  import PreviewPair from '../textureEditor/PreviewPair.svelte';
  import TextureControls from '../textureEditor/TextureControls.svelte';
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
  import FacepaintSection from '../facepaintEditor/FacepaintSection.svelte';

  const UGC_NAME_LEAVES = {
    Cloth: PLAYER_SCHEMA.UGC.Cloth.Name,
    Food: PLAYER_SCHEMA.UGC.Food.Name,
    Goods: PLAYER_SCHEMA.UGC.Goods.Name,
    Interior: PLAYER_SCHEMA.UGC.Interior.Name,
    Exterior: PLAYER_SCHEMA.UGC.Exterior.Name,
    MapObject: PLAYER_SCHEMA.UGC.MapObject.Name,
    MapFloor: PLAYER_SCHEMA.UGC.MapFloor.Name,
  } as const;

  type TabKind = UgcKind | 'FacePaint';
  let activeKind = $state<TabKind>('Goods');
  let selectedSlot = $state<number | null>(null);
  let busy = $state(false);
  let folderInput = $state<HTMLInputElement | null>(null);
  let zipInput = $state<HTMLInputElement | null>(null);
  let pngInput = $state<HTMLInputElement | null>(null);

  let currentPreview = $state<string | null>(null);
  let regenerateThumb = $state(true);
  let editedName = $state('');
  let currentPreviewToken = 0;

  const tx = new TextureReplaceState(
    (e) => showToast('error', errorMessage(e)),
    (transform) => track('ugc_editor_transform', { transform }),
  );

  function revokeCurrentPreview(): void {
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
      currentPreview = null;
    }
  }

  const playerSave = $derived(getSave('player'));
  const sidecar = $derived(getSidecarStore());

  const ugcKind = $derived<UgcKind | null>(
    activeKind === 'FacePaint' ? null : (activeKind as UgcKind),
  );

  $effect(() => {
    void playerSave;
    syncFromSave();
  });

  const kindCounts = $derived.by<Record<UgcKind, number>>(() => {
    const out = Object.fromEntries(UGC_KINDS.map((k) => [k, 0])) as Record<UgcKind, number>;
    void playerState.dirty;
    const player = playerAccessor();
    if (!player) return out;
    for (const k of UGC_KINDS) {
      try {
        const list = listUgcSlots({ player }, k, sidecar);
        out[k] = list.filter((s) => !s.isAddNew).length;
      } catch {
        out[k] = 0;
      }
    }
    return out;
  });

  const kindTabs = $derived([
    ...UGC_KINDS.map((k) => {
      const base = $_(`sharemii.kind.${k}`);
      const n = kindCounts[k];
      return { value: k as TabKind, label: n > 0 ? `${base} (${n})` : base };
    }),
    { value: 'FacePaint' as TabKind, label: $_('sharemii.kind.FacePaint') },
  ]);

  type Row = { slot: number; name: string };

  const rows = $derived.by<Row[]>(() => {
    void playerState.dirty;
    if (!ugcKind) return [];
    const player = playerAccessor();
    if (!player) return [];
    try {
      const list = listUgcSlots({ player }, ugcKind, sidecar);
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
    if (selectedSlot === null || !ugcKind) return '';
    const acc = playerAccessor();
    if (!acc) return '';
    const leaf = UGC_NAME_LEAVES[ugcKind];
    if (!acc.has(leaf)) return '';
    const arr = acc.get(leaf) as string[];
    return arr[selectedSlot - 1] ?? '';
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
    if (selectedSlot === null || !ugcKind) return false;
    return sidecar.files.has(ugcThumbFileName(ugcKind, selectedSlot - 1));
  });

  const selectedIsEdited = $derived.by(() => {
    if (selectedSlot === null || !ugcKind) return false;
    return isSlotEdited(ugcKind, selectedSlot);
  });

  $effect(() => {
    void sidecar.files.size;
    void playerSave?.loadId;
    untrack(() => {
      if (activeKind === 'FacePaint') return;
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
      tx.reset();
      revokeCurrentPreview();
    });
  });

  $effect(() => {
    const slot = selectedSlot;
    const kind = ugcKind;
    void sidecar.files.size;
    if (slot === null || !kind) {
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
        const stillCurrent =
          token === currentPreviewToken && selectedSlot === slot && ugcKind === kind;
        if (!stillCurrent) return;
        currentPreview = URL.createObjectURL(blob);
        return;
      } catch (e) {
        console.warn(`UGC preview failed for ${name}`, e);
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

  function applyRename(): void {
    if (busy || selectedSlot === null || !ugcKind) return;
    const trimmed = editedName.trim();
    if (trimmed.length === 0) {
      showToast('warn', $_('ugc_editor.editor.rename.empty'));
      return;
    }
    if (trimmed === currentName) return;
    const acc = playerAccessor();
    if (!acc) return;
    const leaf = UGC_NAME_LEAVES[ugcKind];
    try {
      if (!acc.has(leaf)) throw new Error('UGC name array not present in save');
      acc.setElement(leaf, selectedSlot - 1, trimmed);
      track('ugc_editor_rename', { kind: ugcKind, slot: selectedSlot });
      showToast(
        'success',
        $_('ugc_editor.editor.rename.saved', { values: { slot: selectedSlot } }),
      );
    } catch (e) {
      showToast('error', errorMessage(e));
    }
  }

  async function applyReplace(): Promise<void> {
    if (busy || selectedSlot === null || !tx.pendingDecoded || !ugcKind) return;
    busy = true;
    try {
      const { encodeFromRgba } = await import('./codec');
      const slotIndex = selectedSlot - 1;
      const ugctexName = ugcTexFileName(ugcKind, slotIndex);
      const canvasName = ugcCanvasFileName(ugcKind, slotIndex);
      const thumbName = ugcThumbFileName(ugcKind, slotIndex);
      const original = sidecar.files.get(ugctexName) ?? null;

      const out = await encodeFromRgba(tx.pendingDecoded, {
        originalUgctex: original,
        encodeThumb: regenerateThumb,
        fitMode: tx.fitMode,
        matte: tx.matteColor,
      });

      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const writes = new Map<string, Uint8Array>();
      writes.set(canvasName, out.canvas);
      writes.set(ugctexName, out.ugctex);
      if (out.thumb) writes.set(thumbName, out.thumb);

      replaceSidecarFiles(writes);

      track('ugc_editor_replace', {
        kind: ugcKind,
        slot: selectedSlot,
        thumb: regenerateThumb,
        fit: tx.fitMode,
        matte: tx.matteOption,
      });
      showToast('success', $_('ugc_editor.toast.replaced', { values: { slot: selectedSlot } }));

      tx.reset();
      await loadCurrentPreview(ugcKind, selectedSlot);
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  async function exportSelectedAsPng(): Promise<void> {
    if (busy || selectedSlot === null || !ugcKind) return;
    busy = true;
    try {
      const slotIdx = selectedSlot - 1;
      const ugctexName = ugcTexFileName(ugcKind, slotIdx);
      const canvasName = ugcCanvasFileName(ugcKind, slotIdx);
      const thumbName = ugcThumbFileName(ugcKind, slotIdx);
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
      const fileName = `${ugcKind}${String(slotIdx).padStart(3, '0')}.png`;
      downloadBytes(new Uint8Array(ab), fileName);
      track('ugc_editor_export', { kind: ugcKind, slot: selectedSlot });
      showToast('success', $_('ugc_editor.toast.exported', { values: { fileName } }));
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  function revertSelected(): void {
    if (busy || selectedSlot === null || !ugcKind) return;
    const names = slotFileNames(ugcKind, selectedSlot);
    const result = revertSidecarFiles(names);
    if (result.restored.length === 0 && result.removed.length === 0) return;
    track('ugc_editor_revert', { kind: ugcKind, slot: selectedSlot });
    showToast('success', $_('ugc_editor.toast.reverted', { values: { slot: selectedSlot } }));
    tx.reset();
    void loadCurrentPreview(ugcKind, selectedSlot);
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
    tx.revokeNewPreview();
  });

  function selectRow(slot: number): void {
    if (selectedSlot === slot) return;
    selectedSlot = slot;
    tx.reset();
    revokeCurrentPreview();
  }
</script>

<div class="grid grid-cols-1 gap-6">
  <header class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h2 class="text-2xl font-bold tracking-tight text-content-strong">
        {$_('ugc_editor.title')}
      </h2>
      <p class="mt-1 text-sm text-content">{$_('ugc_editor.description')}</p>
    </div>
    <Tutorial />
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
      {#if !ugcKind}
        {@const player = playerAccessor()}
        {@const mii = miiAccessor()}
        {#if player}
          <FacepaintSection {player} {mii} />
        {:else}
          <p class="text-sm text-content-muted">{$_('ugc_editor.editor.pick_item')}</p>
        {/if}
      {:else}
        <div class="grid gap-4 md:grid-cols-[280px_1fr]">
          <div>
            <h3 class="mb-2 text-sm font-bold text-content-strong">
              {$_('ugc_editor.list.title', { values: { count: rows.length } })}
            </h3>
            {#if rows.length === 0}
              <p class="text-sm text-content-muted">{$_('ugc_editor.list.empty')}</p>
            {:else}
              <ul
                data-tutorial="ugc-rows"
                class="max-h-[480px] divide-y divide-edge/40 overflow-y-auto rounded-lg bg-surface-sunken ring-1 ring-edge/40"
              >
                {#each rows as r (r.slot)}
                  <UgcSlotRow
                    slot={r.slot}
                    name={r.name}
                    kind={ugcKind}
                    {sidecar}
                    selected={selectedSlot === r.slot}
                    edited={isSlotEdited(ugcKind, r.slot)}
                    onSelect={selectRow}
                  />
                {/each}
              </ul>
            {/if}
          </div>

          <div data-tutorial="ugc-editor">
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

              <PreviewPair
                {currentPreview}
                newPreview={tx.newPreview}
                sidecarMissing={sidecarOrigin() === 'none'}
                dropTutorialId="ugc-drop"
                onPick={() => pngInput?.click()}
                onDropFile={(file) => void tx.loadFile(file)}
              />

              {#if tx.pendingDecoded}
                <TextureControls state={tx} {busy} />
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
                  data-tutorial="ugc-replace"
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
      {/if}
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
