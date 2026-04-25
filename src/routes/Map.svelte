<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import AdvancedPanel from '../lib/advanced/AdvancedPanel.svelte';
  import AppLayout from '../lib/AppLayout.svelte';
  import Card from '../lib/Card.svelte';
  import SaveBar from '../lib/SaveBar.svelte';
  import SaveTab from '../lib/SaveTab.svelte';
  import SubTabs from '../lib/SubTabs.svelte';
  import ZoomControls from '../lib/ZoomControls.svelte';
  import MapCanvas from '../lib/map/MapCanvas.svelte';
  import Palette from '../lib/map/Palette.svelte';
  import { canRedo, canUndo, clearHistory, redo, undo } from '../lib/map/history.svelte';
  import {
    MAP_HEIGHT,
    MAP_WIDTH,
    mapState,
    syncFromSave as syncFloorFromSave,
  } from '../lib/map/mapEditor.svelte';
  import {
    downloadMapSav,
    mapSave,
    markDirty as markGenericDirty,
  } from '../lib/map/mapSave.svelte';
  import {
    TILE_DEFS,
    tileColorForHash,
    tileDefForHash,
    tileLabelForHash,
    type TileDef,
  } from '../lib/map/tiles';
  import type { ToolKind } from '../lib/map/tools';
  import MapObjectsCanvas from '../lib/mapObjects/MapObjectsCanvas.svelte';
  import ObjectForm from '../lib/mapObjects/ObjectForm.svelte';
  import ObjectList from '../lib/mapObjects/ObjectList.svelte';
  import { actorDisplay, footprintRect, footprintSizeLabel } from '../lib/mapObjects/actors';
  import {
    liveRows,
    objectsState,
    syncFromSave as syncObjectsFromSave,
  } from '../lib/mapObjects/mapObjectsEditor.svelte';
  import { getSave } from '../lib/saveFile.svelte';
  import { CARD_BASE_CLASS, TOOLBAR_CLASS } from '../lib/styles';

  const save = $derived(getSave('map'));
  $effect(() => {
    void save;
    syncFloorFromSave();
    syncObjectsFromSave();
    clearHistory();
  });

  type SubTab = 'floor' | 'objects' | 'advanced';
  let subTab = $state<SubTab>('floor');

  const SUB_TABS: { value: SubTab; label: string }[] = [
    { value: 'floor', label: 'Floor' },
    { value: 'objects', label: 'Objects' },
    { value: 'advanced', label: 'Advanced' },
  ];

  let selectedTileHash = $state<number>(TILE_DEFS[0].hash);
  let tool = $state<ToolKind>('brush');
  let floorTileSize = $state(8);
  let floorHover = $state<{ x: number; y: number } | null>(null);

  function tilesView(): Uint32Array | null {
    void mapState.tileRev;
    if (!mapState.entry?.payload) return null;
    return new Uint32Array(
      mapState.entry.payload.buffer,
      mapState.entry.payload.byteOffset + 4,
      MAP_WIDTH * MAP_HEIGHT,
    );
  }

  const extraTiles = $derived.by((): TileDef[] => {
    const tiles = tilesView();
    if (!tiles) return [];
    const unknown = new SvelteSet<number>();
    for (let i = 0; i < tiles.length; i++) {
      const h = tiles[i] >>> 0;
      if (!tileDefForHash(h)) unknown.add(h);
    }
    return [...unknown].map((h) => ({
      hash: h,
      code: `0x${h.toString(16).padStart(8, '0')}`,
      label: `0x${h.toString(16).padStart(8, '0')}`,
      color: tileColorForHash(h),
    }));
  });

  const hoveredHash = $derived.by(() => {
    const tiles = tilesView();
    if (!floorHover || !tiles) return null;
    return tiles[floorHover.x * MAP_HEIGHT + floorHover.y];
  });

  let selectedObjectIndex = $state<number | null>(null);
  let objectsTileSize = $state(8);
  let objectsHover = $state<{ x: number; y: number } | null>(null);

  const liveCount = $derived.by(() => {
    void objectsState.rev;
    return liveRows().length;
  });

  const hoveredObjectInfo = $derived.by(() => {
    void objectsState.rev;
    if (!objectsHover) return null;
    const rows = liveRows();
    let best: { row: (typeof rows)[number]; area: number } | null = null;
    for (const r of rows) {
      if (r.x < 0 || r.y < 0) continue;
      const fp = footprintRect(r.actor, r.rot);
      const lx = r.x + fp.x0;
      const ly = r.y + fp.y0;
      if (
        objectsHover!.x < lx ||
        objectsHover!.x >= lx + fp.w ||
        objectsHover!.y < ly ||
        objectsHover!.y >= ly + fp.h
      )
        continue;
      const area = fp.w * fp.h;
      if (!best || area < best.area) best = { row: r, area };
    }
    if (!best) return null;
    const d = actorDisplay(best.row.actor);
    return { display: d, size: footprintSizeLabel(best.row.actor) };
  });

  const dirty = $derived(mapState.dirty || objectsState.dirty || mapSave.genericDirty);

  function download(): void {
    try {
      downloadMapSav('Map.sav');
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function onKey(e: KeyboardEvent): void {
    if (subTab !== 'floor') return;
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<AppLayout>
  <SaveTab
    kind="map"
    title="Map"
    description="Island layout, tile grid, and placed objects."
    error={mapState.error || objectsState.error}
    ready={mapState.entry != null}
  >
    {#if mapState.entry}
      <SaveBar {dirty} actionLabel="Download Map.sav" onAction={download}>
        {#snippet extra()}
          {#if subTab === 'objects' && objectsState.count > 0}
            <span class="font-normal text-slate-700">
              · {liveCount.toLocaleString()} placed / {objectsState.count.toLocaleString()}
              slots
            </span>
          {/if}
        {/snippet}
      </SaveBar>

      <SubTabs tabs={SUB_TABS} bind:value={subTab} label="Map sections" />

      {#if subTab === 'floor'}
        <div class={TOOLBAR_CLASS}>
          <div class="inline-flex overflow-hidden rounded-full ring-1 ring-amber-400/60">
            {#each [{ id: 'brush', label: 'Brush', title: 'Brush (click + drag to paint)' }, { id: 'fill', label: 'Fill', title: 'Bucket (click to flood fill)' }, { id: 'picker', label: 'Picker', title: 'Picker (click to sample a tile from the map)' }] as t, i (t.id)}
              <button
                type="button"
                class={[
                  'px-3 py-1.5 text-sm font-bold transition-colors',
                  i > 0 && 'border-l border-amber-400/60',
                  tool === t.id ? 'bg-orange-500 text-white' : 'bg-white text-slate-700',
                ]}
                onclick={() => (tool = t.id as ToolKind)}
                title={t.title}
              >
                {t.label}
              </button>
            {/each}
          </div>

          <div class="inline-flex overflow-hidden rounded-full ring-1 ring-amber-400/60">
            <button
              type="button"
              class="bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-amber-50 disabled:opacity-40"
              disabled={!canUndo()}
              onclick={undo}
              title="Undo (⌘Z)"
            >
              Undo
            </button>
            <button
              type="button"
              class="border-l border-amber-400/60 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-amber-50 disabled:opacity-40"
              disabled={!canRedo()}
              onclick={redo}
              title="Redo (⇧⌘Z)"
            >
              Redo
            </button>
          </div>

          <ZoomControls bind:value={floorTileSize} />

          <span class="ml-auto text-xs text-slate-600">
            Right-click anywhere to sample a tile.
          </span>
        </div>

        <Card>
          <div class="min-w-0">
            <MapCanvas
              tileSize={floorTileSize}
              {selectedTileHash}
              {tool}
              onHover={(c) => (floorHover = c)}
              onPickTile={(hash) => (selectedTileHash = hash >>> 0)}
            />

            <div class="mt-2 font-mono text-xs text-slate-600">
              {#if floorHover && hoveredHash != null}
                X {floorHover.x}, Y {floorHover.y} · {tileLabelForHash(hoveredHash)}
              {:else}
                {MAP_WIDTH} × {MAP_HEIGHT} tiles - hover for coordinates
              {/if}
            </div>
          </div>
        </Card>

        <Card>
          <div class="mb-3 flex items-center gap-2 text-sm">
            <span
              class="h-4 w-4 shrink-0 rounded-sm border border-black/10"
              style="background-color: {tileColorForHash(selectedTileHash)}"
              aria-hidden="true"
            ></span>
            <span class="truncate font-bold text-slate-900">
              {tileLabelForHash(selectedTileHash)}
            </span>
            {#if tileDefForHash(selectedTileHash)}
              <span class="ml-auto font-mono text-[11px] text-slate-500">
                {tileDefForHash(selectedTileHash)!.code}
              </span>
            {/if}
          </div>
          <Palette
            selectedHash={selectedTileHash}
            onSelect={(hash) => (selectedTileHash = hash >>> 0)}
            {extraTiles}
          />
        </Card>
      {:else if subTab === 'objects' && objectsState.count > 0}
        <div class={TOOLBAR_CLASS}>
          <ZoomControls bind:value={objectsTileSize} />
          <span class="ml-auto text-xs text-slate-600">
            Click a footprint to select · drag to move · floor shown dimmed.
          </span>
        </div>

        <Card>
          <div class="min-w-0">
            <MapObjectsCanvas
              tileSize={objectsTileSize}
              selectedIndex={selectedObjectIndex}
              onSelect={(i) => (selectedObjectIndex = i)}
              onHover={(c) => (objectsHover = c)}
            />
            <div class="mt-2 font-mono text-xs text-slate-600">
              {#if objectsHover && hoveredObjectInfo}
                X {objectsHover.x}, Y {objectsHover.y} · {hoveredObjectInfo.display.label} ({hoveredObjectInfo.size})
              {:else if objectsHover}
                X {objectsHover.x}, Y {objectsHover.y} - empty
              {:else}
                {objectsState.count.toLocaleString()} slots - hover for coordinates
              {/if}
            </div>
          </div>
        </Card>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div class="{CARD_BASE_CLASS} p-5">
            {#if selectedObjectIndex != null}
              <ObjectForm
                index={selectedObjectIndex}
                onCleared={() => (selectedObjectIndex = null)}
              />
            {:else}
              <p class="text-xs text-slate-600">Select an object on the map to edit.</p>
            {/if}
          </div>

          <div class="{CARD_BASE_CLASS} p-5">
            <ObjectList
              selectedIndex={selectedObjectIndex}
              onSelect={(i) => (selectedObjectIndex = i)}
            />
          </div>
        </div>
      {:else if subTab === 'objects'}
        <Card>
          <p class="text-sm text-slate-600">No object slots were found in this Map.sav.</p>
        </Card>
      {:else}
        <AdvancedPanel
          entries={mapSave.parsed?.entries ?? []}
          markDirty={markGenericDirty}
          parseSignal={mapSave.parseRev}
        />
      {/if}
    {/if}
  </SaveTab>
</AppLayout>
