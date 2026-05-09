<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import type { MoveImpact } from './housingFriendship';

  type Props = {
    open: boolean;
    impact: MoveImpact | null;
    onConfirm: () => void;
    onCancel: () => void;
  };
  let { open = $bindable(), impact, onConfirm, onCancel }: Props = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let outcome: 'pending' | 'confirmed' | 'cancelled' = 'pending';

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      outcome = 'pending';
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  });

  function close(): void {
    open = false;
  }

  function confirm(): void {
    if (outcome !== 'pending') return;
    outcome = 'confirmed';
    close();
    onConfirm();
  }

  function cancel(): void {
    if (outcome !== 'pending') return;
    outcome = 'cancelled';
    close();
    onCancel();
  }

  function onBackdrop(event: MouseEvent): void {
    if (event.target === dialog) cancel();
  }
</script>

<dialog
  bind:this={dialog}
  onclose={cancel}
  onclick={onBackdrop}
  class="m-auto w-[min(32rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div class="border-b border-edge/40 bg-surface-muted/80 px-6 py-4">
    <h2 class="text-lg font-bold text-content-strong">
      {$_('map.residents.friendship.title')}
    </h2>
  </div>

  <div class="px-6 py-5">
    <p class="text-sm text-content">{$_('map.residents.friendship.intro')}</p>
    {#if impact}
      <div class="mt-3 grid gap-3">
        {#each impact.conflicts as c (c.moving)}
          <section class="grid gap-1.5">
            <p class="text-xs font-bold uppercase tracking-wider text-content-muted">
              {$_('map.residents.friendship.section', {
                values: { name: c.movingName || $_('map.residents.unnamed') },
              })}
            </p>
            <ul class="grid gap-1">
              {#each c.low as l (l.miiIndex)}
                <li
                  class="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-1.5 ring-1 ring-edge/40"
                >
                  <span class="min-w-0 flex-1 truncate text-sm font-bold text-content-strong">
                    {l.name || $_('map.residents.unnamed')}
                  </span>
                  <span class="font-mono text-[10px] text-content-faint">#{l.miiIndex}</span>
                  <span
                    class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-500/30"
                  >
                    {l.outTypeName} / {l.inTypeName}
                  </span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
      <p class="mt-4 text-xs text-content-muted">
        {$_('map.residents.friendship.bump_hint')}
      </p>
    {/if}
  </div>

  <div class="flex justify-end gap-2 border-t border-edge/40 bg-surface-muted/40 px-6 py-3">
    <button type="button" class={PILL_BUTTON_CLASS} onclick={cancel}>
      {$_('map.residents.friendship.cancel')}
    </button>
    <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={confirm}>
      {$_('map.residents.friendship.bump')}
    </button>
  </div>
</dialog>
