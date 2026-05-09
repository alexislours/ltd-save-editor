<script lang="ts">
  import { untrack } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { track } from '$lib/analytics';
  import { errorMessage } from '$lib/errorMessage';
  import AdvancedPanel from '$lib/advanced/AdvancedPanel.svelte';
  import RouteMeta from '$lib/layout/RouteMeta.svelte';
  import SaveBar from '$lib/saveFile/SaveBar.svelte';
  import SaveTab from '$lib/saveFile/SaveTab.svelte';
  import SubTabs from '$lib/ui/SubTabs.svelte';
  import { mapState, syncFromSave as syncFloorFromSave } from '$lib/map/state/mapEditor.svelte';
  import {
    objectsState,
    syncFromSave as syncObjectsFromSave,
  } from '$lib/map/state/mapObjectsEditor.svelte';
  import { commitEntryEdit, downloadMapSav, mapSave } from '$lib/map/state/mapSave.svelte';
  import { syncResidents } from '$lib/map/residents/residents.svelte';
  import { syncUgcDimensions } from '$lib/map/actors/ugcDimensions.svelte';
  import { getEntriesForAdvanced, getSave } from '$lib/saveFile/saveFile.svelte';
  import { showToast } from '$lib/toast/toast.svelte';
  import Workbench from '$lib/map/Workbench.svelte';

  const save = $derived(getSave('map'));
  const miiSave = $derived(getSave('mii'));
  $effect(() => {
    void save;
    void miiSave;
    syncFloorFromSave();
    syncObjectsFromSave();
    syncResidents();
    syncUgcDimensions();
  });

  type SubTab = 'map' | 'advanced';
  let subTab = $state<SubTab>('map');

  const SUB_TABS: { value: SubTab; label: string }[] = $derived([
    { value: 'map', label: $_('map.title') },
    { value: 'advanced', label: $_('tab.advanced') },
  ]);

  const dirty = $derived(mapSave.dirty);

  const advancedEntries = $derived.by(() => {
    void mapSave.loadId;
    return untrack(() => getEntriesForAdvanced('map'));
  });

  function download(): void {
    try {
      downloadMapSav();
    } catch (e) {
      track('export_failed', { kind: 'map' });
      showToast('error', errorMessage(e));
    }
  }
</script>

<RouteMeta title="Map save - LTD Save Editor" />

<SaveTab
  kind="map"
  title={$_('map.title')}
  description={$_('map.description')}
  error={mapState.error || objectsState.error}
  ready={mapState.ready}
>
  {#if mapState.ready}
    <SaveBar {dirty} actionLabel={$_('map.download_action')} onAction={download} />

    <SubTabs tabs={SUB_TABS} bind:value={subTab} label={$_('map.sections_label')} />

    {#if subTab === 'map'}
      <Workbench />
    {:else}
      <AdvancedPanel
        entries={advancedEntries}
        onCommit={commitEntryEdit}
        parseSignal={mapSave.loadId}
      />
    {/if}
  {/if}
</SaveTab>
