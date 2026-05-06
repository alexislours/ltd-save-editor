<script lang="ts">
  import { untrack } from 'svelte';
  import { _ } from 'svelte-i18n';
  import AdvancedPanel from '$lib/advanced/AdvancedPanel.svelte';
  import { track } from '$lib/analytics';
  import { errorMessage } from '$lib/errorMessage';
  import RouteMeta from '$lib/layout/RouteMeta.svelte';
  import BuildingsPanel from '$lib/player/inventory/BuildingsPanel.svelte';
  import ClothesPanel from '$lib/player/inventory/ClothesPanel.svelte';
  import ClothingSetsPanel from '$lib/player/inventory/ClothingSetsPanel.svelte';
  import FoodsPanel from '$lib/player/inventory/FoodsPanel.svelte';
  import InteriorsPanel from '$lib/player/inventory/InteriorsPanel.svelte';
  import Profile from '$lib/player/profile/Profile.svelte';
  import TreasuresPanel from '$lib/player/inventory/TreasuresPanel.svelte';
  import UgcTextPanel from '$lib/player/UgcTextPanel.svelte';
  import {
    commitEntryEdit,
    downloadModified,
    playerState,
    syncFromSave,
  } from '$lib/player/playerEditor.svelte';
  import SaveBar from '$lib/saveFile/SaveBar.svelte';
  import SaveTab from '$lib/saveFile/SaveTab.svelte';
  import { getEntriesForAdvanced, getSave } from '$lib/saveFile/saveFile.svelte';
  import SubTabs from '$lib/ui/SubTabs.svelte';
  import { showToast } from '$lib/toast/toast.svelte';

  const save = $derived(getSave('player'));
  $effect(() => {
    void save;
    syncFromSave();
  });

  const advancedEntries = $derived.by(() => {
    void playerState.loadId;
    return untrack(() => getEntriesForAdvanced('player'));
  });

  type SubTab =
    | 'profile'
    | 'foods'
    | 'clothes'
    | 'clothing_sets'
    | 'treasures'
    | 'interiors'
    | 'buildings'
    | 'ugc'
    | 'advanced';
  let subTab = $state<SubTab>('profile');

  const SUB_TABS: { value: SubTab; label: string }[] = $derived([
    { value: 'profile', label: $_('player.subtab_profile') },
    { value: 'foods', label: $_('player.subtab_foods') },
    { value: 'clothes', label: $_('player.subtab_clothes') },
    { value: 'clothing_sets', label: $_('player.subtab_clothing_sets') },
    { value: 'treasures', label: $_('player.subtab_treasures') },
    { value: 'interiors', label: $_('player.subtab_interiors') },
    { value: 'buildings', label: $_('player.subtab_buildings') },
    { value: 'ugc', label: $_('player.subtab_ugc') },
    { value: 'advanced', label: $_('tab.advanced') },
  ]);

  function download(): void {
    try {
      downloadModified();
    } catch (e) {
      track('export_failed', { kind: 'player' });
      showToast('error', errorMessage(e));
    }
  }
</script>

<RouteMeta title="Player save - LTD Save Editor" />

<SaveTab
  kind="player"
  title={$_('player.title')}
  description={$_('player.description')}
  error={playerState.error}
  ready={playerState.decoded != null}
>
  {#if playerState.decoded}
    <SaveBar
      dirty={playerState.dirty}
      actionLabel={$_('player.download_action')}
      onAction={download}
    />

    <SubTabs tabs={SUB_TABS} bind:value={subTab} label={$_('player.sections_label')} />

    {#if subTab === 'profile'}
      <Profile />
    {:else if subTab === 'foods'}
      <FoodsPanel />
    {:else if subTab === 'clothes'}
      <ClothesPanel />
    {:else if subTab === 'clothing_sets'}
      <ClothingSetsPanel />
    {:else if subTab === 'treasures'}
      <TreasuresPanel />
    {:else if subTab === 'interiors'}
      <InteriorsPanel />
    {:else if subTab === 'buildings'}
      <BuildingsPanel />
    {:else if subTab === 'ugc'}
      <UgcTextPanel />
    {:else}
      <AdvancedPanel
        entries={advancedEntries}
        onCommit={commitEntryEdit}
        parseSignal={playerState.loadId}
      />
    {/if}
  {/if}
</SaveTab>
