<script lang="ts">
  import AdvancedPanel from '../lib/advanced/AdvancedPanel.svelte';
  import AppLayout from '../lib/AppLayout.svelte';
  import SaveBar from '../lib/SaveBar.svelte';
  import SaveTab from '../lib/SaveTab.svelte';
  import SubTabs from '../lib/SubTabs.svelte';
  import MiiBelongingsPanel from '../lib/mii/MiiBelongingsPanel.svelte';
  import MiiHabitPanel from '../lib/mii/MiiHabitPanel.svelte';
  import MiiPanel from '../lib/mii/MiiPanel.svelte';
  import MiiRelationsGraph from '../lib/mii/MiiRelationsGraph.svelte';
  import MiiTroublePanel from '../lib/mii/MiiTroublePanel.svelte';
  import {
    buildMiiExport,
    buildMiiExportFile,
    exportTimestamp,
    type MiiExportFormat,
  } from '../lib/mii/export';
  import { downloadModified, markDirty, miiState, syncFromSave } from '../lib/mii/miiEditor.svelte';
  import { _ } from 'svelte-i18n';
  import { track } from '../lib/analytics';
  import { downloadText } from '../lib/sav/download';
  import { expectedFileName, getSave } from '../lib/saveFile.svelte';
  import { PILL_BUTTON_CLASS } from '../lib/styles';

  const save = $derived(getSave('mii'));
  $effect(() => {
    void save;
    syncFromSave();
  });

  type SubTab = 'profile' | 'relationships' | 'belongings' | 'troubles' | 'habits' | 'advanced';
  let subTab = $state<SubTab>('profile');

  let selectedIndex = $state<number | null>(null);

  const SUB_TABS: { value: SubTab; label: string }[] = $derived([
    { value: 'profile', label: $_('mii.subtab_profile') },
    { value: 'relationships', label: $_('mii.subtab_relationships') },
    { value: 'belongings', label: $_('mii.subtab_belongings') },
    { value: 'troubles', label: $_('mii.subtab_troubles') },
    { value: 'habits', label: $_('mii.subtab_habits') },
    { value: 'advanced', label: $_('tab.advanced') },
  ]);

  function download(): void {
    try {
      downloadModified();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function exportData(format: MiiExportFormat): void {
    if (!miiState.parsed) return;
    try {
      const data = buildMiiExport(miiState.parsed.entries, {
        appVersion: __APP_VERSION__,
        saveFile: expectedFileName.mii,
      });
      const file = buildMiiExportFile(data, format, exportTimestamp());
      downloadText(file.content, file.filename, file.mime);
      track('export_mii_data', { format, mii_count: data.miis.length });
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }
</script>

<AppLayout>
  <SaveTab
    kind="mii"
    title={$_('mii.title')}
    description={$_('mii.description')}
    error={miiState.error}
    ready={miiState.parsed != null}
  >
    {#if miiState.parsed}
      {@const parsed = miiState.parsed}

      <SaveBar dirty={miiState.dirty} actionLabel={$_('mii.download_action')} onAction={download} />

      <SubTabs tabs={SUB_TABS} bind:value={subTab} label={$_('mii.sections_label')} />

      {#if subTab === 'profile'}
        <MiiPanel entries={parsed.entries} bind:selectedIndex />
      {:else if subTab === 'relationships'}
        <MiiRelationsGraph
          entries={parsed.entries}
          {selectedIndex}
          onSelect={(i) => (selectedIndex = i)}
        />
      {:else if subTab === 'belongings'}
        <MiiBelongingsPanel entries={parsed.entries} bind:selectedIndex />
      {:else if subTab === 'troubles'}
        <MiiTroublePanel entries={parsed.entries} bind:selectedIndex />
      {:else if subTab === 'habits'}
        <MiiHabitPanel entries={parsed.entries} bind:selectedIndex />
      {:else}
        <AdvancedPanel entries={parsed.entries} {markDirty} parseSignal={miiState.parsed} />
      {/if}

      <details class="group rounded-md border border-edge/60 bg-surface-muted px-3 py-2.5">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-3 select-none"
        >
          <span class="text-sm font-bold text-content">{$_('mii.export.summary')}</span>
          <span class="shrink-0 text-xs font-normal text-content-muted">
            <span class="group-open:hidden">{$_('mii.export.show')}</span>
            <span class="hidden group-open:inline">{$_('mii.export.hide')}</span>
          </span>
        </summary>
        <p class="mt-2 text-xs text-content-muted">{$_('mii.export.description')}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class={PILL_BUTTON_CLASS} onclick={() => exportData('json')}>
            {$_('mii.export.json')}
          </button>
          <button type="button" class={PILL_BUTTON_CLASS} onclick={() => exportData('miis-csv')}>
            {$_('mii.export.miis_csv')}
          </button>
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            onclick={() => exportData('relationships-csv')}
          >
            {$_('mii.export.relationships_csv')}
          </button>
        </div>
      </details>
    {/if}
  </SaveTab>
</AppLayout>
