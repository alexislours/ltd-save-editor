<script lang="ts" generics="T extends string">
  import { TAB_PILL_CLASS } from '$lib/ui/styles';

  type Tab = { value: T; label: string };
  type Props = {
    tabs: readonly Tab[];
    value: T;
    label: string;
  };
  let { tabs, value = $bindable(), label }: Props = $props();
</script>

<nav class="flex flex-wrap gap-2" aria-label={label} data-tutorial="subtabs">
  {#each tabs as tab (tab.value)}
    {@const active = tab.value === value}
    <button
      type="button"
      class={[
        TAB_PILL_CLASS,
        active
          ? 'bg-orange-500 text-white shadow'
          : 'bg-surface-sunken/70 text-content hover:text-content-strong',
      ]}
      onclick={() => (value = tab.value)}
      aria-current={active ? 'page' : undefined}
      data-subtab={tab.value}
    >
      {tab.label}
    </button>
  {/each}
</nav>
