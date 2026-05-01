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
  import { downloadModified, markDirty, miiState, syncFromSave } from '../lib/mii/miiEditor.svelte';
  import { _ } from 'svelte-i18n';
  import { getSave } from '../lib/saveFile.svelte';

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
    {/if}
  </SaveTab>
</AppLayout>
