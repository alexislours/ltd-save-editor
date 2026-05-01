<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';

  export type WornOption = { keyHash: number; label: string };
  export type ColorPicker =
    | { mode: 'hidden' }
    | { mode: 'numeric' }
    | { mode: 'select'; ownedIndices: readonly number[] };

  type Props = {
    slotLabel: string;
    keyHash: number;
    options: readonly WornOption[];
    subtitle: string | null;
    imageUrl: string | null;
    imageAlt: string;
    colorIndex: number;
    colorPicker: ColorPicker;
    onCommitKey: (rawHash: string) => void;
    onCommitColor: (raw: string) => void;
    onClear: () => void;
    size?: 'compact' | 'large';
    accent?: 'neutral' | 'highlight';
    headerCaption?: string;
  };

  let {
    slotLabel,
    keyHash,
    options,
    subtitle,
    imageUrl,
    imageAlt,
    colorIndex,
    colorPicker,
    onCommitKey,
    onCommitColor,
    onClear,
    size = 'compact',
    accent = 'neutral',
    headerCaption,
  }: Props = $props();

  const containerClass = $derived(
    accent === 'highlight'
      ? 'rounded-lg bg-orange-500/5 p-3 ring-1 ring-orange-500/40'
      : 'rounded-lg bg-surface-sunken/40 p-3 ring-1 ring-edge/30',
  );

  const tileClass = $derived(
    size === 'large'
      ? 'flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface'
      : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-edge/40 bg-surface',
  );

  const hasUnknown = $derived(keyHash !== 0 && !options.some((o) => o.keyHash === keyHash));
</script>

<div class={containerClass}>
  <div class="flex items-baseline justify-between gap-2">
    <span class={LABEL_CLASS}>{slotLabel}</span>
    <button
      type="button"
      class="rounded border border-edge/50 px-1.5 py-0.5 text-[10px] font-bold text-content-muted hover:bg-surface-sunken hover:text-content-strong"
      onclick={onClear}
      title={$_('mii.belongings.worn_clear_tip')}
    >
      {$_('mii.belongings.worn_clear_action')}
    </button>
  </div>
  {#if headerCaption}
    <p class="mt-1 text-xs text-content-muted">{headerCaption}</p>
  {/if}
  <div class="mt-2 flex items-start gap-2">
    <div class={tileClass}>
      {#if imageUrl}
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          class="h-full w-full object-contain p-1"
        />
      {:else}
        <span class="text-[10px] text-content-faint">—</span>
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <select
        class={FORM_INPUT_CLASS}
        value={keyHash.toString()}
        onchange={(e) => onCommitKey(e.currentTarget.value)}
      >
        <option value="0">{$_('mii.belongings.worn_none')}</option>
        {#if hasUnknown}
          <option value={keyHash.toString()} selected>
            {$_('mii.belongings.worn_unknown', {
              values: { hash: '0x' + keyHash.toString(16).padStart(8, '0') },
            })}
          </option>
        {/if}
        {#each options as option (option.keyHash)}
          <option value={option.keyHash.toString()}>{option.label}</option>
        {/each}
      </select>
      {#if subtitle}
        <span class="mt-1 block truncate font-mono text-[10px] text-content-faint">
          {subtitle}
        </span>
      {/if}
    </div>
  </div>
  {#if keyHash !== 0 && colorPicker.mode !== 'hidden'}
    <div class="mt-2 flex items-center gap-2">
      <span class="text-xs font-bold text-content-muted">
        {$_('mii.belongings.worn_color')}
      </span>
      {#if colorPicker.mode === 'select'}
        <select
          class={FORM_INPUT_CLASS}
          value={colorIndex.toString()}
          onchange={(e) => onCommitColor(e.currentTarget.value)}
        >
          {#each colorPicker.ownedIndices as ci (ci)}
            <option value={ci.toString()}>
              {$_('mii.belongings.worn_color_option', { values: { index: ci + 1 } })}
            </option>
          {/each}
          {#if !colorPicker.ownedIndices.includes(colorIndex)}
            <option value={colorIndex.toString()} selected>
              {$_('mii.belongings.worn_color_invalid', { values: { index: colorIndex } })}
            </option>
          {/if}
        </select>
      {:else}
        <input
          type="text"
          inputmode="numeric"
          class="{FORM_INPUT_CLASS} font-mono"
          value={colorIndex.toString()}
          onchange={(e) => onCommitColor(e.currentTarget.value)}
        />
      {/if}
    </div>
  {/if}
</div>
