<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import {
    decodeStruct,
    isFloatPrim,
    primRange,
    writeBits,
    writeChars,
    writeChars16,
    writePrim,
    type DecodedNode,
    type FieldType,
    type StructDef,
  } from '@alexislours/ltd-savedata';

  type Props = {
    bytes: Uint8Array;
    def: StructDef;
    onByteChange?: () => void;
  };
  let { bytes, def, onByteChange }: Props = $props();

  let version = $state(0);
  const collapsed = new SvelteSet<string>();

  $effect(() => {
    void bytes;
    collapsed.clear();
  });

  const dv = $derived(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));

  const root = $derived.by(() => {
    void version;
    void bytes;
    return decodeStruct(def, bytes);
  });

  type Row = { node: DecodedNode; depth: number; group: boolean };

  const rows = $derived.by(() => {
    const out: Row[] = [];
    const walk = (node: DecodedNode, depth: number): void => {
      const group = !!node.children && node.value.kind === 'group';
      out.push({ node, depth, group });
      if (group && !collapsed.has(node.path)) {
        for (const c of node.children!) walk(c, depth + 1);
      }
    };
    if (root.children) for (const c of root.children) walk(c, 0);
    return out;
  });

  function guides(depth: number): number[] {
    return Array.from({ length: depth }, (_, i) => i);
  }

  function typeLabel(t: FieldType): string {
    switch (t.kind) {
      case 'prim':
        return t.prim;
      case 'char':
        return `char[${t.len}]`;
      case 'wchar':
        return `char16[${t.len}]`;
      case 'bytes':
        return `u8[${t.len}]`;
      case 'array':
        return `${typeLabel(t.element)}[${t.count}]`;
      case 'struct':
        return t.def.name;
      case 'bitfield':
        return t.def.name;
    }
  }

  function offsetLabel(n: number): string {
    return '0x' + n.toString(16).padStart(3, '0').toUpperCase();
  }

  function toggle(path: string): void {
    if (collapsed.has(path)) collapsed.delete(path);
    else collapsed.add(path);
  }

  function bump(): void {
    version++;
    onByteChange?.();
  }

  function revert(): void {
    version++;
  }

  function commitNumber(node: DecodedNode, raw: string): void {
    if (node.type.kind !== 'prim') return;
    const v = isFloatPrim(node.type.prim) ? Number.parseFloat(raw) : Number.parseInt(raw, 10);
    if (!Number.isFinite(v)) return revert();
    const range = primRange(node.type.prim);
    const clamped = range ? Math.min(range.max, Math.max(range.min, v)) : v;
    writePrim(dv, node.offset, node.type.prim, clamped);
    bump();
  }

  function commitBig(node: DecodedNode, raw: string): void {
    if (node.type.kind !== 'prim') return;
    let v: bigint;
    try {
      v = BigInt(raw.trim());
    } catch {
      return revert();
    }
    writePrim(dv, node.offset, node.type.prim, v);
    bump();
  }

  function commitText(node: DecodedNode, raw: string): void {
    if (node.type.kind === 'char') writeChars(dv, node.offset, node.type.len, raw);
    else if (node.type.kind === 'wchar') writeChars16(dv, node.offset, node.type.len, raw);
    else return;
    bump();
  }

  function commitBits(node: DecodedNode, value: number): void {
    if (!node.bits) return;
    if (!Number.isFinite(value)) return revert();
    const { containerOffset, containerBytes, bitOffset, bitWidth } = node.bits;
    writeBits(dv, containerOffset, containerBytes, bitOffset, bitWidth, value);
    bump();
  }

  function commitCodec(node: DecodedNode, raw: string): void {
    if (node.type.kind !== 'prim' || !node.codec?.parse) return;
    const prev =
      node.value.kind === 'bigint'
        ? node.value.value
        : node.value.kind === 'number'
          ? node.value.value
          : 0;
    const next = node.codec.parse(raw, prev);
    if (next === null) return revert();
    writePrim(dv, node.offset, node.type.prim, next);
    bump();
  }
</script>

<div class="struct">
  <table class="struct-table">
    <tbody>
      {#each rows as { node, depth, group } (node.path)}
        <tr class:group>
          <td class="c-label">
            <div class="label">
              {#each guides(depth) as g (g)}
                <span class="guide"></span>
              {/each}
              {#if group}
                <button
                  type="button"
                  class="twisty"
                  class:open={!collapsed.has(node.path)}
                  aria-expanded={!collapsed.has(node.path)}
                  aria-label={node.name}
                  onclick={() => toggle(node.path)}
                >
                  <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
                    <path
                      d="M3.2 2 L7 5 L3.2 8"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              {:else}
                <span class="dot"></span>
              {/if}
              <span class="name" title={node.path}>{node.name}</span>
              <span class="type">{node.bits ? `:${node.bits.bitWidth}` : typeLabel(node.type)}</span
              >
            </div>
          </td>

          <td class="c-value">
            <div class="value">
              {#if group}
                {#if node.summary}<span class="summary mono">{node.summary}</span>{/if}
              {:else if node.bits}
                {@const v = node.value.kind === 'number' ? node.value.value : 0}
                {#if node.bits.bitWidth === 1}
                  <input
                    type="checkbox"
                    class="toggle"
                    checked={v === 1}
                    onchange={(e) => commitBits(node, e.currentTarget.checked ? 1 : 0)}
                  />
                {:else}
                  <input
                    type="number"
                    class="input"
                    min={0}
                    max={2 ** node.bits.bitWidth - 1}
                    value={v}
                    onchange={(e) => commitBits(node, Number.parseInt(e.currentTarget.value, 10))}
                  />
                {/if}
              {:else if node.codec}
                {@const raw =
                  node.value.kind === 'bigint'
                    ? node.value.value
                    : node.value.kind === 'number'
                      ? node.value.value
                      : 0}
                {#if node.codec.input === 'readonly'}
                  <span class="summary mono">{node.codec.display(raw)}</span>
                {:else}
                  <input
                    type={node.codec.input}
                    step={node.codec.input === 'datetime-local' ? 1 : undefined}
                    spellcheck="false"
                    class="input"
                    value={node.codec.display(raw)}
                    onchange={(e) => commitCodec(node, e.currentTarget.value)}
                  />
                {/if}
                {#if node.summary}<span class="summary mono">{node.summary}</span>{/if}
              {:else if node.type.kind === 'prim' && node.type.enumOptions}
                {@const opts = node.type.enumOptions}
                <select
                  class="input"
                  value={String(node.value.kind === 'number' ? node.value.value : 0)}
                  onchange={(e) => commitNumber(node, e.currentTarget.value)}
                >
                  {#each opts as opt, i (i)}
                    <option value={String(i)}>{i} · {opt}</option>
                  {/each}
                </select>
              {:else if node.value.kind === 'number'}
                {@const range = node.type.kind === 'prim' ? primRange(node.type.prim) : null}
                <input
                  type="number"
                  class="input"
                  min={range?.min}
                  max={range?.max}
                  value={node.value.value}
                  onchange={(e) => commitNumber(node, e.currentTarget.value)}
                />
              {:else if node.value.kind === 'bigint'}
                <input
                  type="text"
                  inputmode="numeric"
                  spellcheck="false"
                  class="input"
                  value={node.value.value.toString()}
                  onchange={(e) => commitBig(node, e.currentTarget.value)}
                />
                {#if node.summary}<span class="summary">{node.summary}</span>{/if}
              {:else if node.value.kind === 'text'}
                <input
                  type="text"
                  spellcheck="false"
                  class="input"
                  value={node.value.value}
                  onchange={(e) => commitText(node, e.currentTarget.value)}
                />
              {:else if node.value.kind === 'bytes'}
                <span class="summary mono">{node.summary ?? `${node.size} bytes`}</span>
              {/if}
            </div>
          </td>

          <td class="c-offset">
            {node.bits
              ? `${offsetLabel(node.offset)}.${node.bits.bitOffset}`
              : offsetLabel(node.offset)}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .struct {
    width: 100%;
    overflow-x: auto;
    border-radius: 0.85rem;
    background: var(--color-surface, #fff);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-edge, #d4d4d8) 45%, transparent);
  }
  .struct-table {
    width: 100%;
    border-collapse: collapse;
  }
  .struct-table td {
    vertical-align: middle;
  }
  .struct-table tr:not(:first-child) td {
    border-top: 1px solid color-mix(in srgb, var(--color-edge, #d4d4d8) 18%, transparent);
  }
  .struct-table tr:hover td {
    background: color-mix(in srgb, var(--color-surface-muted, #e4e4e7) 35%, transparent);
  }
  .struct-table tr.group td {
    background: color-mix(in srgb, var(--color-surface-sunken, #f4f4f5) 55%, transparent);
  }
  .struct-table tr.group:hover td {
    background: color-mix(in srgb, var(--color-surface-muted, #e4e4e7) 45%, transparent);
  }

  .c-label {
    width: 1px;
    white-space: nowrap;
    padding-right: 1.5rem;
  }
  .c-value {
    width: 100%;
  }
  .c-offset {
    width: 1px;
    white-space: nowrap;
    padding: 0 0.6rem 0 0.5rem;
    text-align: right;
  }

  .label {
    display: flex;
    align-items: stretch;
    gap: 0;
    min-height: 1.85rem;
  }
  .guide {
    flex: 0 0 1rem;
    margin-left: 0.45rem;
    border-left: 1px solid color-mix(in srgb, var(--color-edge, #d4d4d8) 50%, transparent);
  }
  .twisty {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 1.1rem;
    height: 1.1rem;
    margin: auto 0.25rem auto 0.45rem;
    color: var(--color-content-faint, #a1a1aa);
    transition:
      transform 0.13s ease,
      color 0.13s ease;
  }
  .twisty:hover {
    color: var(--color-content-strong, #18181b);
  }
  .twisty.open {
    transform: rotate(90deg);
  }
  .dot {
    flex: 0 0 1.1rem;
    height: 0.35rem;
    margin: auto 0.25rem auto 0.45rem;
    position: relative;
  }
  .dot::before {
    content: '';
    position: absolute;
    left: 0.3rem;
    top: 50%;
    width: 0.3rem;
    height: 0.3rem;
    transform: translateY(-50%);
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-edge, #d4d4d8) 80%, transparent);
  }

  .name {
    align-self: center;
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      'Segoe UI',
      sans-serif;
    font-size: 12.5px;
    color: var(--color-content-muted, #71717a);
    white-space: nowrap;
  }
  tr.group .name {
    color: var(--color-content-strong, #18181b);
    font-weight: 600;
  }
  .type {
    align-self: center;
    margin-left: 0.5rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: var(--color-content-faint, #a1a1aa);
    opacity: 0;
    transition: opacity 0.12s ease;
  }
  tr:hover .type {
    opacity: 1;
  }

  .value {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.2rem 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }

  .input {
    width: 15rem;
    max-width: 100%;
    text-align: right;
    border: 1px solid color-mix(in srgb, var(--color-edge, #d4d4d8) 55%, transparent);
    background: color-mix(in srgb, var(--color-surface-sunken, #f4f4f5) 70%, transparent);
    color: var(--color-content-strong, #18181b);
    border-radius: 0.4rem;
    padding: 0.18rem 0.5rem;
    font: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    transition:
      border-color 0.12s ease,
      box-shadow 0.12s ease,
      background 0.12s ease;
  }
  select.input {
    text-align: left;
  }
  .input:hover {
    border-color: color-mix(in srgb, var(--color-edge, #d4d4d8) 85%, transparent);
  }
  .input:focus {
    outline: none;
    background: var(--color-surface, #fff);
    border-color: var(--color-orange-500, #f97316);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-orange-500, #f97316) 22%, transparent);
  }

  .toggle {
    width: 1.05rem;
    height: 1.05rem;
    accent-color: var(--color-orange-500, #f97316);
    cursor: pointer;
  }

  .summary {
    display: inline-flex;
    align-items: center;
    padding: 0.08rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-orange-500, #f97316) 13%, transparent);
    color: color-mix(in srgb, var(--color-orange-500, #f97316) 70%, var(--color-content-strong));
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .summary.mono {
    background: color-mix(in srgb, var(--color-edge, #d4d4d8) 28%, transparent);
    color: var(--color-content-muted, #71717a);
    font-weight: 500;
  }

  .c-offset {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: var(--color-content-faint, #a1a1aa);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    user-select: none;
  }
</style>
