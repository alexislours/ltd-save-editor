<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { track } from '$lib/analytics';
  import Card from '$lib/ui/Card.svelte';
  import SaveBar from '$lib/saveFile/SaveBar.svelte';
  import SubTabs from '$lib/ui/SubTabs.svelte';
  import Tutorial from '$lib/tutorial/Tutorial.svelte';
  import { downloadBytes } from '$lib/sav/download';
  import { errorMessage } from '$lib/errorMessage';
  import { getSave } from '$lib/saveFile/saveFile.svelte';
  import {
    playerAccessor,
    playerState,
    syncFromSave as syncPlayerFromSave,
  } from '$lib/player/playerEditor.svelte';
  import {
    miiAccessor,
    miiState,
    syncFromSave as syncMiiFromSave,
  } from '$lib/mii/miiEditor.svelte';
  import { UGC_KINDS, buildSidecarZip, extractMii, extractUgc, type UgcKind } from './index';
  import {
    getSidecarStore,
    pendingSidecarCount,
    pendingSidecarFiles,
  } from './sidecar/sidecarStore.svelte';
  import {
    buildMiiRows,
    buildUgcRows,
    collectExportEntries,
    commitImportWrites,
    expandImportFile,
    formatFailureList,
    runImport,
    type ImportFailure,
    type Row,
  } from './shareMiiPage';
  import ShareMiiSidecarBar from './ShareMiiSidecarBar.svelte';
  import ShareMiiSlotsSection from './ShareMiiSlotsSection.svelte';

  type Kind = 'Mii' | UgcKind;

  let activeKind = $state<Kind>('Mii');
  let toast = $state<{ kind: 'info' | 'warn' | 'error'; text: string } | null>(null);
  let importOpen = $state(false);
  let importFile = $state<File | null>(null);
  let importSlot = $state<number | null>(null);
  let working = $state(false);

  const playerSave = $derived(getSave('player'));
  const miiSave = $derived(getSave('mii'));
  const playerAcc = $derived(playerAccessor());
  const miiAcc = $derived(miiAccessor());
  const playerSaves = $derived(playerAcc ? { player: playerAcc } : null);
  const miiSaves = $derived(playerAcc && miiAcc ? { player: playerAcc, mii: miiAcc } : null);
  const isMii = $derived(activeKind === 'Mii');
  const haveSaves = $derived(!!playerSave && (!isMii || !!miiSave));

  $effect(() => {
    void playerSave;
    syncPlayerFromSave();
  });
  $effect(() => {
    void miiSave;
    syncMiiFromSave();
  });

  const kindTabs = $derived([
    { value: 'Mii' as Kind, label: $_('sharemii.kind.Mii') },
    ...UGC_KINDS.map((k) => ({ value: k as Kind, label: $_(`sharemii.kind.${k}`) })),
  ]);

  const sidecar = $derived(getSidecarStore());

  const rowLabels = $derived({
    inProgressMii: $_('sharemii.list.in_progress_mii'),
    miiDefault: (slot: number) => $_('sharemii.list.mii_default_name', { values: { slot } }),
    addNew: $_('sharemii.list.add_new_slot'),
    slotDefault: (slot: number) => $_('sharemii.list.slot_default_name', { values: { slot } }),
  });

  const rowsResult = $derived.by(() => {
    void playerState.dirty;
    void miiState.dirty;
    if (isMii) return buildMiiRows(miiSaves, rowLabels);
    return buildUgcRows(playerSaves, activeKind as UgcKind, sidecar, rowLabels);
  });

  const rows = $derived(rowsResult.rows);
  const rowsError = $derived(rowsResult.error);
  const populatedRows = $derived(rows.filter((r) => !r.isAddNew));
  const addNewRow = $derived(rows.find((r) => r.isAddNew) ?? null);

  $effect(() => {
    if (rowsError) console.error('ShareMii: failed to read save', rowsError);
  });

  $effect(() => {
    void activeKind;
    importOpen = false;
    importFile = null;
    importSlot = null;
  });

  $effect(() => {
    if (!importOpen) return;
    if (importSlot !== null && rows.some((r) => r.slot === importSlot)) return;
    if (addNewRow) {
      importSlot = addNewRow.slot;
      return;
    }
    importSlot = rows[0]?.slot ?? null;
  });

  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  function setToast(kind: 'info' | 'warn' | 'error', text: string): void {
    toast = { kind, text };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = null), kind === 'error' ? 8000 : 5000);
  }

  function exportRow(row: Row): void {
    if (working || row.isAddNew) return;
    working = true;
    try {
      if (isMii) {
        const r = extractMii({ player: playerAccessor()!, mii: miiAccessor()! }, row.slot, sidecar);
        downloadBytes(r.bytes, r.fileName);
        track('sharemii_export', { kind: 'Mii', mode: 'single', count: 1 });
        setToast(
          'info',
          r.facepaint.length > 0
            ? $_('sharemii.toast.exported_mii_with_facepaint', {
                values: { name: r.miiName, fileName: r.fileName },
              })
            : $_('sharemii.toast.exported_mii', {
                values: { name: r.miiName, fileName: r.fileName },
              }),
        );
      } else {
        if (sidecar.origin === 'none') {
          setToast('warn', $_('sharemii.toast.ugc_needs_folder'));
          return;
        }
        const r = extractUgc(
          { player: playerAccessor()! },
          row.slot,
          activeKind as UgcKind,
          sidecar,
        );
        downloadBytes(r.bytes, r.fileName);
        track('sharemii_export', { kind: activeKind as UgcKind, mode: 'single', count: 1 });
        setToast(
          'info',
          $_('sharemii.toast.exported_ugc', {
            values: { name: r.itemName, fileName: r.fileName },
          }),
        );
      }
    } catch (e) {
      setToast('error', errorMessage(e));
    } finally {
      working = false;
    }
  }

  function exportAll(): void {
    if (working) return;
    working = true;
    try {
      if (!isMii && sidecar.origin === 'none') {
        setToast('warn', $_('sharemii.toast.ugc_needs_folder_short'));
        return;
      }
      const ctx = isMii
        ? ({
            kind: 'Mii',
            saves: { player: playerAccessor()!, mii: miiAccessor()! },
          } as const)
        : ({
            kind: activeKind as UgcKind,
            saves: { player: playerAccessor()! },
          } as const);
      const dir = collectExportEntries(ctx, populatedRows, sidecar);
      if (dir.length === 0) {
        setToast('warn', $_('sharemii.toast.nothing_to_export'));
        return;
      }
      const zipName = isMii ? 'miis.zip' : `${activeKind.toLowerCase()}-items.zip`;
      downloadBytes(buildSidecarZip(dir), zipName);
      track('sharemii_export', { kind: ctx.kind, mode: 'all', count: dir.length });
      setToast(
        'info',
        $_('sharemii.toast.exported_count', { values: { count: dir.length, fileName: zipName } }),
      );
    } catch (e) {
      setToast('error', errorMessage(e));
    } finally {
      working = false;
    }
  }

  function openImportFor(slot: number | null): void {
    importOpen = true;
    if (slot !== null) importSlot = slot;
  }

  function closeImport(): void {
    importOpen = false;
    importFile = null;
  }

  function failuresMessage(failures: ImportFailure[]): string {
    return $_('sharemii.toast.import_all_failed', {
      values: { failed: failures.length, list: formatFailureList(failures) },
    });
  }

  async function applyImport(): Promise<void> {
    if (working || !importFile || importSlot === null) return;
    working = true;
    const fromZip = importFile.name.toLowerCase().endsWith('.zip');
    const targetRow = rows.find((row) => row.slot === importSlot);
    const importMode: 'replace' | 'add' = targetRow?.isAddNew ? 'add' : 'replace';
    const importKind: 'Mii' | UgcKind = isMii ? 'Mii' : (activeKind as UgcKind);
    try {
      if (isMii && !miiSave) {
        setToast('error', $_('sharemii.toast.mii_sav_required'));
        return;
      }
      const files = await expandImportFile(importFile);
      if (files.length === 0) {
        setToast('warn', $_('sharemii.toast.no_ltd_found'));
        return;
      }
      if (isMii && !miiSaves) throw new Error('save_not_ready');
      if (!isMii && !playerSaves) throw new Error('save_not_ready');

      const { count, failures, writes } = isMii
        ? runImport(
            { kind: 'Mii', saves: miiSaves!, slot: importSlot, sidecar },
            files,
            errorMessage,
          )
        : runImport(
            {
              kind: activeKind as UgcKind,
              saves: playerSaves!,
              slot: importSlot,
              isAdding: !!targetRow?.isAddNew,
              sidecar,
            },
            files,
            errorMessage,
          );

      track('sharemii_import', {
        kind: importKind,
        mode: importMode,
        from_zip: fromZip,
        count,
        failed: failures.length,
      });

      if (count === 0) {
        setToast('error', failuresMessage(failures));
        return;
      }

      commitImportWrites(writes);

      if (failures.length > 0) {
        setToast(
          'warn',
          $_('sharemii.toast.imported_partial', {
            values: { count, failed: failures.length, list: formatFailureList(failures) },
          }),
        );
      } else if (writes.length > 0) {
        setToast(
          'info',
          $_('sharemii.toast.imported_count_with_writes', {
            values: { count, writes: writes.length },
          }),
        );
      } else {
        setToast('info', $_('sharemii.toast.imported_count', { values: { count } }));
      }
      closeImport();
    } catch (e) {
      setToast('error', errorMessage(e));
    } finally {
      working = false;
    }
  }

  function downloadPendingUgc(): void {
    const files = pendingSidecarFiles();
    if (files.length === 0) return;
    downloadBytes(buildSidecarZip(files), 'ShareMii-sidecar-updates.zip');
    track('sharemii_pending_downloaded', { count: files.length });
    setToast('info', $_('sharemii.toast.downloaded_pending', { values: { count: files.length } }));
  }
</script>

<div class="grid grid-cols-1 gap-6">
  <header class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h2 class="text-2xl font-bold tracking-tight text-content-strong">
        {$_('sharemii.title')}
      </h2>
      <p class="mt-1 text-sm text-content">
        {$_('sharemii.description_prefix')}<a
          class="underline"
          href="https://github.com/Star-F0rce/ShareMii"
          target="_blank"
          rel="noreferrer noopener">{$_('sharemii.description_link')}</a
        >{$_('sharemii.description_suffix')}
      </p>
    </div>
    <Tutorial />
  </header>

  {#if !playerSave}
    <Card>
      <p class="text-sm text-content">
        {$_('sharemii.needs_player', {
          values: { playerSav: 'Player.sav', miiSav: 'Mii.sav', ugcFolder: 'Ugc/' },
        })}
      </p>
    </Card>
  {:else}
    {#if pendingSidecarCount() > 0}
      <SaveBar
        dirty={true}
        actionLabel={$_('sharemii.save_bar.download_pending', {
          values: { count: pendingSidecarCount() },
        })}
        onAction={downloadPendingUgc}
      />
    {:else}
      <SaveBar dirty={false} />
    {/if}

    <ShareMiiSidecarBar {working} onMessage={setToast} />

    <SubTabs tabs={kindTabs} bind:value={activeKind} label={$_('sharemii.kind_tabs_label')} />

    {#if isMii && !miiSave}
      <Card>
        <p class="text-sm text-content">
          {$_('sharemii.needs_mii', { values: { miiSav: 'Mii.sav' } })}
        </p>
      </Card>
    {:else if haveSaves}
      <ShareMiiSlotsSection
        {isMii}
        {activeKind}
        {working}
        {rows}
        {populatedRows}
        {addNewRow}
        {rowsError}
        sidecarMissing={sidecar.origin === 'none'}
        {importOpen}
        bind:importFile
        bind:importSlot
        onExportAll={exportAll}
        onOpenImport={openImportFor}
        onCancelImport={closeImport}
        onApplyImport={applyImport}
        onExportRow={exportRow}
      />
    {/if}
  {/if}

  {#if toast}
    <div
      role="status"
      class={[
        'rounded-xl px-4 py-3 text-sm shadow-sm ring-1',
        toast.kind === 'error' && 'bg-danger-bg text-danger ring-danger-edge',
        toast.kind === 'warn' && 'bg-surface-muted text-warn ring-edge/60',
        toast.kind === 'info' && 'bg-surface-muted text-content-strong ring-edge/60',
      ]}
    >
      {toast.text}
    </div>
  {/if}
</div>
