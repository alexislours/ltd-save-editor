<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { INPUT_CLASS } from '../styles';
  import { actorDisplay, type ActorGroup } from './actors';
  import { liveRows, objectsState, type MapObjectRow } from './mapObjectsEditor.svelte';

  type Props = {
    selectedIndex: number | null;
    onSelect: (index: number) => void;
  };
  let { selectedIndex, onSelect }: Props = $props();

  let query = $state('');
  let groupFilter = $state<ActorGroup | 'all'>('all');

  const rows = $derived.by((): MapObjectRow[] => {
    void objectsState.rev;
    return liveRows();
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const d = actorDisplay(r.actor);
      if (groupFilter !== 'all' && d.group !== groupFilter) return false;
      if (!q) return true;
      return (
        d.label.toLowerCase().includes(q) ||
        d.key.toLowerCase().includes(q) ||
        `#${r.index}`.includes(q)
      );
    });
  });
</script>

<div class="flex h-full min-h-0 flex-col">
  <div class="mb-3 grid gap-2">
    <input
      type="search"
      placeholder="Search objects…"
      bind:value={query}
      class="w-full {INPUT_CLASS}"
    />
    <div class="flex flex-wrap gap-1 text-xs">
      {#each ['all', 'house', 'facility', 'deco', 'step', 'room', 'unknown'] as const as g (g)}
        {@const active = groupFilter === g}
        <button
          type="button"
          class={[
            'rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors',
            active
              ? 'bg-orange-500 text-white shadow'
              : 'bg-surface-sunken/70 text-content ring-1 ring-edge/50 hover:bg-surface-sunken',
          ]}
          onclick={() => (groupFilter = g)}
        >
          {$_(`map.objects.group.${g}`)}
        </button>
      {/each}
    </div>
    <p class="text-xs text-content-muted">
      {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} placed
    </p>
  </div>

  <div
    class="min-h-0 max-h-[60vh] flex-1 overflow-y-auto rounded-xl bg-surface ring-1 ring-edge/40"
  >
    {#if filtered.length === 0}
      <p class="p-3 text-xs text-content-muted">No objects match.</p>
    {:else}
      <ul class="divide-y divide-edge/40">
        {#each filtered as row (row.index)}
          {@const d = actorDisplay(row.actor)}
          {@const active = selectedIndex === row.index}
          <li>
            <button
              type="button"
              class={[
                'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition',
                active ? 'bg-orange-500 text-white' : 'text-content hover:bg-surface-muted',
              ]}
              onclick={() => onSelect(row.index)}
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                style="background-color: {d.color}"
                aria-hidden="true"
              ></span>
              <span class="min-w-0 flex-1 truncate font-bold">{d.label}</span>
              <span
                class={[
                  'shrink-0 font-mono tabular-nums',
                  active ? 'text-white/80' : 'text-content-faint',
                ]}
              >
                {row.x},{row.y}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
