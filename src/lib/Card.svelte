<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CARD_CLASS } from './styles';

  type Props = {
    title?: string;
    description?: string;
    children: Snippet;
  };
  let { title, description, children }: Props = $props();
</script>

<section class={CARD_CLASS}>
  {#if title || description}
    <header class="mb-4">
      {#if title}
        <h2 class="text-base font-bold text-content-strong">{title}</h2>
      {/if}
      {#if description}
        <p class="mt-0.5 text-sm text-content">{description}</p>
      {/if}
    </header>
  {/if}
  {@render children()}
</section>
