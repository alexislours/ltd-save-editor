<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    closeHelp,
    formatBinding,
    getActionsByGroup,
    groupLabelKey,
    GROUP_ORDER,
    keymapState,
  } from '../input/keymap.svelte';

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (keymapState.helpOpen && !dialog.open) dialog.showModal();
    else if (!keymapState.helpOpen && dialog.open) dialog.close();
  });

  function onBackdrop(e: MouseEvent): void {
    if (e.target === dialog) closeHelp();
  }

  const grouped = $derived(getActionsByGroup());
</script>

<dialog
  bind:this={dialog}
  onclose={closeHelp}
  onclick={onBackdrop}
  class="m-auto w-[min(640px,90vw)] max-w-2xl rounded-2xl bg-surface p-0 ring-1 ring-edge/60 shadow-2xl backdrop:bg-black/40"
>
  <div class="flex items-center justify-between border-b border-edge/40 px-5 py-3">
    <h2 class="text-sm font-bold text-content-strong">{$_('map.help.title')}</h2>
    <button
      type="button"
      onclick={closeHelp}
      aria-label={$_('map.help.close')}
      class="grid h-7 w-7 place-items-center rounded-full text-base text-content hover:bg-surface-muted"
    >
      ✕
    </button>
  </div>

  <div class="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
    {#each GROUP_ORDER as group (group)}
      {@const items = grouped.get(group) ?? []}
      {#if items.length > 0}
        <section class="flex flex-col gap-1.5">
          <h3 class="px-1 text-[10px] font-bold uppercase tracking-wide text-content-muted">
            {$_(groupLabelKey(group))}
          </h3>
          <ul class="flex flex-col gap-1">
            {#each items as a (a.id)}
              <li class="flex items-center justify-between gap-2 px-1 py-0.5">
                <span class="truncate text-sm text-content">{$_(a.labelKey)}</span>
                <span class="flex shrink-0 items-center gap-1">
                  <kbd
                    class="rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-content-strong ring-1 ring-edge/40"
                  >
                    {formatBinding(a.binding)}
                  </kbd>
                  {#if a.altBinding}
                    <span class="text-[10px] text-content-muted">/</span>
                    <kbd
                      class="rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-content-strong ring-1 ring-edge/40"
                    >
                      {formatBinding(a.altBinding)}
                    </kbd>
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/each}
  </div>
</dialog>
