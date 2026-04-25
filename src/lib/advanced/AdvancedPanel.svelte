<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import EntryEditor from '../player/EntryEditor.svelte';
  import PlayerDetail from '../player/PlayerDetail.svelte';
  import PlayerTree from '../player/PlayerTree.svelte';
  import { buildTree, type TreeNode } from '../player/tree';
  import { DATA_TYPE_COUNT, DataType, DataTypeName } from '../sav/dataType';
  import { hexU32 } from '../sav/format';
  import { murmur3_x86_32 } from '../sav/hash';
  import { nameForHash } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { CARD_BASE_CLASS, INPUT_CLASS, MONO_INPUT_CLASS, PILL_BUTTON_CLASS } from '../styles';

  type Props = {
    entries: readonly Entry[];
    markDirty: (e: Entry) => void;
    parseSignal?: unknown;
  };
  let { entries, markDirty, parseSignal }: Props = $props();

  let advView = $state<'tree' | 'table'>('tree');

  const ADV_WARNING_KEY = 'ltd-save-editor:adv-warning-ack';
  let advWarningAcked = $state<boolean>(
    typeof localStorage !== 'undefined' && localStorage.getItem(ADV_WARNING_KEY) === '1',
  );
  function acknowledgeAdvWarning() {
    advWarningAcked = true;
    try {
      localStorage.setItem(ADV_WARNING_KEY, '1');
    } catch {
      // ignore storage failures
    }
  }

  const tree = $derived(buildTree(entries));
  const expanded = new SvelteSet<string>();
  let selectedPath = $state<string | null>(null);
  let selectedEntry = $state<Entry | null>(null);

  function selectNode(node: TreeNode) {
    if (!node.entry) return;
    selectedPath = node.path;
    selectedEntry = node.entry;
  }

  function toggleNode(path: string) {
    if (expanded.has(path)) expanded.delete(path);
    else expanded.add(path);
  }

  $effect(() => {
    void parseSignal;
    selectedPath = null;
    selectedEntry = null;
    expanded.clear();
  });

  let treeSearch = $state('');
  const searchLc = $derived(treeSearch.trim().toLowerCase());

  const visibleTree = $derived.by(() => {
    if (!searchLc) return tree;
    function prune(nodes: TreeNode[]): TreeNode[] {
      const out: TreeNode[] = [];
      for (const n of nodes) {
        if (n.children.length > 0) {
          const kids = prune(n.children);
          if (kids.length > 0) {
            out.push({ ...n, children: kids });
            expanded.add(n.path);
          }
        } else if (n.path.toLowerCase().includes(searchLc)) {
          out.push(n);
        }
      }
      return out;
    }
    return prune(tree);
  });

  const countsByType = $derived.by(() => {
    const c = new Array(DATA_TYPE_COUNT).fill(0) as number[];
    for (const e of entries) c[e.type]++;
    return c;
  });

  let advTypeFilter = $state<'all' | DataType>('all');
  let advHashFilter = $state('');
  let advNameInput = $state('');
  let advOnlyKnown = $state(false);
  let advOnlyEditable = $state(false);
  let advPage = $state(0);
  const advPageSize = 50;

  const advNameHash = $derived(advNameInput.trim() ? murmur3_x86_32(advNameInput.trim()) : null);

  function advSearchByName(): void {
    if (advNameHash == null) return;
    advHashFilter = hexU32(advNameHash);
    advPage = 0;
  }

  const EDITABLE_TYPES = new Set<DataType>([
    DataType.Bool,
    DataType.Int,
    DataType.UInt,
    DataType.Float,
    DataType.Enum,
    DataType.Int64,
    DataType.UInt64,
    DataType.Vector2,
    DataType.Vector3,
    DataType.String16,
    DataType.String32,
    DataType.String64,
    DataType.WString16,
    DataType.WString32,
    DataType.WString64,
  ]);

  const advFiltered = $derived.by(() => {
    let hashMatch: number | null = null;
    const q = advHashFilter.trim();
    if (q) {
      hashMatch = q.toLowerCase().startsWith('0x')
        ? Number.parseInt(q.slice(2), 16)
        : Number.parseInt(q, 16);
      if (Number.isNaN(hashMatch)) hashMatch = -1;
      else hashMatch = hashMatch >>> 0;
    }
    const out: Entry[] = [];
    for (const e of entries) {
      if (advTypeFilter !== 'all' && e.type !== advTypeFilter) continue;
      if (hashMatch !== null && e.hash !== hashMatch) continue;
      if (advOnlyKnown && nameForHash(e.hash) == null) continue;
      if (advOnlyEditable && !EDITABLE_TYPES.has(e.type)) continue;
      out.push(e);
    }
    return out;
  });

  $effect(() => {
    const pageCount = Math.max(1, Math.ceil(advFiltered.length / advPageSize));
    if (advPage >= pageCount) advPage = pageCount - 1;
    if (advPage < 0) advPage = 0;
  });

  const advPageCount = $derived(Math.max(1, Math.ceil(advFiltered.length / advPageSize)));
  const advPageEntries = $derived(
    advFiltered.slice(advPage * advPageSize, (advPage + 1) * advPageSize),
  );

  function copyHash(h: number): void {
    void navigator.clipboard?.writeText(hexU32(h));
  }
</script>

<details class={CARD_BASE_CLASS}>
  <summary class="cursor-pointer px-6 py-4 text-base font-bold text-slate-900">
    Advanced: browse every entry
  </summary>
  <div class="border-t border-amber-400/30 px-6 py-4">
    {#if !advWarningAcked}
      <div role="alert" class="mb-5 rounded-xl border-2 border-red-500 bg-red-50 p-5 shadow-sm">
        <div class="flex items-start gap-3">
          <span
            aria-hidden="true"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white"
            >!</span
          >
          <div class="flex-1">
            <h3 class="text-base font-bold uppercase tracking-wide text-red-700">
              Here be dragons
            </h3>
            <p class="mt-2 text-sm text-red-900">
              The advanced panel exposes every raw entry in your save file. Editing values here can <strong
                >permanently corrupt your save</strong
              >, brick your progress, or cause the game to crash or refuse to load. There is
              <strong>no undo</strong>.
            </p>
            <ul class="mt-2 list-inside list-disc text-sm text-red-900">
              <li>
                <strong>Back up your save file first.</strong> Copy it somewhere safe before changing
                anything.
              </li>
              <li>Only edit entries if you understand what they mean.</li>
              <li>
                You're on your own. The authors of this tool take no responsibility for lost saves.
              </li>
            </ul>
            <button
              type="button"
              class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-red-600"
              onclick={acknowledgeAdvWarning}
            >
              I understand, show the advanced panel
            </button>
          </div>
        </div>
      </div>
    {:else}
      <div class="mb-5 flex items-center gap-3 text-sm">
        <span class="font-bold text-slate-900">View:</span>
        <div class="inline-flex overflow-hidden rounded-full ring-1 ring-amber-400/60">
          <button
            type="button"
            class="px-3 py-1 text-sm font-bold transition-colors"
            class:bg-orange-500={advView === 'tree'}
            class:text-white={advView === 'tree'}
            class:bg-white={advView !== 'tree'}
            class:text-slate-700={advView !== 'tree'}
            onclick={() => (advView = 'tree')}
          >
            Tree
          </button>
          <button
            type="button"
            class="border-l border-amber-400/60 px-3 py-1 text-sm font-bold transition-colors"
            class:bg-orange-500={advView === 'table'}
            class:text-white={advView === 'table'}
            class:bg-white={advView !== 'table'}
            class:text-slate-700={advView !== 'table'}
            onclick={() => (advView = 'table')}
          >
            Flat table
          </button>
        </div>
        <span class="ml-auto text-xs text-slate-600">
          Sections: {countsByType
            .map((c, t) => (c > 0 ? `${DataTypeName[t as DataType]} (${c})` : null))
            .filter(Boolean)
            .slice(0, 4)
            .join(' · ')}
          {#if countsByType.filter((c) => c > 0).length > 4}…{/if}
        </span>
      </div>

      {#if advView === 'tree'}
        <div class="grid gap-0 md:grid-cols-[320px_1px_1fr]">
          <div class="flex min-h-120 flex-col">
            <input
              type="search"
              class="mb-2 {INPUT_CLASS}"
              placeholder="Filter by path…"
              bind:value={treeSearch}
            />
            <div class="max-h-160 overflow-auto pr-2">
              {#if visibleTree.length === 0}
                <p class="text-sm text-slate-600">No entries match this filter.</p>
              {:else}
                <PlayerTree
                  nodes={visibleTree}
                  {selectedPath}
                  {expanded}
                  onSelect={selectNode}
                  onToggle={toggleNode}
                />
              {/if}
            </div>
          </div>

          <div class="hidden bg-amber-400/40 md:block"></div>

          <div class="min-h-120 md:pl-6">
            {#if selectedEntry}
              <PlayerDetail entry={selectedEntry} path={selectedPath} {markDirty} />
            {:else}
              <p class="text-sm text-slate-600">Select an entry from the tree to edit.</p>
            {/if}
          </div>
        </div>
      {:else}
        <p class="mb-4 text-sm text-slate-600">Full, searchable list of every entry in the save.</p>

        <div class="mb-4 grid gap-3 md:grid-cols-[auto_1fr_1fr] md:items-end">
          <label class="flex flex-col gap-1 text-xs text-slate-700">
            <span class="font-bold text-slate-900">Type</span>
            <select class={INPUT_CLASS} bind:value={advTypeFilter}>
              <option value="all">All</option>
              {#each countsByType as count, t (t)}
                {#if count > 0}
                  <option value={t}>{DataTypeName[t as DataType]} ({count})</option>
                {/if}
              {/each}
            </select>
          </label>

          <label class="flex flex-col gap-1 text-xs text-slate-700">
            <span class="font-bold text-slate-900">Hash filter (e.g. <code>0xa279320c</code>)</span>
            <input
              type="text"
              class={MONO_INPUT_CLASS}
              placeholder="0x…"
              bind:value={advHashFilter}
              oninput={() => (advPage = 0)}
            />
          </label>

          <label class="flex flex-col gap-1 text-xs text-slate-700">
            <span class="font-bold text-slate-900">Find by name (MurmurHash3)</span>
            <div class="flex gap-2">
              <input
                type="text"
                class="flex-1 {INPUT_CLASS}"
                placeholder="Player.GoodsInfo2.TreasureMap.State"
                bind:value={advNameInput}
                onkeydown={(e) => e.key === 'Enter' && advSearchByName()}
              />
              <button
                type="button"
                class="{PILL_BUTTON_CLASS} disabled:opacity-50"
                disabled={advNameHash == null}
                onclick={advSearchByName}
              >
                Find
              </button>
            </div>
            {#if advNameHash != null}
              <span class="font-mono text-[11px] text-slate-600">→ {hexU32(advNameHash)}</span>
            {/if}
          </label>
        </div>

        <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-amber-400/60 text-orange-500 focus:ring-orange-500/30"
              bind:checked={advOnlyKnown}
              onchange={() => (advPage = 0)}
            />
            <span class="text-slate-700">Known keys only</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-amber-400/60 text-orange-500 focus:ring-orange-500/30"
              bind:checked={advOnlyEditable}
              onchange={() => (advPage = 0)}
            />
            <span class="text-slate-700">Editable types only</span>
          </label>
          <span class="ml-auto text-xs text-slate-600">
            {advFiltered.length.toLocaleString()} match{advFiltered.length === 1 ? '' : 'es'}
          </span>
        </div>

        <div class="overflow-x-auto rounded-xl ring-1 ring-amber-400/40">
          <table class="w-full text-sm">
            <thead class="bg-amber-100/70 text-left text-xs font-bold text-slate-900">
              <tr>
                <th class="px-3 py-2 font-bold">Hash</th>
                <th class="px-3 py-2 font-bold">Type</th>
                <th class="px-3 py-2 font-bold">Name</th>
                <th class="px-3 py-2 font-bold">Value</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-200/60">
              {#each advPageEntries as entry (entry)}
                <tr class="align-top">
                  <td class="px-3 py-2">
                    <button
                      type="button"
                      class="font-mono text-xs text-slate-700 hover:text-orange-600"
                      title="Copy hash"
                      onclick={() => copyHash(entry.hash)}
                    >
                      {hexU32(entry.hash)}
                    </button>
                  </td>
                  <td class="px-3 py-2 text-xs text-slate-600">
                    {DataTypeName[entry.type]}
                  </td>
                  <td class="px-3 py-2 text-xs text-slate-700">
                    {nameForHash(entry.hash) ?? ''}
                  </td>
                  <td class="px-3 py-2">
                    <EntryEditor {entry} {markDirty} />
                  </td>
                </tr>
              {:else}
                <tr>
                  <td colspan="4" class="px-3 py-6 text-center text-slate-600"
                    >No entries match the current filters.</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="mt-3 flex items-center justify-between text-sm">
          <button
            type="button"
            class="{PILL_BUTTON_CLASS} disabled:opacity-50"
            disabled={advPage <= 0}
            onclick={() => (advPage = Math.max(0, advPage - 1))}
          >
            Previous
          </button>
          <span class="text-xs text-slate-600">
            Page {advPage + 1} of {advPageCount}
          </span>
          <button
            type="button"
            class="{PILL_BUTTON_CLASS} disabled:opacity-50"
            disabled={advPage >= advPageCount - 1}
            onclick={() => (advPage = Math.min(advPageCount - 1, advPage + 1))}
          >
            Next
          </button>
        </div>
      {/if}
    {/if}
  </div>
</details>
