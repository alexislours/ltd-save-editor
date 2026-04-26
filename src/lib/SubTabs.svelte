<script lang="ts" generics="T extends string">
  import { TAB_PILL_CLASS } from './styles';

  type Tab = { value: T; label: string };
  type Props = {
    tabs: readonly Tab[];
    value: T;
    label: string;
  };
  let { tabs, value = $bindable(), label }: Props = $props();
</script>

<nav class="flex flex-wrap gap-2" aria-label={label}>
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
    >
      {tab.label}
    </button>
  {/each}
</nav>
