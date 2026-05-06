<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'svelte-i18n';
  import Card from '$lib/ui/Card.svelte';
  import SaveBar from '$lib/saveFile/SaveBar.svelte';
  import SubTabs from '$lib/ui/SubTabs.svelte';
  import Tutorial from '$lib/tutorial/Tutorial.svelte';
  import { downloadBytes } from '$lib/sav/download';
  import { errorMessage } from '$lib/errorMessage';
  import { getSave } from '$lib/saveFile/saveFile.svelte';
  import { UGC_KINDS, buildSidecarZip, type UgcKind } from '$lib/shareMii';
  import { playerAccessor, playerState, syncFromSave } from '$lib/player/playerEditor.svelte';
  import { miiAccessor } from '$lib/mii/miiEditor.svelte';
  import { TextureReplaceState } from '$lib/ugc/texture/textureReplaceState.svelte';
  import {
    getSidecarStore,
    pendingSidecarCount,
    pendingSidecarFiles,
    replaceSidecarFiles,
    revertSidecarFiles,
    sidecarOrigin,
  } from '$lib/shareMii/sidecar/sidecarStore.svelte';
  import { CARD_CLASS } from '$lib/ui/styles';
  import { track } from '$lib/analytics';
  import { showToast } from '$lib/toast/toast.svelte';
  import FacepaintSection from '$lib/ugc/facepaint/FacepaintSection.svelte';
  import {
    buildKindCounts,
    buildReplaceWrites,
    buildUgcRows,
    clearLanRestriction,
    decodeSidecarToPngUrl,
    decodeSlotToPng,
    getSlotOriginalUgctex,
    getUgcSlotName,
    hasLanRestriction,
    isSlotEdited,
    setUgcSlotName,
    slotFileNames,
    slotPreviewCandidates,
    slotThumbName,
  } from './ugcEditorPage';
  import UgcSidecarBar from './UgcSidecarBar.svelte';
  import UgcSlotEditor from './UgcSlotEditor.svelte';
  import UgcSlotList from './UgcSlotList.svelte';

  type TabKind = UgcKind | 'FacePaint';
  let activeKind = $state<TabKind>('Goods');
  let selectedSlot = $state<number | null>(null);
  let busy = $state(false);
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
    void playerState.dirty;
    return buildKindCounts(playerAccessor(), sidecar);
  });

  const kindTabs = $derived([
    ...UGC_KINDS.map((k) => {
      const base = $_(`sharemii.kind.${k}`);
      const n = kindCounts[k];
      return { value: k as TabKind, label: n > 0 ? `${base} (${n})` : base };
    }),
    { value: 'FacePaint' as TabKind, label: $_('sharemii.kind.FacePaint') },
  ]);

  const rows = $derived.by(() => {
    void playerState.dirty;
    if (!ugcKind) return [];
    return buildUgcRows(playerAccessor(), ugcKind, sidecar, {
      unnamed: (slot) => $_('ugc_editor.list.unnamed', { values: { slot } }),
    });
  });

  const currentName = $derived.by(() => {
    if (selectedSlot === null || !ugcKind) return '';
    return getUgcSlotName(playerAccessor(), ugcKind, selectedSlot);
  });

  const selectedHasThumb = $derived.by(() => {
    if (selectedSlot === null || !ugcKind) return false;
    return sidecar.files.has(slotThumbName(ugcKind, selectedSlot));
  });

  const selectedIsEdited = $derived.by(() => {
    if (selectedSlot === null || !ugcKind) return false;
    void sidecar.files.size;
    return isSlotEdited(ugcKind, selectedSlot);
  });

  const selectedHasLanRestriction = $derived.by(() => {
    void playerState.dirty;
    if (selectedSlot === null || !ugcKind) return false;
    return hasLanRestriction(playerAccessor(), ugcKind, selectedSlot);
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
      tx.originalUgctex = null;
      return;
    }
    tx.originalUgctex = getSlotOriginalUgctex(sidecar, kind, slot);
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

  async function loadCurrentPreview(kind: UgcKind, slot: number): Promise<void> {
    const token = ++currentPreviewToken;
    revokeCurrentPreview();
    const url = await decodeSidecarToPngUrl(sidecar, slotPreviewCandidates(kind, slot));
    if (!url) return;
    const stillCurrent = token === currentPreviewToken && selectedSlot === slot && ugcKind === kind;
    if (!stillCurrent) {
      URL.revokeObjectURL(url);
      return;
    }
    currentPreview = url;
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
    try {
      setUgcSlotName(acc, ugcKind, selectedSlot, trimmed);
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
      const writes = await buildReplaceWrites({
        decoded: tx.pendingDecoded,
        kind: ugcKind,
        slot: selectedSlot,
        sidecar,
        encodeThumb: regenerateThumb,
        fitMode: tx.fitMode,
        matte: tx.matteColor,
        bc1Mode: tx.bc1Mode,
        encoder: tx.encoder,
      });
      replaceSidecarFiles(writes);
      track('ugc_editor_replace', {
        kind: ugcKind,
        slot: selectedSlot,
        thumb: regenerateThumb,
        fit: tx.fitMode,
        matte: tx.matteOption,
        bc1Mode: tx.bc1Mode,
        encoder: tx.encoder,
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
      const result = await decodeSlotToPng(sidecar, ugcKind, selectedSlot);
      if (!result) {
        showToast('warn', $_('ugc_editor.toast.no_texture'));
        return;
      }
      downloadBytes(result.bytes, result.fileName);
      track('ugc_editor_export', { kind: ugcKind, slot: selectedSlot });
      showToast(
        'success',
        $_('ugc_editor.toast.exported', { values: { fileName: result.fileName } }),
      );
    } catch (e) {
      showToast('error', errorMessage(e));
    } finally {
      busy = false;
    }
  }

  function clearLan(): void {
    if (busy || selectedSlot === null || !ugcKind) return;
    const acc = playerAccessor();
    if (!acc) return;
    try {
      clearLanRestriction(acc, ugcKind, selectedSlot);
      track('ugc_editor_clear_lan_restriction', { kind: ugcKind, slot: selectedSlot });
      showToast(
        'success',
        $_('ugc_editor.toast.lan_restriction_cleared', { values: { slot: selectedSlot } }),
      );
    } catch (e) {
      showToast('error', errorMessage(e));
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

    <UgcSidecarBar bind:busy />

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
            <UgcSlotList {rows} kind={ugcKind} {sidecar} {selectedSlot} onSelect={selectRow} />
          </div>

          <div data-tutorial="ugc-editor">
            {#if selectedSlot === null}
              <p class="text-sm text-content-muted">{$_('ugc_editor.editor.pick_item')}</p>
            {:else}
              <UgcSlotEditor
                {busy}
                bind:editedName
                {currentName}
                {currentPreview}
                {tx}
                {selectedHasThumb}
                {selectedIsEdited}
                hasLanRestriction={selectedHasLanRestriction}
                bind:regenerateThumb
                sidecarMissing={sidecarOrigin() === 'none'}
                onApplyRename={applyRename}
                onPickPng={() => pngInput?.click()}
                onLoadFile={(file) => void tx.loadFile(file)}
                onApplyReplace={applyReplace}
                onExportPng={exportSelectedAsPng}
                onRevertSelected={revertSelected}
                onClearLanRestriction={clearLan}
              />
            {/if}
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <input
    bind:this={pngInput}
    type="file"
    class="hidden"
    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
    onchange={onPngPicked}
  />
</div>
