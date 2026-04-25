<script lang="ts">
  import { _ } from 'svelte-i18n';
  import AdvancedPanel from '../lib/advanced/AdvancedPanel.svelte';
  import AppLayout from '../lib/AppLayout.svelte';
  import SaveBar from '../lib/SaveBar.svelte';
  import SaveTab from '../lib/SaveTab.svelte';
  import Profile from '../lib/player/Profile.svelte';
  import {
    downloadModified,
    markDirty,
    playerState,
    syncFromSave,
  } from '../lib/playerEditor.svelte';
  import { getSave } from '../lib/saveFile.svelte';

  const save = $derived(getSave('player'));
  $effect(() => {
    void save;
    syncFromSave();
  });

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
      <SaveBar
        dirty={playerState.dirty}
        actionLabel={$_('player.download_action')}
        onAction={download}
      />

      <Profile entries={playerState.parsed.entries} />

      <AdvancedPanel
        entries={playerState.parsed.entries}
        {markDirty}
        parseSignal={playerState.parsed}
      />
    {/if}
  </SaveTab>
</AppLayout>
