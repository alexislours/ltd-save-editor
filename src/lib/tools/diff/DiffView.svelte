<script lang="ts">
  import { _ } from 'virtual:i18n/tools';
  import { showToast } from '$lib/toast/toast.svelte';
  import { TAB_PILL_CLASS } from '$lib/ui/styles';
  import type { DiffEntry, DiffResult, DiffStatus } from './diffEngine';
  import { elementChanges, formatValue, typeLabel, visibleChanges } from './valueFormat';
  import type { ArrayDiff } from './valueFormat';

  const MAX_ELEMENT_ROWS = 24;
  const MAX_MARKDOWN_ELEMENTS = 100;

  type Props = {
    result: DiffResult;
    beforeLabel: string;
    afterLabel: string;
  };
  let { result, beforeLabel, afterLabel }: Props = $props();

  type StatusFilter = 'all' | DiffStatus;
  let statusFilter = $state<StatusFilter>('all');
  let query = $state('');
  let collapsed = $state<Record<string, boolean>>({});

  const STATUS_STYLES: Record<DiffStatus, string> = {
    changed:
      'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
    added:
      'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800',
    removed: 'bg-danger-bg text-danger ring-danger-edge',
  };

  const statusLabels = $derived<Record<DiffStatus, string>>({
    changed: $_('tools.diff.status_changed'),
    added: $_('tools.diff.status_added'),
    removed: $_('tools.diff.status_removed'),
  });

  const filters = $derived([
    { value: 'all' as const, label: $_('tools.diff.filter_all'), n: result.total },
    { value: 'changed' as const, label: $_('tools.diff.filter_changed'), n: result.counts.changed },
    { value: 'added' as const, label: $_('tools.diff.filter_added'), n: result.counts.added },
    { value: 'removed' as const, label: $_('tools.diff.filter_removed'), n: result.counts.removed },
  ]);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return result.sections
      .map((section) => ({
        name: section.name,
        entries: section.entries.filter(
          (e) =>
            (statusFilter === 'all' || e.status === statusFilter) &&
            (q === '' || e.path.toLowerCase().includes(q)),
        ),
      }))
      .filter((section) => section.entries.length > 0);
  });

  const elementCache = $derived.by(() => {
    return result && new Map<number, ArrayDiff | null>();
  });

  function elementsFor(entry: DiffEntry): ArrayDiff | null {
    if (entry.status !== 'changed') return null;
    if (!elementCache.has(entry.hash)) {
      elementCache.set(
        entry.hash,
        elementChanges(entry.type, entry.hash, entry.before, entry.after),
      );
    }
    return elementCache.get(entry.hash) ?? null;
  }

  function toggle(name: string): void {
    collapsed = { ...collapsed, [name]: !collapsed[name] };
  }

  function appendElementLines(lines: string[], diff: ArrayDiff, indent: string): void {
    const { rows, hidden } = visibleChanges(diff, MAX_MARKDOWN_ELEMENTS);
    for (const ch of rows) {
      if ('children' in ch) {
        lines.push(
          `${indent}- ${ch.label}: ${ch.children.changes.length} of ${ch.children.total} changed`,
        );
        appendElementLines(lines, ch.children, `${indent}  `);
      } else if (ch.status === 'changed') {
        lines.push(`${indent}- ${ch.label} ${ch.before} -> ${ch.after}`);
      } else if (ch.status === 'added') {
        lines.push(`${indent}- ${ch.label} +${ch.after}`);
      } else {
        lines.push(`${indent}- ${ch.label} -${ch.before}`);
      }
    }
    if (hidden > 0) {
      lines.push(`${indent}- … +${hidden} more`);
    }
  }

  async function copyMarkdown(): Promise<void> {
    const sections = filtered;
    const counts = { changed: 0, added: 0, removed: 0 };
    for (const section of sections) {
      for (const e of section.entries) counts[e.status]++;
    }
    const lines: string[] = [
      `# Diff: ${beforeLabel} -> ${afterLabel}`,
      '',
      `${counts.changed} changed, ${counts.added} added, ${counts.removed} removed`,
      '',
    ];
    for (const section of sections) {
      lines.push(`## ${section.name}`);
      for (const e of section.entries) {
        if (e.status === 'changed') {
          const elems = elementsFor(e);
          if (elems) {
            lines.push(
              `- [changed] ${e.path}: ${elems.changes.length} of ${elems.total} fields changed`,
            );
            appendElementLines(lines, elems, '  ');
          } else {
            lines.push(
              `- [changed] ${e.path}: ${formatValue(e.type, e.before)} -> ${formatValue(e.type, e.after)}`,
            );
          }
        } else if (e.status === 'added') {
          lines.push(`- [added] ${e.path}: ${formatValue(e.type, e.after)}`);
        } else {
          lines.push(`- [removed] ${e.path}: ${formatValue(e.type, e.before)}`);
        }
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('success', $_('tools.diff.copied'));
    } catch {
      showToast('error', $_('tools.diff.copy_failed'));
    }
  }
</script>

{#snippet diffRows(diff: ArrayDiff)}
  {@const visible = visibleChanges(diff, MAX_ELEMENT_ROWS)}
  <span class="text-[11px] text-content-faint">
    {$_('tools.diff.elements_changed', {
      values: { n: diff.changes.length, total: diff.total },
    })}
  </span>
  <ul class="flex flex-col gap-0.5">
    {#each visible.rows as ch, i (i)}
      {#if 'children' in ch}
        <li class="flex flex-col gap-0.5">
          <span class="text-content-faint">{ch.label}</span>
          <div class="flex flex-col gap-0.5 border-l border-edge/40 pl-2">
            {@render diffRows(ch.children)}
          </div>
        </li>
      {:else}
        <li class="flex flex-wrap items-baseline gap-x-1.5">
          <span class="shrink-0 text-content-faint">{ch.label}</span>
          {#if ch.status === 'changed'}
            <span class="break-all text-danger line-through decoration-danger/50">
              {ch.before}
            </span>
            <span aria-hidden="true" class="text-content-faint">-&gt;</span>
            <span class="break-all text-emerald-700 dark:text-emerald-400">
              {ch.after}
            </span>
          {:else if ch.status === 'added'}
            <span class="break-all text-emerald-700 dark:text-emerald-400">
              {ch.after}
            </span>
          {:else}
            <span class="break-all text-danger line-through decoration-danger/50">
              {ch.before}
            </span>
          {/if}
        </li>
      {/if}
    {/each}
  </ul>
  {#if visible.hidden > 0}
    <span class="text-[11px] text-content-faint">
      {$_('tools.diff.elements_more', {
        values: { n: visible.hidden },
      })}
    </span>
  {/if}
{/snippet}

{#if result.total === 0}
  <p
    class="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-content-muted ring-1 ring-edge/40"
  >
    {$_('tools.diff.no_changes')}
  </p>
{:else}
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <nav class="flex flex-wrap gap-1.5" aria-label={$_('tools.diff.filter_label')}>
        {#each filters as f (f.value)}
          {@const active = statusFilter === f.value}
          <button
            type="button"
            class={[
              TAB_PILL_CLASS,
              'px-3 py-1 text-xs',
              active
                ? 'bg-orange-500 text-white shadow'
                : 'bg-surface-sunken/70 text-content hover:text-content-strong',
            ]}
            onclick={() => (statusFilter = f.value)}
            aria-current={active ? 'page' : undefined}
          >
            {f.label}
            <span class={active ? 'text-white/80' : 'text-content-faint'}>{f.n}</span>
          </button>
        {/each}
      </nav>
      <input
        type="search"
        bind:value={query}
        placeholder={$_('tools.diff.search_placeholder')}
        class="min-w-0 flex-1 rounded-full border border-edge/60 bg-surface px-3.5 py-1 font-mono text-xs text-content-strong shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
      />
      <button
        type="button"
        class="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken"
        onclick={copyMarkdown}
      >
        {$_('tools.diff.copy_markdown')}
      </button>
    </div>

    {#if filtered.length === 0}
      <p
        class="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-content-muted ring-1 ring-edge/40"
      >
        {$_('tools.diff.no_matches')}
      </p>
    {:else}
      <div class="flex flex-col gap-3">
        {#each filtered as section (section.name)}
          {@const isOpen = !collapsed[section.name]}
          <section class="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-edge/40">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted"
              onclick={() => toggle(section.name)}
              aria-expanded={isOpen}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                class={[
                  'h-2.5 w-2.5 shrink-0 fill-none stroke-current transition-transform',
                  isOpen ? 'rotate-90' : '',
                ]}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 2.5 8 6l-4 3.5" />
              </svg>
              <span class="font-bold text-content-strong">{section.name}</span>
              <span class="text-xs text-content-faint">
                {$_('tools.diff.field_count', { values: { n: section.entries.length } })}
              </span>
            </button>
            {#if isOpen}
              <ul class="divide-y divide-edge/30 border-t border-edge/30">
                {#each section.entries as entry (entry.hash)}
                  <li class="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                    <div class="flex min-w-0 items-center gap-2 sm:w-2/5 sm:shrink-0">
                      <span
                        class={[
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1',
                          STATUS_STYLES[entry.status],
                        ]}
                      >
                        {statusLabels[entry.status]}
                      </span>
                      <span class="min-w-0 break-all font-mono text-xs text-content-strong">
                        {entry.path}
                      </span>
                    </div>
                    <div class="min-w-0 flex-1 font-mono text-xs">
                      {#if entry.status === 'changed'}
                        {@const elems = elementsFor(entry)}
                        {#if elems}
                          <div class="flex flex-col gap-1">
                            {@render diffRows(elems)}
                          </div>
                        {:else}
                          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span class="break-all text-danger line-through decoration-danger/50">
                              {formatValue(entry.type, entry.before)}
                            </span>
                            <span aria-hidden="true" class="text-content-faint">-&gt;</span>
                            <span class="break-all text-emerald-700 dark:text-emerald-400">
                              {formatValue(entry.type, entry.after)}
                            </span>
                          </div>
                        {/if}
                      {:else if entry.status === 'added'}
                        <span class="break-all text-emerald-700 dark:text-emerald-400">
                          {formatValue(entry.type, entry.after)}
                        </span>
                      {:else}
                        <span class="break-all text-danger line-through decoration-danger/50">
                          {formatValue(entry.type, entry.before)}
                        </span>
                      {/if}
                      <span class="ml-2 text-[10px] uppercase tracking-wide text-content-faint">
                        {typeLabel(entry.type)}
                      </span>
                    </div>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}
      </div>
    {/if}
  </div>
{/if}
