<script lang="ts">
  import { unzipSync } from 'fflate';
  import { SvelteMap } from 'svelte/reactivity';
  import { _ } from 'svelte-i18n';
  import { track } from '../analytics';
  import Card from '../Card.svelte';
  import SaveBar from '../SaveBar.svelte';
  import SubTabs from '../SubTabs.svelte';
  import { downloadBytes } from '../sav/download';
  import { errorMessage } from '../errorMessage';
  import { getSave } from '../saveFile.svelte';
  import { schedulePersist } from '../sessionPersist';
  import {
    CARD_BASE_CLASS,
    CARD_CLASS,
    LABEL_CLASS,
    PILL_BUTTON_CLASS,
    PRIMARY_BUTTON_CLASS,
    COMPACT_SELECT_CLASS,
  } from '../styles';
  import {
    UGC_KINDS,
    applyMii,
    applyUgc,
    buildSidecarZip,
    extractMii,
    extractUgc,
    listMiiSlots,
    listUgcSlots,
    sidecarFromFolderFiles,
    sidecarFromZipFile,
    type UgcKind,
  } from './index';
  import {
    clearSidecar,
    getSidecarStore,
    markPendingSidecars,
    mergeSidecarFiles,
    pendingSidecarCount,
    pendingSidecarFiles,
    sidecarFileCount,
    sidecarOrigin,
  } from './sidecarStore.svelte';

  type Kind = 'Mii' | UgcKind;

  let activeKind = $state<Kind>('Mii');
  let toast = $state<{ kind: 'info' | 'warn' | 'error'; text: string } | null>(null);
  let importOpen = $state(false);
  let importFile = $state<File | null>(null);
  let importSlot = $state<number | null>(null);
  let working = $state(false);
  let folderInput = $state<HTMLInputElement | null>(null);
  let zipInput = $state<HTMLInputElement | null>(null);

  const playerSave = $derived(getSave('player'));
  const miiSave = $derived(getSave('mii'));
  const isMii = $derived(activeKind === 'Mii');
  const haveSaves = $derived(!!playerSave && (!isMii || !!miiSave));

  const kindTabs = $derived([
    { value: 'Mii' as Kind, label: $_('sharemii.kind.Mii') },
    ...UGC_KINDS.map((k) => ({ value: k as Kind, label: $_(`sharemii.kind.${k}`) })),
  ]);

  type Row = {
    slot: number;
    name: string;
    isTemp?: boolean;
    isAddNew?: boolean;
    empty?: boolean;
  };

  const sidecar = $derived(getSidecarStore());

  const rowsResult = $derived.by<{ rows: Row[]; error: unknown }>(() => {
    if (!playerSave?.parsed) return { rows: [], error: null };
    if (isMii) {
      if (!miiSave?.parsed) return { rows: [], error: null };
      try {
        const list = listMiiSlots(playerSave.parsed, miiSave.parsed);
        const rows = list
          .filter((s) => s.slot === 0 || !s.empty)
          .map<Row>((s) => ({
            slot: s.slot,
            name:
              s.slot === 0
                ? $_('sharemii.list.in_progress_mii')
                : s.name || $_('sharemii.list.mii_default_name', { values: { slot: s.slot } }),
            isTemp: s.slot === 0,
          }));
        return { rows, error: null };
      } catch (e) {
        return { rows: [], error: e };
      }
    }
    try {
      const rows = listUgcSlots(playerSave.parsed, activeKind as UgcKind, sidecar).map<Row>(
        (s) => ({
          slot: s.slot,
          name: s.isAddNew
            ? $_('sharemii.list.add_new_slot')
            : s.name || $_('sharemii.list.slot_default_name', { values: { slot: s.slot } }),
          isAddNew: s.isAddNew,
          empty: s.empty,
        }),
      );
      return { rows, error: null };
    } catch (e) {
      return { rows: [], error: e };
    }
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

  async function pickFolder(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    target.value = '';
    if (files.length === 0) return;
    try {
      const src = await sidecarFromFolderFiles(files);
      mergeSidecarFiles('folder', src.files);
      track('sharemii_inbound', { source: 'folder', count: src.files.size });
      setToast(
        'info',
        $_('sharemii.sidecar.loaded_from_folder', { values: { count: src.files.size } }),
      );
    } catch (e) {
      setToast('error', errorMessage(e));
    }
  }

  async function pickZip(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    try {
      const src = await sidecarFromZipFile(file);
      mergeSidecarFiles('zip', src.files);
      track('sharemii_inbound', { source: 'zip', count: src.files.size });
      setToast(
        'info',
        $_('sharemii.sidecar.loaded_from_zip', { values: { count: src.files.size } }),
      );
    } catch (e) {
      setToast('error', errorMessage(e));
    }
  }

  function exportRow(row: Row): void {
    if (working) return;
    if (row.isAddNew) return;
    working = true;
    try {
      if (isMii) {
        const r = extractMii(playerSave!.parsed!, miiSave!.parsed!, row.slot, sidecar);
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
        const r = extractUgc(playerSave!.parsed!, row.slot, activeKind as UgcKind, sidecar);
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

  async function exportAll(): Promise<void> {
    if (working) return;
    working = true;
    try {
      const dir: { name: string; bytes: Uint8Array }[] = [];
      if (isMii) {
        for (const r of populatedRows) {
          if (r.isTemp) continue;
          try {
            const out = extractMii(playerSave!.parsed!, miiSave!.parsed!, r.slot, sidecar);
            dir.push({ name: out.fileName, bytes: out.bytes });
          } catch (e) {
            console.warn('skip slot', r.slot, e);
          }
        }
      } else {
        if (sidecar.origin === 'none') {
          setToast('warn', $_('sharemii.toast.ugc_needs_folder_short'));
          return;
        }
        for (const r of populatedRows) {
          try {
            const out = extractUgc(playerSave!.parsed!, r.slot, activeKind as UgcKind, sidecar);
            dir.push({ name: out.fileName, bytes: out.bytes });
          } catch (e) {
            console.warn('skip slot', r.slot, e);
          }
        }
      }
      if (dir.length === 0) {
        setToast('warn', $_('sharemii.toast.nothing_to_export'));
        return;
      }
      const zipName = isMii ? 'miis.zip' : `${activeKind.toLowerCase()}-items.zip`;
      downloadBytes(buildSidecarZip(dir), zipName);
      track('sharemii_export', {
        kind: isMii ? 'Mii' : (activeKind as UgcKind),
        mode: 'all',
        count: dir.length,
      });
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

  function handleImportFile(event: Event): void {
    const target = event.target as HTMLInputElement;
    importFile = target.files?.[0] ?? null;
  }

  async function readBytes(file: File): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer());
  }

  async function expandImportFile(file: File): Promise<{ name: string; bytes: Uint8Array }[]> {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return [{ name: file.name, bytes: await readBytes(file) }];
    }
    const buf = await readBytes(file);
    const entries = unzipSync(buf);
    const out: { name: string; bytes: Uint8Array }[] = [];
    for (const [name, bytes] of Object.entries(entries)) {
      if (/\.(ltd|ltdf|ltdc|ltdg|ltdi|ltde|ltdo|ltdl)$/i.test(name)) {
        out.push({ name: name.split('/').pop() ?? name, bytes: bytes as Uint8Array });
      }
    }
    return out;
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
      const player = playerSave!.parsed!;
      const mii = miiSave?.parsed ?? null;
      const writes: { name: string; bytes: Uint8Array }[] = [];
      const failures: { fileName: string; reason: string }[] = [];
      let count = 0;

      for (const f of files) {
        try {
          if (isMii) {
            const r = applyMii(player, mii!, importSlot, f.bytes, sidecar);
            writes.push(...r.facepaintWrites);
          } else {
            const isAdding = !!targetRow?.isAddNew;
            const r = applyUgc(
              player,
              importSlot,
              activeKind as UgcKind,
              f.bytes,
              isAdding,
              sidecar,
            );
            writes.push(...r.textureWrites);
          }
          count++;
        } catch (e) {
          failures.push({ fileName: f.name, reason: errorMessage(e) });
          console.warn('ShareMii import failed', f.name, e);
        }
      }

      track('sharemii_import', {
        kind: importKind,
        mode: importMode,
        from_zip: fromZip,
        count,
        failed: failures.length,
      });

      if (count === 0) {
        setToast('error', formatFailures(failures));
        return;
      }

      schedulePersist('player');
      if (isMii) schedulePersist('mii');

      if (writes.length > 0) {
        const fresh = new SvelteMap<string, Uint8Array>();
        for (const w of writes) fresh.set(w.name, w.bytes);
        mergeSidecarFiles(
          sidecarOrigin() === 'none' ? 'folder' : (sidecarOrigin() as 'folder' | 'zip' | 'bulk'),
          fresh,
        );
        markPendingSidecars(fresh);
      }

      if (failures.length > 0) {
        setToast(
          'warn',
          $_('sharemii.toast.imported_partial', {
            values: {
              count,
              failed: failures.length,
              list: formatFailureList(failures),
            },
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

  function formatFailureList(failures: { fileName: string; reason: string }[]): string {
    return failures.map((f) => `${f.fileName}: ${f.reason}`).join('; ');
  }

  function formatFailures(failures: { fileName: string; reason: string }[]): string {
    return $_('sharemii.toast.import_all_failed', {
      values: { failed: failures.length, list: formatFailureList(failures) },
    });
  }

  function downloadPendingUgc(): void {
    const files = pendingSidecarFiles();
    if (files.length === 0) return;
    downloadBytes(buildSidecarZip(files), 'ShareMii-sidecar-updates.zip');
    track('sharemii_pending_downloaded', { count: files.length });
    setToast('info', $_('sharemii.toast.downloaded_pending', { values: { count: files.length } }));
  }

  const sidecarLabel = $derived.by(() => {
    const o = sidecarOrigin();
    if (o === 'none') return $_('sharemii.sidecar.none_loaded');
    const source = o === 'bulk' ? 'auto' : o;
    return $_('sharemii.sidecar.loaded_summary', {
      values: { count: sidecarFileCount(), source },
    });
  });
</script>

<div class="grid grid-cols-1 gap-6">
  <header>
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
        <span class="text-xs text-content-muted">
          {$_('sharemii.sidecar.hint')}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => folderInput?.click()}
          disabled={working}>{$_('sharemii.sidecar.pick_folder')}</button
        >
        <button
          type="button"
          class={PILL_BUTTON_CLASS}
          onclick={() => zipInput?.click()}
          disabled={working}>{$_('sharemii.sidecar.pick_zip')}</button
        >
        {#if sidecarOrigin() !== 'none'}
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            onclick={() => {
              clearSidecar();
              track('sharemii_sidecar_cleared', {});
            }}
          >
            {$_('sharemii.sidecar.clear')}
          </button>
        {/if}
      </div>
    </section>

    <SubTabs tabs={kindTabs} bind:value={activeKind} label={$_('sharemii.kind_tabs_label')} />

    {#if isMii && !miiSave}
      <Card>
        <p class="text-sm text-content">
          {$_('sharemii.needs_mii', { values: { miiSav: 'Mii.sav' } })}
        </p>
      </Card>
    {:else if haveSaves}
      <section class={CARD_CLASS}>
        <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-bold text-content-strong">
              {isMii ? $_('sharemii.kind.Mii') : $_(`sharemii.kind.${activeKind}`)}
            </h3>
            <p class="mt-0.5 text-xs text-content-muted">
              {$_('sharemii.list.header_count', { values: { count: populatedRows.length } })}
              {#if !isMii && addNewRow}
                · {$_('sharemii.list.header_add_new', { values: { slot: addNewRow.slot } })}
              {/if}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class={PILL_BUTTON_CLASS}
              onclick={exportAll}
              disabled={working ||
                populatedRows.length === 0 ||
                (!isMii && sidecar.origin === 'none')}
            >
              {$_('sharemii.list.export_all')}
            </button>
            <button
              type="button"
              class={PRIMARY_BUTTON_CLASS}
              onclick={() => openImportFor(addNewRow?.slot ?? populatedRows[0]?.slot ?? null)}
              disabled={working}
            >
              {$_('sharemii.list.import')}
            </button>
          </div>
        </header>

        {#if importOpen}
          <div class="mb-4 rounded-xl bg-surface-sunken p-3 sm:p-4 ring-1 ring-edge/40">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="block">
                <span class={LABEL_CLASS}>{$_('sharemii.import.file_label')}</span>
                <input
                  type="file"
                  accept=".ltd,.ltdf,.ltdc,.ltdg,.ltdi,.ltde,.ltdo,.ltdl,.zip"
                  class={COMPACT_SELECT_CLASS + ' w-full'}
                  onchange={handleImportFile}
                />
                {#if importFile}
                  <span class="mt-1 block truncate font-mono text-xs text-content-muted"
                    >{importFile.name}</span
                  >
                {/if}
              </label>
              <label class="block">
                <span class={LABEL_CLASS}>{$_('sharemii.import.target_label')}</span>
                <select class={COMPACT_SELECT_CLASS + ' w-full'} bind:value={importSlot}>
                  {#each rows as r (r.slot)}
                    <option value={r.slot}>
                      {#if r.isAddNew}
                        {$_('sharemii.import.option_add_new', { values: { slot: r.slot } })}
                      {:else if r.isTemp}
                        {$_('sharemii.import.option_in_progress')}
                      {:else}
                        {$_('sharemii.import.option_slot', {
                          values: { slot: r.slot, name: r.name },
                        })}
                      {/if}
                    </option>
                  {/each}
                </select>
              </label>
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                class={PILL_BUTTON_CLASS}
                onclick={closeImport}
                disabled={working}>{$_('sharemii.import.cancel')}</button
              >
              <button
                type="button"
                class={PRIMARY_BUTTON_CLASS}
                onclick={applyImport}
                disabled={working || !importFile || importSlot === null}
              >
                {working ? $_('sharemii.import.applying') : $_('sharemii.import.apply')}
              </button>
            </div>
          </div>
        {/if}

        {#if rowsError}
          <p
            role="alert"
            class="rounded-lg border border-danger-edge bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            {$_('sharemii.list.read_failed', { values: { error: errorMessage(rowsError) } })}
          </p>
        {:else if rows.length === 0}
          <p class="text-sm text-content-muted">{$_('sharemii.list.no_slots')}</p>
        {:else}
          <ul class="divide-y divide-edge/40">
            {#each rows as r (r.slot)}
              <li class="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                <span
                  class="shrink-0 basis-12 font-mono text-xs text-content-muted"
                  aria-hidden="true"
                >
                  {r.isTemp
                    ? $_('sharemii.list.row_temp_marker')
                    : $_('sharemii.list.row_slot_marker', { values: { slot: r.slot } })}
                </span>
                <span
                  class={[
                    'min-w-0 flex-1 basis-40 truncate text-sm',
                    r.isAddNew ? 'italic text-content-muted' : 'text-content-strong',
                  ]}
                >
                  {r.name}
                </span>
                <div class="flex shrink-0 basis-full flex-wrap items-center gap-1.5 sm:basis-auto">
                  {#if r.isAddNew}
                    <button
                      type="button"
                      class={PILL_BUTTON_CLASS}
                      onclick={() => openImportFor(r.slot)}
                      disabled={working}
                    >
                      {$_('sharemii.list.add_here')}
                    </button>
                  {:else}
                    <button
                      type="button"
                      class={PILL_BUTTON_CLASS}
                      onclick={() => exportRow(r)}
                      disabled={working || (!isMii && sidecar.origin === 'none')}
                    >
                      {$_('sharemii.list.export')}
                    </button>
                    <button
                      type="button"
                      class={PILL_BUTTON_CLASS}
                      onclick={() => openImportFor(r.slot)}
                      disabled={working}
                    >
                      {$_('sharemii.list.replace')}
                    </button>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
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

  <input
    bind:this={folderInput}
    type="file"
    class="hidden"
    multiple
    webkitdirectory
    onchange={pickFolder}
  />
  <input bind:this={zipInput} type="file" class="hidden" accept=".zip" onchange={pickZip} />
</div>
