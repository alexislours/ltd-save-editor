<script lang="ts">
  import AdvancedPanel from '../lib/advanced/AdvancedPanel.svelte';
  import AppLayout from '../lib/AppLayout.svelte';
  import SaveBar from '../lib/SaveBar.svelte';
  import SaveTab from '../lib/SaveTab.svelte';
  import SubTabs from '../lib/SubTabs.svelte';
  import MiiPanel from '../lib/mii/MiiPanel.svelte';
  import MiiRelationsGraph from '../lib/mii/MiiRelationsGraph.svelte';
  import { downloadModified, markDirty, miiState, syncFromSave } from '../lib/mii/miiEditor.svelte';
  import { getSave } from '../lib/saveFile.svelte';

  const save = $derived(getSave('mii'));
  $effect(() => {
    void save;
    syncFromSave();
  });

  type SubTab = 'profile' | 'relationships' | 'advanced';
  let subTab = $state<SubTab>('profile');

  let selectedIndex = $state<number | null>(null);

  const SUB_TABS: { value: SubTab; label: string }[] = [
    { value: 'profile', label: 'Profile' },
    { value: 'relationships', label: 'Relationships graph' },
    { value: 'advanced', label: 'Advanced' },
  ];

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
    title="Mii"
    description="Edit individual Miis on your island."
    error={miiState.error}
    ready={miiState.parsed != null}
  >
    {#if miiState.parsed}
      {@const parsed = miiState.parsed}

      <SaveBar dirty={miiState.dirty} actionLabel="Download Mii.sav" onAction={download} />

      <SubTabs tabs={SUB_TABS} bind:value={subTab} label="Mii sections" />

      {#if subTab === 'profile'}
        <MiiPanel entries={parsed.entries} bind:selectedIndex />
      {:else if subTab === 'relationships'}
        <MiiRelationsGraph
          entries={parsed.entries}
          {selectedIndex}
          onSelect={(i) => (selectedIndex = i)}
        />
      {:else}
        <AdvancedPanel entries={parsed.entries} {markDirty} parseSignal={miiState.parsed} />
      {/if}
    {/if}
  </SaveTab>
</AppLayout>
