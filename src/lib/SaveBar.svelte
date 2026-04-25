<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { PRIMARY_BUTTON_CLASS } from './styles';

  type Props = {
    dirty: boolean;
    actionLabel: string;
    onAction: () => void;
    extra?: Snippet;
  };
  let { dirty, actionLabel, onAction, extra }: Props = $props();
</script>

<div
  class="flex flex-wrap items-center justify-between gap-4 rounded-full bg-amber-300/90 px-5 py-2.5 shadow-sm ring-1 ring-amber-400/60"
>
  <div class="flex items-center gap-2.5">
    <span
      class="h-2.5 w-2.5 shrink-0 rounded-full"
      class:bg-orange-500={dirty}
      class:bg-amber-100={!dirty}
      aria-hidden="true"
    ></span>
    <p class="text-sm font-bold text-slate-900">
      {dirty ? $_('save.unsaved_changes') : $_('save.no_changes')}
      {#if extra}{@render extra()}{/if}
    </p>
  </div>
  <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={onAction}>
    {actionLabel}
  </button>
</div>
