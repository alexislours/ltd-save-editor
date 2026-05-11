<script lang="ts">
  import { _ } from 'virtual:i18n/advanced';
  import { downloadBytes } from '$lib/sav/download';
  import { PILL_BUTTON_CLASS } from '$lib/ui/styles';

  type Props = {
    bytes: Uint8Array;
    editable?: boolean;
    downloadName?: string;
    onByteChange?: (index: number, value: number) => void;
  };
  let { bytes, editable = false, downloadName = 'data.bin', onByteChange }: Props = $props();

  const ROW_BYTES = 16;
  const PAGE_ROWS = 32;
  const PAGE_BYTES = ROW_BYTES * PAGE_ROWS;

  let page = $state(0);

  $effect(() => {
    void bytes;
    page = 0;
  });

  const HEX: string[] = (() => {
    const a = new Array<string>(256);
    for (let i = 0; i < 256; i++) a[i] = i.toString(16).padStart(2, '0');
    return a;
  })();

  const totalRows = $derived(Math.ceil(bytes.byteLength / ROW_BYTES));
  const pageCount = $derived(Math.max(1, Math.ceil(totalRows / PAGE_ROWS)));
  const startByte = $derived(page * PAGE_BYTES);
  const endByte = $derived(Math.min(bytes.byteLength, startByte + PAGE_BYTES));
  const offsetWidth = $derived(Math.max(4, (bytes.byteLength || 1).toString(16).length));

  const rows = $derived.by(() => {
    const out: { offset: number; cells: { idx: number; hex: string; ch: string }[] }[] = [];
    for (let off = startByte; off < endByte; off += ROW_BYTES) {
      const end = Math.min(endByte, off + ROW_BYTES);
      const cells: { idx: number; hex: string; ch: string }[] = new Array(end - off);
      for (let i = off; i < end; i++) {
        const b = bytes[i];
        cells[i - off] = {
          idx: i,
          hex: HEX[b],
          ch: b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.',
        };
      }
      out.push({ offset: off, cells });
    }
    return out;
  });

  function fmtOffset(n: number): string {
    return n.toString(16).padStart(offsetWidth, '0');
  }

  function copyAllHex(): void {
    const parts = new Array<string>(bytes.byteLength);
    for (let i = 0; i < bytes.byteLength; i++) parts[i] = HEX[bytes[i]];
    void navigator.clipboard?.writeText(parts.join(' '));
  }

  function asciiOf(b: number): string {
    return b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.';
  }

  function parseHexByte(raw: string): number | null {
    const v = raw.trim();
    if (!/^[0-9a-fA-F]{1,2}$/.test(v)) return null;
    const n = Number.parseInt(v, 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xff) return null;
    return n;
  }

  function commitByteEdit(input: HTMLInputElement): void {
    const idxAttr = input.dataset.idx;
    if (idxAttr === undefined) return;
    const idx = Number.parseInt(idxAttr, 10);
    if (!Number.isInteger(idx)) return;
    const prev = bytes[idx];
    const next = parseHexByte(input.value);
    if (next === null) {
      input.value = HEX[prev];
      return;
    }
    if (next !== prev) {
      bytes[idx] = next;
      input.classList.toggle('hex-byte-zero', next === 0);
      const asciiSpan = input.closest('tr')?.querySelector<HTMLElement>(`[data-ascii="${idx}"]`);
      if (asciiSpan) asciiSpan.textContent = asciiOf(next);
      onByteChange?.(idx, next);
    }
    input.value = HEX[bytes[idx]];
  }

  function onTableChange(e: Event): void {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.classList.contains('hex-byte')) {
      commitByteEdit(t);
    }
  }

  function onTableFocusIn(e: FocusEvent): void {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.classList.contains('hex-byte')) {
      t.select();
    }
  }
</script>

<div class="w-full rounded-xl bg-surface-sunken/60 p-3 ring-1 ring-edge/40">
  <div class="mb-2 flex flex-wrap items-center gap-2 text-xs">
    <span class="font-bold text-content-strong">
      {$_('advanced.hex_size_label', { values: { bytes: bytes.byteLength } })}
    </span>
    <span class="ml-auto flex flex-wrap gap-1.5">
      <button type="button" class="{PILL_BUTTON_CLASS} text-xs" onclick={copyAllHex}>
        {$_('advanced.hex_copy_action')}
      </button>
      <button
        type="button"
        class="{PILL_BUTTON_CLASS} text-xs"
        onclick={() => downloadBytes(bytes, downloadName)}
      >
        {$_('advanced.hex_download_action')}
      </button>
    </span>
  </div>

  {#if bytes.byteLength === 0}
    <p class="font-mono text-xs text-content-faint">{$_('advanced.hex_empty')}</p>
  {:else}
    <div class="hex-scroll">
      <table
        class="hex-table font-mono text-[12px] leading-5 text-content"
        onchange={onTableChange}
        onfocusin={onTableFocusIn}
      >
        <tbody>
          {#each rows as row (row.offset)}
            <tr>
              <td class="hex-offset pr-3 text-content-muted">{fmtOffset(row.offset)}</td>
              <td class="hex-cells">
                <div class="hex-row">
                  {#each row.cells as cell, i (cell.idx)}
                    {#if editable}
                      <input
                        type="text"
                        inputmode="text"
                        maxlength="2"
                        spellcheck="false"
                        autocomplete="off"
                        class="hex-byte"
                        class:hex-byte-zero={cell.hex === '00'}
                        class:hex-byte-gap={i === 8}
                        value={cell.hex}
                        data-idx={cell.idx}
                        aria-label={`byte ${cell.idx}`}
                      />
                    {:else}
                      <span
                        class="hex-byte-static"
                        class:hex-byte-zero={cell.hex === '00'}
                        class:hex-byte-gap={i === 8}>{cell.hex}</span
                      >
                    {/if}
                  {/each}
                </div>
              </td>
              <td class="hex-ascii whitespace-pre pl-3 text-content-muted">
                {#each row.cells as cell (cell.idx)}<span data-ascii={cell.idx}>{cell.ch}</span
                  >{/each}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if pageCount > 1}
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          type="button"
          class="{PILL_BUTTON_CLASS} text-xs disabled:opacity-50"
          disabled={page <= 0}
          onclick={() => (page = Math.max(0, page - 1))}
        >
          {$_('advanced.page_previous')}
        </button>
        <span class="text-content-muted">
          {$_('advanced.hex_page_status', {
            values: { start: startByte, end: endByte - 1, total: bytes.byteLength },
          })}
        </span>
        <button
          type="button"
          class="{PILL_BUTTON_CLASS} text-xs disabled:opacity-50"
          disabled={page >= pageCount - 1}
          onclick={() => (page = Math.min(pageCount - 1, page + 1))}
        >
          {$_('advanced.page_next')}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .hex-scroll {
    overflow-x: auto;
    max-width: 100%;
    text-align: center;
  }
  .hex-table {
    display: inline-table;
    border-collapse: collapse;
    table-layout: auto;
    text-align: left;
  }
  .hex-offset {
    vertical-align: middle;
    user-select: none;
    width: 1px;
    white-space: nowrap;
  }
  .hex-cells {
    vertical-align: middle;
    width: 1px;
    white-space: nowrap;
  }
  .hex-row {
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 0 0.125rem;
    white-space: nowrap;
  }
  .hex-ascii {
    vertical-align: middle;
    user-select: text;
    white-space: nowrap;
  }
  .hex-byte,
  .hex-byte-static {
    display: inline-block;
    flex: 0 0 auto;
    width: 1.5rem;
    text-align: center;
    border-radius: 0.25rem;
    padding: 0 0.125rem;
  }
  .hex-byte {
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
  }
  .hex-byte:hover {
    background: rgb(0 0 0 / 0.04);
  }
  .hex-byte:focus {
    outline: none;
    border-color: var(--color-orange-500, #f97316);
    background: rgb(255 255 255 / 0.6);
  }
  .hex-byte-zero {
    color: var(--color-content-faint, #999);
  }
  .hex-byte-gap {
    margin-left: 0.5rem;
  }
</style>
