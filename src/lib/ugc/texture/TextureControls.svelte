<script lang="ts">
  import { untrack } from 'svelte';
  import { _ } from 'svelte-i18n';
  import type { TextureReplaceState } from './textureReplaceState.svelte';

  type Props = {
    state: TextureReplaceState;
    busy: boolean;
  };
  let { state, busy }: Props = $props();

  $effect(() => {
    void state.fitMode;
    void state.pendingDecoded;
    void state.matteColor;
    void state.bc1Mode;
    void state.encoder;
    void state.originalUgctex;
    untrack(() => {
      void state.rebuildNewPreview();
    });
  });
</script>

<fieldset class="mt-4">
  <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
    {$_('ugc_editor.editor.transform.label')}
  </legend>
  <div class="mt-1.5 inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40">
    <button
      type="button"
      onclick={() => void state.applyTransform('rotateCcw')}
      title={$_('ugc_editor.editor.transform.rotate_ccw')}
      aria-label={$_('ugc_editor.editor.transform.rotate_ccw')}
      disabled={busy}
      class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
    <button
      type="button"
      onclick={() => void state.applyTransform('rotateCw')}
      title={$_('ugc_editor.editor.transform.rotate_cw')}
      aria-label={$_('ugc_editor.editor.transform.rotate_cw')}
      disabled={busy}
      class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </button>
    <button
      type="button"
      onclick={() => void state.applyTransform('flipH')}
      title={$_('ugc_editor.editor.transform.flip_h')}
      aria-label={$_('ugc_editor.editor.transform.flip_h')}
      disabled={busy}
      class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M12 3v18" stroke-dasharray="2 2" />
        <path d="M3 7l6 5-6 5V7z" fill="currentColor" />
        <path d="M21 7l-6 5 6 5V7z" />
      </svg>
    </button>
    <button
      type="button"
      onclick={() => void state.applyTransform('flipV')}
      title={$_('ugc_editor.editor.transform.flip_v')}
      aria-label={$_('ugc_editor.editor.transform.flip_v')}
      disabled={busy}
      class="grid h-7 w-7 place-items-center rounded-full text-content transition-colors hover:bg-surface hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M3 12h18" stroke-dasharray="2 2" />
        <path d="M7 3l5 6 5-6H7z" fill="currentColor" />
        <path d="M7 21l5-6 5 6H7z" />
      </svg>
    </button>
  </div>
</fieldset>

<fieldset class="mt-4">
  <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
    {$_('ugc_editor.editor.fit_mode.label')}
  </legend>
  <div
    class="mt-1.5 inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
    role="radiogroup"
    aria-label={$_('ugc_editor.editor.fit_mode.label')}
  >
    {#each ['cover', 'contain', 'fill'] as const as mode (mode)}
      <button
        type="button"
        role="radio"
        aria-checked={state.fitMode === mode}
        onclick={() => (state.fitMode = mode)}
        class={[
          'rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
          state.fitMode === mode
            ? 'bg-orange-500 text-white shadow'
            : 'text-content hover:text-content-strong',
        ]}
      >
        {$_(`ugc_editor.editor.fit_mode.${mode}`)}
      </button>
    {/each}
  </div>
  <p class="mt-1 text-xs text-content-muted">
    {$_(`ugc_editor.editor.fit_mode.${state.fitMode}_hint`)}
  </p>
</fieldset>

<fieldset class="mt-4">
  <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
    {$_('ugc_editor.editor.encoder.label')}
  </legend>
  <div
    class="mt-1.5 inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
    role="radiogroup"
    aria-label={$_('ugc_editor.editor.encoder.label')}
  >
    {#each ['custom', 'rgbcx'] as const as enc, idx (enc)}
      {@const encs = ['custom', 'rgbcx'] as const}
      <button
        type="button"
        role="radio"
        aria-checked={state.encoder === enc}
        tabindex={state.encoder === enc ? 0 : -1}
        onclick={() => (state.encoder = enc)}
        onkeydown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = encs[(idx + 1) % encs.length];
            state.encoder = next;
            (
              e.currentTarget.parentElement?.children[(idx + 1) % encs.length] as HTMLElement
            )?.focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = encs[(idx - 1 + encs.length) % encs.length];
            state.encoder = prev;
            (
              e.currentTarget.parentElement?.children[
                (idx - 1 + encs.length) % encs.length
              ] as HTMLElement
            )?.focus();
          }
        }}
        disabled={busy}
        class={[
          'rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50',
          state.encoder === enc
            ? 'bg-orange-500 text-white shadow'
            : 'text-content hover:text-content-strong',
        ]}
      >
        {$_(`ugc_editor.editor.encoder.${enc}`)}
      </button>
    {/each}
  </div>
  <p class="mt-1 text-xs text-content-muted">
    {$_(`ugc_editor.editor.encoder.${state.encoder}_hint`)}
  </p>
</fieldset>

{#if state.encoder === 'custom'}
  <fieldset class="mt-4">
    <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
      {$_('ugc_editor.editor.bc1_mode.label')}
    </legend>
    <div
      class="mt-1.5 inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
      role="radiogroup"
      aria-label={$_('ugc_editor.editor.bc1_mode.label')}
    >
      {#each ['auto', 'fourColor', 'threeColor'] as const as mode, idx (mode)}
        {@const modes = ['auto', 'fourColor', 'threeColor'] as const}
        <button
          type="button"
          role="radio"
          aria-checked={state.bc1Mode === mode}
          tabindex={state.bc1Mode === mode ? 0 : -1}
          onclick={() => (state.bc1Mode = mode)}
          onkeydown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const next = modes[(idx + 1) % modes.length];
              state.bc1Mode = next;
              (
                e.currentTarget.parentElement?.children[(idx + 1) % modes.length] as HTMLElement
              )?.focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              const prev = modes[(idx - 1 + modes.length) % modes.length];
              state.bc1Mode = prev;
              (
                e.currentTarget.parentElement?.children[
                  (idx - 1 + modes.length) % modes.length
                ] as HTMLElement
              )?.focus();
            }
          }}
          disabled={busy}
          class={[
            'rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50',
            state.bc1Mode === mode
              ? 'bg-orange-500 text-white shadow'
              : 'text-content hover:text-content-strong',
          ]}
        >
          {$_(`ugc_editor.editor.bc1_mode.${mode}`)}
        </button>
      {/each}
    </div>
    <p class="mt-1 text-xs text-content-muted">
      {$_(`ugc_editor.editor.bc1_mode.${state.bc1Mode}_hint`)}
    </p>
  </fieldset>
{/if}

{#if state.fitMode === 'contain'}
  <fieldset class="mt-4">
    <legend class="text-xs font-bold uppercase tracking-wider text-content-muted">
      {$_('ugc_editor.editor.matte.label')}
    </legend>
    <div
      class="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-full bg-surface-sunken p-1 ring-1 ring-edge/40"
      role="radiogroup"
      aria-label={$_('ugc_editor.editor.matte.label')}
    >
      {#each ['transparent', 'white', 'black', 'custom'] as const as opt (opt)}
        <button
          type="button"
          role="radio"
          aria-checked={state.matteOption === opt}
          onclick={() => (state.matteOption = opt)}
          class={[
            'rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
            state.matteOption === opt
              ? 'bg-orange-500 text-white shadow'
              : 'text-content hover:text-content-strong',
          ]}
        >
          {$_(`ugc_editor.editor.matte.${opt}`)}
        </button>
      {/each}
      {#if state.matteOption === 'custom'}
        <input
          type="color"
          bind:value={state.customMatteHex}
          aria-label={$_('ugc_editor.editor.matte.custom')}
          class="ml-1 h-6 w-8 cursor-pointer rounded border border-edge/60 bg-transparent"
        />
      {/if}
    </div>
  </fieldset>
{/if}
