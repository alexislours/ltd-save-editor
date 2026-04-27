<script lang="ts">
  import type { Snippet } from 'svelte';
  import { LABEL_CLASS } from '../styles';

  type Props = {
    label: string;
    error?: string | null;
    bodyClass?: string;
    children: Snippet;
  };

  let { label, error = null, bodyClass = 'mt-1.5', children }: Props = $props();
</script>

<div class="min-w-0">
  <span class={LABEL_CLASS}>{label}</span>
  <div class={bodyClass}>{@render children()}</div>
  {#if error}
    <p class="mt-1 text-xs font-bold text-danger">{error}</p>
  {/if}
</div>
