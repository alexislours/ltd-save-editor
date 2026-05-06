<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { CARD_CLASS } from '$lib/ui/styles';
  import ProfileIdentitySection from './ProfileIdentitySection.svelte';
  import ProfileLiberationSection from './ProfileLiberationSection.svelte';
  import ProfileRegionSection from './ProfileRegionSection.svelte';
  import ProfileStatsSection from './ProfileStatsSection.svelte';
  import { profileHasAnyContent } from './profileFields';

  const anyFound = $derived(profileHasAnyContent(playerAccessor()));
</script>

{#if !anyFound}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.empty_state')}</p>
  </section>
{:else}
  <div class="grid gap-4">
    <ProfileIdentitySection />
    <ProfileStatsSection />
    <ProfileLiberationSection />
    <ProfileRegionSection />
  </div>
{/if}
