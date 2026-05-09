<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { MAP_TILE_COUNT } from '$lib/map/state/mapEditor.svelte';
  import {
    LAYER_ORDER,
    layers,
    miniMapState,
    modeState,
    setLayerOpacity,
    setLayerVisible,
    setMiniMapVisible,
    setMode,
    type LayerKey,
    type Mode,
  } from '../state/layers.svelte';
  import {
    paintState,
    setBrushShape,
    setBrushSize,
    setPaintTool,
    type PaintTool,
  } from '../tools/paintState.svelte';
  import { BRUSH_SIZE_MAX, BRUSH_SIZE_MIN, type BrushShape } from '../tools/brushKernel';
  import { getBindingFor, openHelp, type KeyAction } from '../input/keymap.svelte';
  import { modifiedFloorCount } from '../state/baseline.svelte';
  import ExportPngDialog from '../export/ExportPngDialog.svelte';
  import ExportShareDialog from '../share/ExportShareDialog.svelte';
  import ImportShareDialog from '../share/ImportShareDialog.svelte';
  import { player } from '$lib/sav/schema';
  import { playerAccessor, playerState } from '$lib/player/playerEditor.svelte';

  function withBinding(title: string, action: KeyAction | null): string {
    if (!action) return title;
    const b = getBindingFor(action);
    return b ? `${title} - ${b}` : title;
  }

  const TOOLS: { id: PaintTool; labelKey: string; titleKey: string; action: KeyAction | null }[] = [
    {
      id: 'brush',
      labelKey: 'map.toolbar.tool_brush',
      titleKey: 'map.toolbar.tool_brush_title',
      action: 'tool.brush',
    },
    {
      id: 'fill',
      labelKey: 'map.toolbar.tool_fill',
      titleKey: 'map.toolbar.tool_fill_title',
      action: 'tool.fill',
    },
    {
      id: 'rectangle',
      labelKey: 'map.toolbar.tool_rect',
      titleKey: 'map.toolbar.tool_rect_title',
      action: 'tool.rectangle',
    },
    {
      id: 'picker',
      labelKey: 'map.toolbar.tool_picker',
      titleKey: 'map.toolbar.tool_picker_title',
      action: 'tool.picker',
    },
    {
      id: 'replace',
      labelKey: 'map.toolbar.tool_replace',
      titleKey: 'map.toolbar.tool_replace_title',
      action: 'tool.replace',
    },
  ];

  const BRUSH_SHAPES: { id: BrushShape; titleKey: string }[] = [
    { id: 'square', titleKey: 'map.toolbar.shape_square_title' },
    { id: 'diamond', titleKey: 'map.toolbar.shape_diamond_title' },
    { id: 'circle', titleKey: 'map.toolbar.shape_circle_title' },
  ];

  const MODES: { id: Mode; labelKey: string; titleKey: string; action: KeyAction | null }[] = [
    {
      id: 'paint',
      labelKey: 'map.toolbar.mode_paint',
      titleKey: 'map.toolbar.mode_paint_title',
      action: 'tool.brush',
    },
    {
      id: 'select',
      labelKey: 'map.toolbar.mode_select',
      titleKey: 'map.toolbar.mode_select_title',
      action: 'mode.select',
    },
  ];

  const LAYER_LABEL_KEYS: Record<LayerKey, string> = {
    floor: 'map.toolbar.layer_floor',
    objects: 'map.toolbar.layer_objects',
    fence: 'map.toolbar.layer_fence',
    ugc: 'map.toolbar.layer_ugc',
    diff: 'map.toolbar.layer_diff',
    grid: 'map.toolbar.layer_grid',
    tier: 'map.toolbar.layer_tier',
  };

  const tierLayerAvailable = $derived.by(() => {
    void playerState.loadId;
    void playerState.dirty;
    const acc = playerAccessor();
    return acc?.has(player.Player.UnlockMapLevel) ?? false;
  });

  const visibleLayerOrder = $derived(
    tierLayerAvailable ? LAYER_ORDER : LAYER_ORDER.filter((k) => k !== 'tier'),
  );

  let layersOpen = $state(false);
  let popoverEl: HTMLDivElement | undefined = $state();
  let triggerEl: HTMLButtonElement | undefined = $state();

  let overflowOpen = $state(false);
  let overflowEl: HTMLDivElement | undefined = $state();
  let overflowTriggerEl: HTMLButtonElement | undefined = $state();
  let exportOpen = $state(false);
  let shareExportOpen = $state(false);
  let shareImportOpen = $state(false);

  let brushOpen = $state(false);
  let brushPopoverEl: HTMLDivElement | undefined = $state();
  let brushTriggerEl: HTMLButtonElement | undefined = $state();

  let toolbarEl: HTMLDivElement | undefined = $state();
  let isFullscreen = $state(false);

  const diffCount = $derived(modifiedFloorCount());

  function toggleLayers(): void {
    layersOpen = !layersOpen;
  }

  function closeLayers(): void {
    layersOpen = false;
  }

  function toggleOverflow(): void {
    overflowOpen = !overflowOpen;
  }

  function closeOverflow(): void {
    overflowOpen = false;
  }

  function toggleBrush(): void {
    brushOpen = !brushOpen;
  }

  function closeBrush(): void {
    brushOpen = false;
  }

  function openExport(): void {
    closeOverflow();
    exportOpen = true;
  }

  function openShareExport(): void {
    closeOverflow();
    shareExportOpen = true;
  }

  function openShareImport(): void {
    closeOverflow();
    shareImportOpen = true;
  }

  function toggleFullscreen(): void {
    const target = toolbarEl?.parentElement;
    if (!target) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void target.requestFullscreen();
    }
  }

  function onFullscreenChange(): void {
    isFullscreen = document.fullscreenElement === toolbarEl?.parentElement;
  }

  $effect(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  });

  function onDocPointerDown(e: PointerEvent): void {
    const t = e.target as Node | null;
    if (!t) return;
    if (layersOpen && !popoverEl?.contains(t) && !triggerEl?.contains(t)) {
      closeLayers();
    }
    if (overflowOpen && !overflowEl?.contains(t) && !overflowTriggerEl?.contains(t)) {
      closeOverflow();
    }
    if (brushOpen && !brushPopoverEl?.contains(t) && !brushTriggerEl?.contains(t)) {
      closeBrush();
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    if (layersOpen) {
      closeLayers();
      e.preventDefault();
    }
    if (overflowOpen) {
      closeOverflow();
      e.preventDefault();
    }
    if (brushOpen) {
      closeBrush();
      e.preventDefault();
    }
  }

  $effect(() => {
    if (!layersOpen && !overflowOpen && !brushOpen) return;
    window.addEventListener('pointerdown', onDocPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onDocPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  });
</script>

<div
  bind:this={toolbarEl}
  class="row-start-1 col-span-3 relative z-20 flex h-11 pointer-coarse:h-14 items-center gap-3 pointer-coarse:gap-3 px-3 bg-surface/90 ring-1 ring-edge/60 backdrop-blur-sm"
>
  <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
    {#each MODES as m, i (m.id)}
      <button
        type="button"
        class={[
          'flex h-8 w-9 pointer-coarse:h-12 pointer-coarse:w-12 items-center justify-center transition-colors',
          i > 0 && 'border-l border-edge/60',
          modeState.mode === m.id ? 'bg-orange-500 text-white' : 'bg-surface text-content',
        ]}
        aria-pressed={modeState.mode === m.id}
        aria-label={$_(m.labelKey)}
        title={withBinding($_(m.titleKey), m.action)}
        onclick={() => setMode(m.id)}
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          {#if m.id === 'paint'}
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
            <path
              d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2"
            />
          {:else if m.id === 'select'}
            <path
              d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
            />
          {/if}
        </svg>
      </button>
    {/each}
  </div>

  {#if modeState.mode === 'paint'}
    <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
      {#each TOOLS as t, i (t.id)}
        <button
          type="button"
          class={[
            'flex h-8 w-9 pointer-coarse:h-12 pointer-coarse:w-12 items-center justify-center transition-colors',
            i > 0 && 'border-l border-edge/60',
            paintState.tool === t.id ? 'bg-orange-500 text-white' : 'bg-surface text-content',
          ]}
          aria-pressed={paintState.tool === t.id}
          aria-label={$_(t.labelKey)}
          title={withBinding($_(t.titleKey), t.action)}
          onclick={() => setPaintTool(t.id)}
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            {#if t.id === 'brush'}
              <path d="m11 10 3 3" />
              <path d="M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z" />
              <path d="M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031" />
            {:else if t.id === 'fill'}
              <path d="M11 7 6 2" />
              <path d="M18.992 12H2.041" />
              <path
                d="M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595"
              />
              <path
                d="m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33"
              />
            {:else if t.id === 'rectangle'}
              <rect x="3" y="3" width="18" height="18" rx="2" />
            {:else if t.id === 'picker'}
              <path
                d="m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12"
              />
              <path
                d="m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z"
              />
              <path d="m2 22 .414-.414" />
            {:else if t.id === 'replace'}
              <path d="M14 4a1 1 0 0 1 1-1" />
              <path d="M15 10a1 1 0 0 1-1-1" />
              <path d="M21 4a1 1 0 0 0-1-1" />
              <path d="M21 9a1 1 0 0 1-1 1" />
              <path d="m3 7 3 3 3-3" />
              <path d="M6 10V5a2 2 0 0 1 2-2h2" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            {/if}
          </svg>
        </button>
      {/each}
    </div>

    {#if paintState.tool === 'brush'}
      <div class="relative">
        <button
          bind:this={brushTriggerEl}
          type="button"
          class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 pointer-coarse:px-4 pointer-coarse:py-2.5 text-sm font-bold ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
          aria-haspopup="dialog"
          aria-expanded={brushOpen}
          title={$_('map.toolbar.brush_picker_title')}
          onclick={toggleBrush}
        >
          <span class="flex h-4 w-4 items-center justify-center text-content" aria-hidden="true">
            {#if paintState.brushShape === 'square'}
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16">
                <rect x="3" y="3" width="10" height="10" fill="currentColor" />
              </svg>
            {:else if paintState.brushShape === 'diamond'}
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16">
                <polygon points="8,2 14,8 8,14 2,8" fill="currentColor" />
              </svg>
            {:else}
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="5.5" fill="currentColor" />
              </svg>
            {/if}
          </span>
          <span class="tabular-nums">{paintState.brushSize}px</span>
          <svg
            class="h-3 w-3 text-content-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {#if brushOpen}
          <div
            bind:this={brushPopoverEl}
            role="dialog"
            aria-label={$_('map.toolbar.brush_picker_title')}
            class="absolute left-0 top-[calc(100%+6px)] z-30 w-[260px] rounded-2xl bg-surface ring-1 ring-edge/60 shadow-lg p-3 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between gap-3">
              <label
                for="brush-size-input"
                class="text-xs font-bold uppercase tracking-wide text-content-muted"
              >
                {$_('map.toolbar.brush_size_label')}
              </label>
              <div class="inline-flex items-center rounded-md ring-1 ring-edge/60 bg-surface">
                <input
                  id="brush-size-input"
                  type="number"
                  min={BRUSH_SIZE_MIN}
                  max={BRUSH_SIZE_MAX}
                  step="1"
                  value={paintState.brushSize}
                  class="brush-size-number w-10 bg-transparent px-2 py-1 text-right text-sm font-bold tabular-nums text-content focus:outline-none"
                  oninput={(e) => {
                    const n = Number(e.currentTarget.value);
                    if (Number.isFinite(n)) setBrushSize(n);
                  }}
                />
                <span class="pr-2 text-xs font-medium text-content-muted">px</span>
              </div>
            </div>
            <input
              type="range"
              min={BRUSH_SIZE_MIN}
              max={BRUSH_SIZE_MAX}
              step="1"
              value={paintState.brushSize}
              class="brush-size-range w-full"
              aria-label={$_('map.toolbar.brush_size_title', {
                values: { size: paintState.brushSize },
              })}
              oninput={(e) => setBrushSize(Number(e.currentTarget.value))}
            />

            <div class="border-t border-edge/60 pt-3">
              <div class="text-xs font-bold uppercase tracking-wide text-content-muted mb-1.5">
                {$_('map.toolbar.brush_shape_label')}
              </div>
              <div class="inline-flex w-full overflow-hidden rounded-md ring-1 ring-edge/60">
                {#each BRUSH_SHAPES as s, i (s.id)}
                  <button
                    type="button"
                    class={[
                      'flex flex-1 h-9 items-center justify-center transition-colors',
                      i > 0 && 'border-l border-edge/60',
                      paintState.brushShape === s.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-surface text-content hover:bg-surface-muted',
                    ]}
                    aria-pressed={paintState.brushShape === s.id}
                    aria-label={$_(s.titleKey)}
                    title={$_(s.titleKey)}
                    onclick={() => setBrushShape(s.id)}
                  >
                    {#if s.id === 'square'}
                      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden="true">
                        <rect x="3" y="3" width="10" height="10" fill="currentColor" />
                      </svg>
                    {:else if s.id === 'diamond'}
                      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden="true">
                        <polygon points="8,2 14,8 8,14 2,8" fill="currentColor" />
                      </svg>
                    {:else}
                      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="5.5" fill="currentColor" />
                      </svg>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}

  <div class="ml-auto flex items-center gap-2">
    <button
      type="button"
      class="inline-flex items-center justify-center h-8 w-8 pointer-coarse:h-12 pointer-coarse:w-12 rounded-full ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
      aria-label={$_('map.share.import_title')}
      title={$_('map.share.import_title')}
      onclick={openShareImport}
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="8 12 12 16 16 12" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>

    <div class="relative">
      <button
        bind:this={overflowTriggerEl}
        type="button"
        class="inline-flex items-center justify-center h-8 w-8 pointer-coarse:h-12 pointer-coarse:w-12 rounded-full ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
        aria-haspopup="menu"
        aria-expanded={overflowOpen}
        aria-label={$_('map.toolbar.overflow_label')}
        title={$_('map.toolbar.overflow_label')}
        onclick={toggleOverflow}
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      {#if overflowOpen}
        <div
          bind:this={overflowEl}
          role="menu"
          class="absolute right-0 top-[calc(100%+6px)] z-30 w-[200px] rounded-2xl bg-surface ring-1 ring-edge/60 shadow-lg p-1.5"
        >
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 rounded-lg px-3 h-10 text-sm font-medium text-content hover:bg-surface-muted"
            onclick={openExport}
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            {$_('map.export.title')}
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 rounded-lg px-3 h-10 text-sm font-medium text-content hover:bg-surface-muted"
            onclick={openShareExport}
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {$_('map.share.export_title')}
          </button>
        </div>
      {/if}
    </div>

    <div class="relative">
      <button
        bind:this={triggerEl}
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 pointer-coarse:px-4 pointer-coarse:py-2.5 text-sm font-bold ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
        aria-haspopup="dialog"
        aria-expanded={layersOpen}
        title={$_('map.toolbar.layers_button_title')}
        onclick={toggleLayers}
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 22 8 12 14 2 8 12 2" />
          <polyline points="2 16 12 22 22 16" />
          <polyline points="2 12 12 18 22 12" />
        </svg>
        {$_('map.toolbar.layers_button')}
      </button>

      {#if layersOpen}
        <div
          bind:this={popoverEl}
          role="dialog"
          aria-label={$_('map.toolbar.layers_button')}
          class="absolute right-0 top-[calc(100%+6px)] z-30 w-[280px] rounded-2xl bg-surface ring-1 ring-edge/60 shadow-lg p-3"
        >
          <ul class="flex flex-col gap-1.5">
            {#each visibleLayerOrder as key (key)}
              {@const layer = layers[key]}
              <li
                class="grid grid-cols-[24px_1fr_88px] items-center gap-2 py-1 pointer-coarse:py-2 pointer-coarse:min-h-11"
              >
                <input
                  id={`layer-vis-${key}`}
                  type="checkbox"
                  checked={layer.visible}
                  class="h-4 w-4 accent-orange-500"
                  onchange={(e) => setLayerVisible(key, e.currentTarget.checked)}
                />
                <label
                  for={`layer-vis-${key}`}
                  class="text-sm font-medium text-content select-none cursor-pointer flex items-center gap-1.5"
                >
                  {$_(LAYER_LABEL_KEYS[key])}
                  {#if key === 'diff' && layer.visible}
                    <span class="font-mono text-[10px] text-content-muted tabular-nums">
                      {diffCount} / {MAP_TILE_COUNT}
                    </span>
                  {/if}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(layer.opacity * 100)}
                  disabled={!layer.visible}
                  class="layer-opacity w-full disabled:opacity-40"
                  aria-label={`${$_(LAYER_LABEL_KEYS[key])} opacity`}
                  oninput={(e) => setLayerOpacity(key, Number(e.currentTarget.value) / 100)}
                />
              </li>
            {/each}
            <li
              class="grid grid-cols-[24px_1fr_88px] items-center gap-2 py-1 mt-1 border-t border-edge/60 pt-2"
            >
              <input
                id="layer-vis-minimap"
                type="checkbox"
                checked={miniMapState.visible}
                class="h-4 w-4 accent-orange-500"
                onchange={(e) => setMiniMapVisible(e.currentTarget.checked)}
              />
              <label
                for="layer-vis-minimap"
                class="text-sm font-medium text-content select-none cursor-pointer"
              >
                {$_('map.toolbar.layer_minimap')}
              </label>
            </li>
          </ul>
        </div>
      {/if}
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center h-8 w-8 pointer-coarse:h-12 pointer-coarse:w-12 rounded-full ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
      aria-label={$_('map.help.title')}
      title={withBinding($_('map.help.title'), 'help.open')}
      onclick={openHelp}
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>

    <button
      type="button"
      class="inline-flex items-center justify-center h-8 w-8 pointer-coarse:h-12 pointer-coarse:w-12 rounded-full ring-1 ring-edge/60 bg-surface text-content hover:bg-surface-muted"
      aria-pressed={isFullscreen}
      aria-label={$_(
        isFullscreen ? 'map.toolbar.fullscreen_exit_title' : 'map.toolbar.fullscreen_enter_title',
      )}
      title={$_(
        isFullscreen ? 'map.toolbar.fullscreen_exit_title' : 'map.toolbar.fullscreen_enter_title',
      )}
      onclick={toggleFullscreen}
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {#if isFullscreen}
          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        {:else}
          <path d="M3 8V5a2 2 0 0 1 2-2h3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
        {/if}
      </svg>
    </button>
  </div>
</div>

<ExportPngDialog open={exportOpen} onClose={() => (exportOpen = false)} />
<ExportShareDialog open={shareExportOpen} onClose={() => (shareExportOpen = false)} />
<ImportShareDialog open={shareImportOpen} onClose={() => (shareImportOpen = false)} />

<style>
  .brush-size-number {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .brush-size-number::-webkit-outer-spin-button,
  .brush-size-number::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
  }

  .brush-size-range,
  .layer-opacity {
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    background: color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 9999px;
    outline: none;
    cursor: pointer;
  }
  .brush-size-range::-webkit-slider-runnable-track,
  .layer-opacity::-webkit-slider-runnable-track {
    height: 4px;
    background: transparent;
    border-radius: 9999px;
  }
  .brush-size-range::-moz-range-track,
  .layer-opacity::-moz-range-track {
    height: 4px;
    background: color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 9999px;
  }
  .brush-size-range::-webkit-slider-thumb,
  .layer-opacity::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border-radius: 9999px;
    background: var(--color-orange-500, #f97316);
    border: 2px solid var(--color-surface, #fff);
    box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
    cursor: pointer;
  }
  .brush-size-range::-moz-range-thumb,
  .layer-opacity::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 9999px;
    background: var(--color-orange-500, #f97316);
    border: 2px solid var(--color-surface, #fff);
    box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
    cursor: pointer;
  }
  .brush-size-range:focus-visible::-webkit-slider-thumb,
  .layer-opacity:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--color-orange-500, #f97316);
    outline-offset: 2px;
  }
  .brush-size-range:focus-visible::-moz-range-thumb,
  .layer-opacity:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--color-orange-500, #f97316);
    outline-offset: 2px;
  }
</style>
