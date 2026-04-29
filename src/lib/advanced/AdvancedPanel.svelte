<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { _ } from 'svelte-i18n';
  import { track } from '../analytics';
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
    track('advanced_warning_acknowledged', {});
  }

  function setAdvView(to: 'tree' | 'table'): void {
    if (advView === to) return;
    advView = to;
    track('advanced_view_changed', { to });
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
    const matched = entries.some((e) => e.hash === advNameHash);
    track('advanced_name_searched', { matched });
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
    track('advanced_hash_copied', {});
  }
</script>

<details class={CARD_BASE_CLASS}>
  <summary class="cursor-pointer px-4 py-4 text-base font-bold text-content-strong sm:px-6">
    {$_('advanced.header')}
  </summary>
  <div class="border-t border-edge/30 px-4 py-4 sm:px-6">
    {#if !advWarningAcked}
      <div
        role="alert"
        class="mb-5 rounded-xl border-2 border-danger-edge bg-danger-bg p-5 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <span
            aria-hidden="true"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white"
            >!</span
          >
          <div class="flex-1">
            <h3 class="text-base font-bold uppercase tracking-wide text-danger">
              {$_('advanced.warning_title')}
            </h3>
            <p class="mt-2 text-sm text-danger">{$_('advanced.warning_intro')}</p>
            <ul class="mt-2 list-inside list-disc text-sm text-danger">
              <li>{$_('advanced.warning_backup')}</li>
              <li>{$_('advanced.warning_understand')}</li>
              <li>{$_('advanced.warning_disclaimer')}</li>
            </ul>
            <button
              type="button"
              class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-red-600"
              onclick={acknowledgeAdvWarning}
            >
              {$_('advanced.warning_acknowledge')}
            </button>
          </div>
        </div>
      </div>
    {:else}
      <div class="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span class="font-bold text-content-strong">{$_('advanced.view_label')}</span>
        <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
          <button
            type="button"
            class="px-3 py-1 text-sm font-bold transition-colors"
            class:bg-orange-500={advView === 'tree'}
            class:text-white={advView === 'tree'}
            class:bg-surface={advView !== 'tree'}
            class:text-content={advView !== 'tree'}
            onclick={() => setAdvView('tree')}
          >
            {$_('advanced.view_tree')}
          </button>
          <button
            type="button"
            class="border-l border-edge/60 px-3 py-1 text-sm font-bold transition-colors"
            class:bg-orange-500={advView === 'table'}
            class:text-white={advView === 'table'}
            class:bg-surface={advView !== 'table'}
            class:text-content={advView !== 'table'}
            onclick={() => setAdvView('table')}
          >
            {$_('advanced.view_table')}
          </button>
        </div>
        <span class="min-w-0 basis-full text-xs text-content-muted sm:ml-auto sm:basis-auto">
          {$_('advanced.sections_label')}
          {countsByType
            .map((c, t) => (c > 0 ? `${DataTypeName[t as DataType]} (${c})` : null))
            .filter(Boolean)
            .slice(0, 4)
            .join(' · ')}
          {#if countsByType.filter((c) => c > 0).length > 4}…{/if}
        </span>
      </div>

      {#if advView === 'tree'}
        <div class="grid gap-4 md:grid-cols-[320px_1px_1fr] md:gap-0">
          <div class="flex flex-col md:min-h-120">
            <input
              type="search"
              class="mb-2 {INPUT_CLASS}"
              placeholder={$_('advanced.tree_filter_placeholder')}
              bind:value={treeSearch}
            />
            <div class="max-h-80 overflow-auto pr-2 sm:max-h-160">
              {#if visibleTree.length === 0}
                <p class="text-sm text-content-muted">{$_('advanced.tree_no_match')}</p>
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

          <div class="hidden bg-edge/40 md:block"></div>

          <div class="md:min-h-120 md:pl-6">
            {#if selectedEntry}
              <PlayerDetail entry={selectedEntry} path={selectedPath} {markDirty} />
            {:else}
              <p class="text-sm text-content-muted">{$_('advanced.tree_select_prompt')}</p>
            {/if}
          </div>
        </div>
      {:else}
        <p class="mb-4 text-sm text-content-muted">{$_('advanced.table_intro')}</p>

        <div class="mb-4 grid gap-3 md:grid-cols-[auto_1fr_1fr] md:items-end">
          <label class="flex flex-col gap-1 text-xs text-content">
            <span class="font-bold text-content-strong">{$_('advanced.filter_type_label')}</span>
            <select class={INPUT_CLASS} bind:value={advTypeFilter}>
              <option value="all">{$_('advanced.filter_type_all')}</option>
              {#each countsByType as count, t (t)}
                {#if count > 0}
                  <option value={t}>{DataTypeName[t as DataType]} ({count})</option>
                {/if}
              {/each}
            </select>
          </label>

          <label class="flex flex-col gap-1 text-xs text-content">
            <span class="font-bold text-content-strong"
              >{$_('advanced.filter_hash_label', { values: { example: '0xa279320c' } })}</span
            >
            <input
              type="text"
              class={MONO_INPUT_CLASS}
              placeholder="0x…"
              bind:value={advHashFilter}
              oninput={() => (advPage = 0)}
            />
          </label>

          <label class="flex flex-col gap-1 text-xs text-content">
            <span class="font-bold text-content-strong">{$_('advanced.filter_name_label')}</span>
            <div class="flex gap-2">
              <input
                type="text"
                class="flex-1 {INPUT_CLASS}"
                placeholder={$_('advanced.filter_name_placeholder')}
                bind:value={advNameInput}
                onkeydown={(e) => e.key === 'Enter' && advSearchByName()}
              />
              <button
                type="button"
                class="{PILL_BUTTON_CLASS} disabled:opacity-50"
                disabled={advNameHash == null}
                onclick={advSearchByName}
              >
                {$_('advanced.filter_find_action')}
              </button>
            </div>
            {#if advNameHash != null}
              <span class="font-mono text-[11px] text-content-muted">→ {hexU32(advNameHash)}</span>
            {/if}
          </label>
        </div>

        <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-edge/60 text-orange-500 focus:ring-orange-500/30"
              bind:checked={advOnlyKnown}
              onchange={() => (advPage = 0)}
            />
            <span class="text-content">{$_('advanced.filter_known_only')}</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-edge/60 text-orange-500 focus:ring-orange-500/30"
              bind:checked={advOnlyEditable}
              onchange={() => (advPage = 0)}
            />
            <span class="text-content">{$_('advanced.filter_editable_only')}</span>
          </label>
          <span class="ml-auto text-xs text-content-muted">
            {$_('advanced.match_count', { values: { count: advFiltered.length } })}
          </span>
        </div>

        <div class="@container overflow-hidden rounded-xl ring-1 ring-edge/40">
          <div
            class="adv-grid-header bg-surface-sunken/70 px-3 py-2 text-left text-xs font-bold text-content-strong"
            role="row"
          >
            <span role="columnheader">{$_('advanced.table_header_hash')}</span>
            <span role="columnheader">{$_('advanced.table_header_type')}</span>
            <span role="columnheader">{$_('advanced.table_header_name')}</span>
            <span role="columnheader">{$_('advanced.table_header_value')}</span>
          </div>
          <ul class="divide-y divide-edge/40" role="rowgroup">
            {#each advPageEntries as entry (entry)}
              <li class="adv-grid-row gap-x-3 gap-y-1 px-3 py-2" role="row">
                <button
                  type="button"
                  class="adv-cell-hash justify-self-start font-mono text-xs text-content hover:text-brand-soft"
                  title={$_('advanced.copy_hash_title')}
                  onclick={() => copyHash(entry.hash)}
                  role="cell"
                >
                  {hexU32(entry.hash)}
                </button>
                <span class="adv-cell-type text-xs text-content-muted" role="cell">
                  {DataTypeName[entry.type]}
                </span>
                <span class="adv-cell-name min-w-0 truncate text-xs text-content" role="cell">
                  {nameForHash(entry.hash) ?? ''}
                </span>
                <div class="adv-cell-value min-w-0" role="cell">
                  <EntryEditor {entry} {markDirty} />
                </div>
              </li>
            {:else}
              <li class="px-3 py-6 text-center text-sm text-content-muted">
                {$_('advanced.table_no_match')}
              </li>
            {/each}
          </ul>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            class="{PILL_BUTTON_CLASS} disabled:opacity-50"
            disabled={advPage <= 0}
            onclick={() => (advPage = Math.max(0, advPage - 1))}
          >
            {$_('advanced.page_previous')}
          </button>
          <span
            class="order-last w-full text-center text-xs text-content-muted sm:order-none sm:w-auto"
          >
            {$_('advanced.page_status', { values: { page: advPage + 1, total: advPageCount } })}
          </span>
          <button
            type="button"
            class="{PILL_BUTTON_CLASS} disabled:opacity-50"
            disabled={advPage >= advPageCount - 1}
            onclick={() => (advPage = Math.min(advPageCount - 1, advPage + 1))}
          >
            {$_('advanced.page_next')}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</details>

<style>
  .adv-grid-header {
    display: none;
  }
  .adv-grid-row {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    align-items: baseline;
  }
  .adv-cell-hash {
    grid-column: 1;
  }
  .adv-cell-type {
    grid-column: 2;
    justify-self: end;
  }
  .adv-cell-name {
    grid-column: 1 / -1;
  }
  .adv-cell-name:empty {
    display: none;
  }
  .adv-cell-value {
    grid-column: 1 / -1;
  }
  @container (min-width: 36rem) {
    .adv-grid-header,
    .adv-grid-row {
      display: grid;
      grid-template-columns: 9rem 7rem minmax(8rem, 1fr) minmax(0, 2fr);
      align-items: baseline;
    }
    .adv-grid-header > :nth-child(1) {
      grid-column: 1;
    }
    .adv-grid-header > :nth-child(2) {
      grid-column: 2;
    }
    .adv-grid-header > :nth-child(3) {
      grid-column: 3;
    }
    .adv-grid-header > :nth-child(4) {
      grid-column: 4;
    }
    .adv-cell-hash {
      grid-column: 1;
    }
    .adv-cell-type {
      grid-column: 2;
      justify-self: start;
    }
    .adv-cell-name {
      grid-column: 3;
    }
    .adv-cell-name:empty {
      display: block;
    }
    .adv-cell-value {
      grid-column: 4;
    }
  }
</style>
