<script lang="ts">
  import Self from './PlayerTree.svelte';
  import type { TreeNode } from './tree';

  type Props = {
    nodes: TreeNode[];
    selectedPath: string | null;
    expanded: Set<string>;
    onSelect: (node: TreeNode) => void;
    onToggle: (path: string) => void;
    depth?: number;
  };
  let { nodes, selectedPath, expanded, onSelect, onToggle, depth = 0 }: Props = $props();
</script>

<ul class="list-none" class:pl-4={depth > 0}>
  {#each nodes as node (node.path)}
    {@const isFolder = node.children.length > 0}
    {@const isOpen = expanded.has(node.path)}
    {@const isSelected = !isFolder && node.path === selectedPath}
    <li class="py-[1px]">
      {#if isFolder}
        <button
          type="button"
          class="flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm font-medium text-content-strong hover:bg-surface-sunken/70"
          onclick={() => onToggle(node.path)}
        >
          <span class="inline-block w-3 text-[10px] text-content-faint" aria-hidden="true">
            {isOpen ? '▼' : '▶'}
          </span>
          <span class="truncate">{node.label}</span>
        </button>
        {#if isOpen}
          <Self
            nodes={node.children}
            {selectedPath}
            {expanded}
            {onSelect}
            {onToggle}
            depth={depth + 1}
          />
        {/if}
      {:else if node.entry}
        <button
          type="button"
          class={[
            'flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm',
            isSelected
              ? 'bg-orange-500 font-bold text-white'
              : 'text-content-strong hover:bg-surface-sunken/70',
          ]}
          onclick={() => onSelect(node)}
        >
          <span class="inline-block w-3" aria-hidden="true"></span>
          <span class="truncate">{node.label}</span>
        </button>
      {/if}
    </li>
  {/each}
</ul>
