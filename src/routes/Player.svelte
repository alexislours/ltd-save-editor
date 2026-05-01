<script lang="ts">
  import { _ } from 'svelte-i18n';
  import AdvancedPanel from '../lib/advanced/AdvancedPanel.svelte';
  import AppLayout from '../lib/AppLayout.svelte';
  import BuildingsPanel from '../lib/player/BuildingsPanel.svelte';
  import ClothesPanel from '../lib/player/ClothesPanel.svelte';
  import ClothingSetsPanel from '../lib/player/ClothingSetsPanel.svelte';
  import FoodsPanel from '../lib/player/FoodsPanel.svelte';
  import InteriorsPanel from '../lib/player/InteriorsPanel.svelte';
  import Profile from '../lib/player/Profile.svelte';
  import TreasuresPanel from '../lib/player/TreasuresPanel.svelte';
  import UgcTextPanel from '../lib/player/UgcTextPanel.svelte';
  import {
    downloadModified,
    markDirty,
    playerState,
    syncFromSave,
  } from '../lib/playerEditor.svelte';
  import SaveBar from '../lib/SaveBar.svelte';
  import SaveTab from '../lib/SaveTab.svelte';
  import { getSave } from '../lib/saveFile.svelte';
  import SubTabs from '../lib/SubTabs.svelte';

  const save = $derived(getSave('player'));
  $effect(() => {
    void save;
    syncFromSave();
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
      alert(e instanceof Error ? e.message : String(e));
    }
  }
</script>

<AppLayout>
  <SaveTab
    kind="player"
    title={$_('player.title')}
    description={$_('player.description')}
    error={playerState.error}
    ready={playerState.parsed != null}
  >
    {#if playerState.parsed}
      {@const parsed = playerState.parsed}

      <SaveBar
        dirty={playerState.dirty}
        actionLabel={$_('player.download_action')}
        onAction={download}
      />

      <SubTabs tabs={SUB_TABS} bind:value={subTab} label={$_('player.sections_label')} />

      {#if subTab === 'profile'}
        <Profile entries={parsed.entries} />
      {:else if subTab === 'foods'}
        <FoodsPanel entries={parsed.entries} />
      {:else if subTab === 'clothes'}
        <ClothesPanel entries={parsed.entries} />
      {:else if subTab === 'clothing_sets'}
        <ClothingSetsPanel entries={parsed.entries} />
      {:else if subTab === 'treasures'}
        <TreasuresPanel entries={parsed.entries} />
      {:else if subTab === 'interiors'}
        <InteriorsPanel entries={parsed.entries} />
      {:else if subTab === 'buildings'}
        <BuildingsPanel entries={parsed.entries} />
      {:else if subTab === 'ugc'}
        <UgcTextPanel entries={parsed.entries} />
      {:else}
        <AdvancedPanel entries={parsed.entries} {markDirty} parseSignal={playerState.parsed} />
      {/if}
    {/if}
  </SaveTab>
</AppLayout>
