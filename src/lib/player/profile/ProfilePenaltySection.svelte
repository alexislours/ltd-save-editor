<script lang="ts">
  import { _ } from 'virtual:i18n/player+advanced';
  import { locale } from 'svelte-i18n';
  import { bindLeaf } from '$lib/sav/bindLeaf.svelte';
  import { player } from '$lib/sav/schema';
  import { playerAccessor } from '$lib/player/playerEditor.svelte';
  import { CARD_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';

  const PENALTY_TIME = player.Player.LastPenaltyTime;

  const penalty = bindLeaf(playerAccessor, PENALTY_TIME);

  const active = $derived(penalty.present && (penalty.value ?? 0n) !== 0n);

  const unlockDate = $derived.by(() => {
    if (!active || penalty.value == null) return null;
    const fromMs = (Number(penalty.value) + 86400) * 1000;
    const at = new Date(fromMs);
    const sameDayFiveAm = new Date(at.getFullYear(), at.getMonth(), at.getDate(), 5, 0, 0, 0);
    const day = sameDayFiveAm.getTime() <= fromMs ? at.getDate() + 1 : at.getDate();
    return new Date(at.getFullYear(), at.getMonth(), day, 5, 0, 0, 0);
  });

  const unlockLabel = $derived.by(() => {
    if (!unlockDate) return '';
    try {
      return new Intl.DateTimeFormat($locale ?? undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(unlockDate);
    } catch {
      return unlockDate.toLocaleString();
    }
  });

  let confirmOpen = $state(false);

  function clearPenalty(): void {
    penalty.commit(0n);
  }
</script>

{#if active}
  <section class={CARD_CLASS}>
    <h3 class="mb-2 text-sm font-semibold text-content-strong">
      {$_('player.penalty_section')}
    </h3>
    <p class="mb-4 text-sm text-content">
      {$_('player.penalty_description', { values: { unlock: unlockLabel } })}
    </p>
    <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={() => (confirmOpen = true)}>
      {$_('player.penalty_clear_button')}
    </button>
  </section>

  <ConfirmDialog
    bind:open={confirmOpen}
    title={$_('player.penalty_confirm_title')}
    body={$_('player.penalty_confirm_body')}
    confirmLabel={$_('player.penalty_clear_button')}
    onConfirm={clearPenalty}
  />
{/if}
