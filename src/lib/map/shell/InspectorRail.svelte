<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { hexU32 } from '$lib/sav/format';
  import { FORM_INPUT_CLASS } from '$lib/ui/styles';
  import { actorDisplay, allActors, isHouseActor, type ActorGroup } from '$lib/map/actors/actors';
  import {
    isPlayerLoaded,
    rowFootprintSizeLabel,
    ugcKindForActor,
    ugcSlotForRow,
  } from '$lib/map/actors/ugcDimensions.svelte';
  import ResidentsPanel from '../residents/ResidentsPanel.svelte';
  import { residentsForHouse, residentsState, vacateHouse } from '../residents/residents.svelte';
  import { PILL_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '$lib/ui/styles';
  import {
    clearSlot,
    getRow,
    liveRows,
    objectsState,
    placeAt,
    setActor,
    setLinkedMapId,
    setPosition,
    setRotation,
    snapshot,
    type ObjectSnapshot,
  } from '$lib/map/state/mapObjectsEditor.svelte';
  import { floorTiles, mapState } from '$lib/map/state/mapEditor.svelte';
  import { tileColorForHash, tileLabelForHash } from '$lib/map/tiles/tiles';
  import { pushAction } from '$lib/map/state/history.svelte';
  import { showToast } from '$lib/toast/toast.svelte';
  import {
    clear as clearSelection,
    selection,
    set as setSelection,
  } from '../tools/selection.svelte';
  import { deleteAll, linkAll } from '../tools/bulkOps';
  import { startActorDrag } from '../input/dragDrop';
  import {
    libraryEntries,
    librarySelection,
    selectLibraryActor,
  } from '../actors/actorLibrary.svelte';
  import { paintState } from '../tools/paintState.svelte';
  import { modeState, setMode } from '../state/layers.svelte';
  import { knownMapEntries, mapDisplayLabel } from '../tiles/mapNameRegistry';
  import { centerOnTile } from '../state/viewTransform.svelte';
  import StatsPanel from '../stats/StatsPanel.svelte';
  import TilePatternSwatch from '../tiles/TilePatternSwatch.svelte';
  import {
    findStore,
    findResults,
    setFindTranslator,
    setCursor as setFindCursor,
    cycleSnap as findCycleSnap,
    commitToSelection as findCommitToSelection,
  } from '../find/findStore.svelte';
  import type { FindResult } from '../find/findEngine';

  const SECTION_LABEL_CLASS =
    'text-[11px] font-semibold uppercase tracking-wider text-content-muted';

  const ROTATIONS = [0, 90, 180, 270] as const;
  const displayToStored = (deg: number): number => (360 - deg) % 360;

  const selectedCount = $derived(selection.indices.size);
  const singleIndex = $derived.by(() => {
    void selection.rev;
    if (selection.indices.size !== 1) return null;
    for (const i of selection.indices) return i;
    return null;
  });

  const row = $derived.by(() => {
    void objectsState.rev;
    if (singleIndex == null) return null;
    return getRow(singleIndex);
  });

  const groupBreakdown = $derived.by(() => {
    void objectsState.rev;
    void selection.rev;
    if (selectedCount < 2) return [] as Array<{ group: string; count: number }>;
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const counts = new Map<string, number>();
    for (const i of selection.indices) {
      const r = getRow(i);
      if (!r) continue;
      const g = actorDisplay(r.actor).group;
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return Array.from(counts, ([group, count]) => ({ group, count })).sort(
      (a, b) => b.count - a.count,
    );
  });

  let bulkLinkValue = $state('');

  function onBulkLinkApply(): void {
    const trimmed = bulkLinkValue.trim();
    if (trimmed === '') return;
    const id = parseInt(trimmed, 10);
    if (!Number.isFinite(id)) return;
    const action = linkAll(selection.indices, id);
    if (action) pushAction(action);
    bulkLinkValue = '';
  }

  function onBulkDelete(): void {
    const action = deleteAll(selection.indices);
    if (action) pushAction(action);
    clearSelection();
  }

  const display = $derived(row ? actorDisplay(row.actor) : null);
  const actorOptions = $derived(allActors());

  const ugcKind = $derived(row ? ugcKindForActor(row.actor) : null);
  const ugcSlot = $derived(
    row && ugcKind ? ugcSlotForRow(row.actor, row.ugcId, row.ugcExteriorId) : null,
  );
  const playerLoaded = $derived(isPlayerLoaded());
  const footprintLabel = $derived(row ? rowFootprintSizeLabel(row) : '');

  const sameActorIndices = $derived.by(() => {
    void objectsState.rev;
    if (!row) return [] as number[];
    const target = row.actor;
    const out: number[] = [];
    for (const r of liveRows()) {
      if (r.actor === target) out.push(r.index);
    }
    return out;
  });

  function onSelectAllSameActor(): void {
    if (sameActorIndices.length === 0) return;
    setSelection(sameActorIndices);
  }

  let editBefore: ObjectSnapshot | null = null;

  function captureBefore(): void {
    if (!row) return;
    editBefore = snapshot(row.index);
  }

  function commitEdit(): void {
    if (!row || !editBefore) return;
    const after = snapshot(row.index);
    if (!after) {
      editBefore = null;
      return;
    }
    if (snapshotsEqual(editBefore, after)) {
      editBefore = null;
      return;
    }
    pushAction({
      kind: 'object',
      changes: [{ index: row.index, before: editBefore, after }],
    });
    editBefore = null;
  }

  function snapshotsEqual(a: ObjectSnapshot, b: ObjectSnapshot): boolean {
    return (
      a.actorKey === b.actorKey &&
      a.gridX === b.gridX &&
      a.gridY === b.gridY &&
      Object.is(a.rotY, b.rotY) &&
      a.linkedMapId === b.linkedMapId &&
      a.addGameTime === b.addGameTime &&
      a.ugcExteriorId === b.ugcExteriorId &&
      a.ugcId === b.ugcId
    );
  }

  function onActorChange(e: Event): void {
    if (!row) return;
    captureBefore();
    const value = (e.target as HTMLSelectElement).value;
    const hash = parseInt(value, 16);
    if (!Number.isFinite(hash)) {
      editBefore = null;
      return;
    }
    setActor(row.index, hash >>> 0);
    commitEdit();
  }

  function onRotationClick(deg: number): void {
    if (!row) return;
    captureBefore();
    setRotation(row.index, displayToStored(deg));
    commitEdit();
  }

  function performDelete(): void {
    if (!row) return;
    captureBefore();
    if (!clearSlot(row.index)) {
      editBefore = null;
      return;
    }
    commitEdit();
    clearSelection();
  }

  let deleteConfirmOpen = $state(false);
  let deleteConfirmDialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!deleteConfirmDialog) return;
    if (deleteConfirmOpen && !deleteConfirmDialog.open) deleteConfirmDialog.showModal();
    else if (!deleteConfirmOpen && deleteConfirmDialog.open) deleteConfirmDialog.close();
  });

  const houseResidents = $derived.by(() => {
    void residentsState.rev;
    if (!row) return [];
    if (!isHouseActor(row.actor)) return [];
    if (row.link < 0) return [];
    return residentsForHouse(row.link);
  });

  function onDelete(): void {
    if (!row) return;
    if (isHouseActor(row.actor) && houseResidents.length > 0) {
      deleteConfirmOpen = true;
      return;
    }
    performDelete();
  }

  function onDeleteEvictAndDelete(): void {
    if (!row) return;
    if (row.link >= 0) vacateHouse(row.link);
    deleteConfirmOpen = false;
    performDelete();
  }

  function onDeleteHouseOnly(): void {
    deleteConfirmOpen = false;
    performDelete();
  }

  function onDeleteCancel(): void {
    deleteConfirmOpen = false;
  }

  function onClone(): void {
    if (!row) return;
    const change = placeAt(row.actor, row.x, row.y, row.rot);
    if (change == null) return;
    pushAction({ kind: 'object', changes: [change] });
    setSelection([change.index]);
  }

  function onDone(): void {
    clearSelection();
  }

  let linkPopoverOpen = $state(false);
  let linkPopoverEl: HTMLDivElement | undefined = $state();
  let linkTriggerEl: HTMLButtonElement | undefined = $state();
  let customLinkValue = $state('');

  const mapEntries = $derived.by(() => {
    void objectsState.rev;
    return knownMapEntries();
  });

  function applyLinkedMap(id: number): void {
    if (!row) return;
    captureBefore();
    setLinkedMapId(row.index, Number.isFinite(id) ? id | 0 : -1);
    commitEdit();
    linkPopoverOpen = false;
  }

  function snapToLink(id: number): void {
    if (!Number.isFinite(id) || id < 0) return;
    for (const r of liveRows()) {
      if (r.link === id) {
        setSelection([r.index]);
        centerOnTile(r.x, r.y);
        return;
      }
    }
    showToast('error', $_('map.inspector.link.no_object_links', { values: { id } }));
  }

  $effect(() => {
    if (!linkPopoverOpen) return;
    function onDoc(e: PointerEvent): void {
      const t = e.target as Node | null;
      if (!t) return;
      if (linkPopoverEl?.contains(t)) return;
      if (linkTriggerEl?.contains(t)) return;
      linkPopoverOpen = false;
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') linkPopoverOpen = false;
    }
    window.addEventListener('pointerdown', onDoc, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDoc, true);
      window.removeEventListener('keydown', onKey);
    };
  });

  const tileInfo = $derived.by(() => {
    void mapState.tileRev;
    const hash = paintState.selectedTileHash >>> 0;
    return {
      hash,
      label: tileLabelForHash(hash, $_),
      color: tileColorForHash(hash),
    };
  });

  const tileCount = $derived.by(() => {
    void mapState.tileRev;
    const tiles = floorTiles();
    if (!tiles) return 0;
    const target = paintState.selectedTileHash >>> 0;
    let n = 0;
    for (let i = 0; i < tiles.length; i++) if (tiles[i] >>> 0 === target) n++;
    return n;
  });

  let query = $state('');
  let groupFilter = $state<ActorGroup | 'all'>('all');

  const STATS_OPEN_KEY = 'map-v2:stats-open';
  let statsOpen = $state(readStatsOpen());

  function readStatsOpen(): boolean {
    if (typeof localStorage === 'undefined') return true;
    try {
      const v = localStorage.getItem(STATS_OPEN_KEY);
      if (v == null) return true;
      return v === '1';
    } catch {
      return true;
    }
  }

  function toggleStats(): void {
    statsOpen = !statsOpen;
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STATS_OPEN_KEY, statsOpen ? '1' : '0');
    } catch {
      // ignore
    }
  }

  function pickStatsGroup(g: ActorGroup): void {
    clearSelection();
    if (modeState.mode === 'paint') setMode('select');
    groupFilter = g;
    query = '';
  }

  $effect(() => {
    setFindTranslator($_);
  });

  const findRows = $derived.by(() => {
    void findStore.query;
    void findStore.open;
    return findStore.open ? findResults() : [];
  });

  function findRowKey(r: FindResult): string {
    switch (r.kind) {
      case 'tile':
        return `tile:${r.hash}`;
      case 'unknown-tile':
        return `unknown-tile:${r.hash}`;
      case 'actor':
        return `actor:${r.actorKey}`;
      case 'unknown-actor':
        return `unknown-actor:${r.hash}`;
      case 'link':
        return `link:${r.mapId}`;
      case 'ugc':
        return `ugc:${r.index}`;
    }
  }

  function findRowSwatchColor(r: FindResult): string {
    if (r.kind === 'tile' || r.kind === 'unknown-tile') return tileColorForHash(r.hash);
    if (r.kind === 'actor') return actorDisplay(r.actorKey).color;
    if (r.kind === 'unknown-actor') return actorDisplay(r.hash).color;
    if (r.kind === 'link') return '#0ea5e9';
    return '#a78bfa';
  }

  function findRowTitle(r: FindResult): string {
    switch (r.kind) {
      case 'tile':
        return r.label;
      case 'unknown-tile':
        return $_('map.inspector.find.unknown_tile', { values: { hex: hexU32(r.hash) } });
      case 'actor':
        return r.label;
      case 'unknown-actor':
        return $_('map.inspector.find.unknown_actor', { values: { hex: hexU32(r.hash) } });
      case 'link':
        return $_('map.inspector.find.link_to_map', { values: { id: r.mapId } });
      case 'ugc':
        return $_('map.inspector.find.ugc_index', { values: { index: r.index } });
    }
  }

  function findRowSubtitle(r: FindResult): string {
    switch (r.kind) {
      case 'tile':
        return $_('map.inspector.find.tile');
      case 'unknown-tile':
        return $_('map.inspector.find.unknown_tile_label');
      case 'actor':
        return $_(`map.objects.group.${r.group}`);
      case 'unknown-actor':
        return $_(`map.objects.group.unknown`);
      case 'link':
        return $_('map.inspector.link.label');
      case 'ugc':
        return $_('map.toolbar.layer_ugc');
    }
  }

  function findRowCount(r: FindResult): string {
    switch (r.kind) {
      case 'tile':
      case 'unknown-tile':
        return $_('map.stats.cells_count', {
          values: { count: r.cellCount },
        });
      case 'actor':
      case 'unknown-actor':
      case 'link':
        return $_('map.inspector.find.placements', {
          values: { count: r.placements.length },
        });
      case 'ugc': {
        const parts: string[] = [];
        if (r.cellCount > 0)
          parts.push($_('map.stats.cells_count', { values: { count: r.cellCount } }));
        if (r.objectIndices.length > 0)
          parts.push($_('map.stats.obj_count', { values: { count: r.objectIndices.length } }));
        return parts.join(' · ') || '0';
      }
    }
  }

  function onFindRowClick(i: number, e: MouseEvent): void {
    if (e.metaKey || e.ctrlKey) {
      setFindCursor(i);
      findCommitToSelection(e.shiftKey ? 'union' : 'replace');
      return;
    }
    setFindCursor(i);
    findCycleSnap(1);
  }

  const ALL_ENTRIES = $derived(libraryEntries());

  const filteredEntries = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return ALL_ENTRIES.filter((e) => {
      if (groupFilter !== 'all' && e.group !== groupFilter) return false;
      if (!q) return true;
      return (
        e.label.toLowerCase().includes(q) ||
        e.key.toLowerCase().includes(q) ||
        hexU32(e.hash).toLowerCase().includes(q)
      );
    });
  });
</script>

<aside
  class="row-start-2 col-start-3 hidden h-full w-80 flex-col overflow-hidden bg-surface ring-1 ring-edge/40 lg:flex"
>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    {#if selectedCount > 1}
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          <div class="flex items-center gap-2">
            <span
              class="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow"
            >
              {$_('map.inspector.multi.count', { values: { count: selectedCount } })}
            </span>
            <p class="truncate text-sm font-bold text-content-strong">
              {$_('map.inspector.multi.title')}
            </p>
          </div>

          <section class="grid gap-2">
            <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.multi.groups')}</span>
            <ul class="grid gap-1">
              {#each groupBreakdown as g (g.group)}
                <li class="flex items-center justify-between text-xs">
                  <span class="text-content">{$_(`map.objects.group.${g.group}`)}</span>
                  <span class="font-mono text-content-muted">{g.count}</span>
                </li>
              {/each}
            </ul>
          </section>

          <section class="grid gap-2">
            <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.multi.link_all')}</span>
            <div class="flex items-center gap-2">
              <input
                type="number"
                class={FORM_INPUT_CLASS}
                placeholder={$_('map.inspector.multi.link_placeholder')}
                bind:value={bulkLinkValue}
                onkeydown={(e) => {
                  if (e.key === 'Enter') onBulkLinkApply();
                }}
              />
              <button
                type="button"
                class="rounded-full bg-orange-500 px-3 py-1.5 text-sm font-bold text-white shadow hover:bg-orange-600 disabled:opacity-50"
                disabled={bulkLinkValue.trim() === ''}
                onclick={onBulkLinkApply}
              >
                {$_('map.inspector.multi.apply')}
              </button>
            </div>
          </section>
        </div>

        <div
          class="flex items-center justify-between gap-2 border-t border-edge/40 bg-surface px-4 py-3"
        >
          <button
            type="button"
            class="text-sm font-bold text-danger hover:underline"
            onclick={onBulkDelete}
          >
            {$_('map.inspector.multi.delete_all')}
          </button>
          <button
            type="button"
            class="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow hover:bg-orange-600"
            onclick={() => clearSelection()}
          >
            {$_('map.inspector.actions.done')}
          </button>
        </div>
      </div>
    {:else if row && display}
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          <div class="flex items-center gap-2">
            <span
              class="h-3 w-3 shrink-0 rounded-full"
              style="background-color: {display.color}"
              aria-hidden="true"
            ></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-content-strong">{display.label}</p>
              <p class="truncate font-mono text-[11px] text-content-faint">
                {display.key || hexU32(row.actor)} · {footprintLabel} · slot #{row.index}
              </p>
            </div>
          </div>

          <section class="grid gap-3">
            <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.actor.label')}</span>
            <select class={FORM_INPUT_CLASS} value={hexU32(row.actor)} onchange={onActorChange}>
              {#if !actorOptions.some((a) => a.hash === row.actor)}
                <option value={hexU32(row.actor)}>
                  {$_('map.stats.unknown_hex', { values: { hex: hexU32(row.actor) } })}
                </option>
              {/if}
              {#each actorOptions as a (a.hash)}
                <option value={'0x' + a.hash.toString(16).padStart(8, '0')}>
                  [{$_(`map.objects.group.${a.group}`)}] {a.label}
                </option>
              {/each}
            </select>
            <button
              type="button"
              class="rounded-full bg-surface-muted px-3 py-1.5 text-sm font-bold text-content ring-1 ring-edge/60 hover:bg-surface-sunken disabled:opacity-50"
              disabled={sameActorIndices.length <= 1}
              onclick={onSelectAllSameActor}
            >
              {$_('map.inspector.actor.select_all', { values: { count: sameActorIndices.length } })}
            </button>
          </section>

          <section class="grid gap-3">
            <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.position.label')}</span>
            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1.5">
                <span class="text-xs text-content-muted">{$_('map.inspector.position.grid_x')}</span
                >
                <input
                  type="number"
                  min="-1"
                  max="119"
                  class={FORM_INPUT_CLASS}
                  value={row.x}
                  onfocus={captureBefore}
                  onblur={() => commitEdit()}
                  oninput={(e) =>
                    setPosition(
                      row.index,
                      parseInt((e.currentTarget as HTMLInputElement).value || '0', 10),
                      row.y,
                    )}
                />
              </label>
              <label class="grid gap-1.5">
                <span class="text-xs text-content-muted">{$_('map.inspector.position.grid_y')}</span
                >
                <input
                  type="number"
                  min="-1"
                  max="79"
                  class={FORM_INPUT_CLASS}
                  value={row.y}
                  onfocus={captureBefore}
                  onblur={() => commitEdit()}
                  oninput={(e) =>
                    setPosition(
                      row.index,
                      row.x,
                      parseInt((e.currentTarget as HTMLInputElement).value || '0', 10),
                    )}
                />
              </label>
            </div>
          </section>

          <section class="grid gap-3">
            <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.rotation.label')}</span>
            <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
              {#each ROTATIONS as deg (deg)}
                {@const selected = row.rot === displayToStored(deg)}
                <button
                  type="button"
                  class={[
                    'flex-1 px-2 py-1.5 pointer-coarse:py-3 pointer-coarse:min-h-11 text-sm font-bold transition-colors',
                    selected
                      ? 'bg-orange-500 text-white'
                      : 'bg-surface text-content hover:bg-surface-muted',
                    deg !== 0 ? 'border-l border-edge/60' : '',
                  ]}
                  onclick={() => onRotationClick(deg)}
                >
                  {deg}°
                </button>
              {/each}
            </div>
            {#if ![0, 90, 180, 270].includes(row.rot)}
              <p class="text-[11px] text-brand">
                {$_('map.inspector.rotation.non_standard', {
                  values: { deg: (((360 - row.rot) % 360) + 360) % 360 },
                })}
              </p>
            {/if}
          </section>

          {#if ugcKind}
            <section class="grid gap-2">
              <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.ugc.label')}</span>
              {#if !playerLoaded}
                <p class="text-[11px] text-brand">{$_('map.inspector.ugc.needs_player')}</p>
              {:else if !ugcSlot}
                <p class="text-[11px] text-brand">{$_('map.inspector.ugc.missing_slot')}</p>
              {:else}
                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt class="text-content-muted">{$_('map.inspector.ugc.name')}</dt>
                  <dd class="truncate font-bold text-content-strong">
                    {ugcSlot.name ||
                      $_('map.inspector.ugc.unnamed', { values: { slot: ugcSlot.slot + 1 } })}
                  </dd>
                  <dt class="text-content-muted">{$_('map.inspector.ugc.shape')}</dt>
                  <dd class="text-content">{ugcSlot.typeLabel}</dd>
                  <dt class="text-content-muted">{$_('map.inspector.ugc.size')}</dt>
                  <dd class="font-mono text-content">{ugcSlot.size}</dd>
                  <dt class="text-content-muted">{$_('map.inspector.ugc.scale')}</dt>
                  <dd class="font-mono text-content">
                    {ugcSlot.scale.x.toFixed(2)} ×
                    {ugcSlot.scale.y.toFixed(2)} ×
                    {ugcSlot.scale.z.toFixed(2)}
                  </dd>
                  <dt class="text-content-muted">{$_('map.inspector.ugc.footprint')}</dt>
                  <dd class="font-mono text-content-strong">{footprintLabel}</dd>
                </dl>
              {/if}
            </section>
          {/if}

          <section class="grid gap-3">
            <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.link.label')}</span>
            <div class="flex items-stretch gap-2">
              <div class="relative flex-1">
                <button
                  bind:this={linkTriggerEl}
                  type="button"
                  class="flex h-9 w-full items-center justify-between rounded-lg border border-edge/60 bg-surface px-3 text-sm shadow-sm transition-colors hover:bg-surface-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  aria-haspopup="listbox"
                  aria-expanded={linkPopoverOpen}
                  onclick={() => (linkPopoverOpen = !linkPopoverOpen)}
                >
                  <span
                    class={[
                      'truncate',
                      mapDisplayLabel(row.link).muted
                        ? 'text-content-muted'
                        : 'text-content-strong',
                    ]}
                  >
                    {mapDisplayLabel(row.link).label}
                  </span>
                  <span class="ml-2 shrink-0 font-mono text-[11px] text-content-faint">
                    {row.link < 0 ? '-1' : row.link}
                  </span>
                </button>
                {#if linkPopoverOpen}
                  <div
                    bind:this={linkPopoverEl}
                    role="listbox"
                    class="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto rounded-xl bg-surface p-1 shadow-lg ring-1 ring-edge/60"
                  >
                    <button
                      type="button"
                      class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
                      role="option"
                      aria-selected={row.link === -1}
                      onclick={() => applyLinkedMap(-1)}
                    >
                      <span class="text-content-muted">{$_('map.inspector.link.none')}</span>
                      <span class="font-mono text-[11px] text-content-faint">-1</span>
                    </button>
                    {#each mapEntries as entry (entry.id)}
                      <button
                        type="button"
                        class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
                        role="option"
                        aria-selected={row.link === entry.id}
                        onclick={() => applyLinkedMap(entry.id)}
                      >
                        <span class={entry.name ? 'text-content-strong' : 'text-content-muted'}>
                          {entry.name ??
                            $_('map.inspector.link.fallback_map_name', {
                              values: { id: entry.id },
                            })}
                        </span>
                        <span class="font-mono text-[11px] text-content-faint">{entry.id}</span>
                      </button>
                    {/each}
                    <div class="mt-1 flex items-center gap-2 border-t border-edge/40 px-2 py-1.5">
                      <input
                        type="number"
                        min="-1"
                        placeholder={$_('map.inspector.link.custom_id_placeholder')}
                        bind:value={customLinkValue}
                        class="w-full rounded-md border border-edge/60 bg-surface px-2 py-1 text-xs"
                        onkeydown={(e) => {
                          if (e.key === 'Enter') {
                            const v = parseInt(customLinkValue, 10);
                            if (Number.isFinite(v)) applyLinkedMap(v);
                            customLinkValue = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        class="rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                        disabled={customLinkValue.trim() === ''}
                        onclick={() => {
                          const v = parseInt(customLinkValue, 10);
                          if (Number.isFinite(v)) applyLinkedMap(v);
                          customLinkValue = '';
                        }}
                      >
                        {$_('map.inspector.link.set')}
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
              <button
                type="button"
                class="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 px-3 text-sm font-bold text-white shadow hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                title={$_('map.inspector.link.snap_title')}
                disabled={row.link < 0}
                onclick={() => snapToLink(row.link)}
                aria-label={$_('map.inspector.link.snap_aria')}
              >
                {$_('map.inspector.link.goto')}
              </button>
            </div>
          </section>

          {#if isHouseActor(row.actor)}
            <ResidentsPanel actorHash={row.actor} linkedMapId={row.link} />
          {/if}
        </div>

        <div
          class="flex items-center justify-between gap-2 border-t border-edge/40 bg-surface px-4 py-3"
        >
          <button
            type="button"
            class="text-sm font-bold text-danger hover:underline"
            onclick={onDelete}
          >
            {$_('map.inspector.actions.delete')}
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-full bg-surface-muted px-3 py-1.5 text-sm font-bold text-content ring-1 ring-edge/60 hover:bg-surface-sunken"
              onclick={onClone}
            >
              {$_('map.inspector.actions.duplicate')}
            </button>
            <button
              type="button"
              class="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow hover:bg-orange-600"
              onclick={onDone}
            >
              {$_('map.inspector.actions.done')}
            </button>
          </div>
        </div>
      </div>
    {:else if modeState.mode === 'paint'}
      <div class="grid gap-4 overflow-y-auto p-4">
        <div class="flex items-center gap-3">
          <span
            class="h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-edge/60"
            aria-hidden="true"
          >
            <TilePatternSwatch hash={tileInfo.hash} class="block h-full w-full" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-content-strong">{tileInfo.label}</p>
            <p class="truncate font-mono text-[11px] text-content-faint">
              {hexU32(tileInfo.hash)}
            </p>
          </div>
        </div>

        <section class="grid gap-2">
          <span class={SECTION_LABEL_CLASS}>{$_('map.inspector.tile.usage')}</span>
          <div class="flex items-center justify-between text-sm">
            <span class="text-content">{$_('map.inspector.tile.with_hash')}</span>
            <span class="font-mono text-content-strong">{tileCount}</span>
          </div>
        </section>
      </div>
    {:else}
      <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div class="grid gap-2">
          <input
            type="search"
            placeholder={$_('map.inspector.actor_search_placeholder')}
            bind:value={query}
            class={FORM_INPUT_CLASS}
          />
          <div class="flex flex-wrap gap-1 text-xs">
            {#each ['all', 'house', 'facility', 'deco', 'step', 'room', 'ugc', 'unknown'] as const as g (g)}
              {@const active = groupFilter === g}
              <button
                type="button"
                class={[
                  'rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors',
                  active
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-surface-sunken/70 text-content ring-1 ring-edge/50 hover:bg-surface-sunken',
                ]}
                onclick={() => (groupFilter = g)}
              >
                {$_(`map.objects.group.${g}`)}
              </button>
            {/each}
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto rounded-xl bg-surface ring-1 ring-edge/40">
          {#if filteredEntries.length === 0}
            <p class="p-3 text-xs text-content-muted">{$_('map.inspector.find.no_matches')}</p>
          {:else}
            <ul class="divide-y divide-edge/40">
              {#each filteredEntries as entry (entry.hash)}
                {@const isSelected = librarySelection.actorKey === entry.hash}
                <li>
                  <button
                    type="button"
                    class={[
                      'group flex h-14 w-full items-center gap-2 px-3 text-left hover:bg-surface-muted',
                      isSelected ? 'bg-orange-500/10 ring-1 ring-inset ring-orange-500' : '',
                    ]}
                    onpointerdown={(e) => {
                      if (e.button !== 0) return;
                      selectLibraryActor(entry.hash);
                      startActorDrag(entry.hash, e);
                    }}
                    title={$_('map.inspector.library.drag_hint', {
                      values: { label: entry.label },
                    })}
                  >
                    <span
                      class="grid h-8 w-8 shrink-0 place-items-center rounded ring-1 ring-edge/60"
                      style="background-color: {entry.color}"
                      aria-hidden="true"
                    >
                      <span class="text-[10px] font-bold text-white/95">
                        {entry.width}×{entry.height}
                      </span>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-xs text-content-muted">
                        {$_(`map.objects.group.${entry.group}`)}
                      </span>
                      <span class="block truncate text-sm font-bold text-content">
                        {entry.label}
                      </span>
                    </span>
                    <span
                      class="shrink-0 font-mono text-[11px] text-content-faint group-hover:text-content-muted"
                    >
                      {hexU32(entry.hash)}
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  {#if findStore.open}
    <section class="flex flex-col border-t border-edge/40 bg-surface">
      <div class="flex h-10 w-full items-center justify-between px-3">
        <span class="text-sm font-bold text-content-strong">{$_('map.inspector.find.results')}</span
        >
        <span class="font-mono text-[11px] text-content-muted">
          {$_('map.inspector.find.rows', { values: { count: findRows.length } })}
        </span>
      </div>
      <div class="grid max-h-[40vh] gap-0.5 overflow-y-auto p-2">
        {#if findRows.length === 0}
          <p class="px-2 py-3 text-xs text-content-muted">
            {findStore.query.trim() === ''
              ? $_('map.inspector.find.type_to_search')
              : $_('map.inspector.find.no_matches')}
          </p>
        {:else}
          {#each findRows as r, i (findRowKey(r))}
            {@const active = i === findStore.cursor}
            <button
              type="button"
              class={[
                'group flex h-10 w-full items-center gap-2 rounded-md px-2 text-left transition-colors',
                active
                  ? 'bg-surface-muted ring-1 ring-inset ring-orange-500'
                  : 'hover:bg-surface-muted',
              ]}
              onpointerenter={() => setFindCursor(i)}
              onclick={(e) => onFindRowClick(i, e)}
              title={$_('map.inspector.result_hint')}
            >
              {#if r.kind === 'tile' || r.kind === 'unknown-tile'}
                <span
                  class="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded ring-1 ring-edge/60"
                  aria-hidden="true"
                >
                  <TilePatternSwatch hash={r.hash} class="block h-full w-full" />
                </span>
              {:else}
                <span
                  class="grid h-7 w-7 shrink-0 place-items-center rounded ring-1 ring-edge/60"
                  style="background-color: {findRowSwatchColor(r)}"
                  aria-hidden="true"
                ></span>
              {/if}
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[11px] text-content-muted">
                  {findRowSubtitle(r)}
                </span>
                <span class="block truncate text-sm font-bold text-content">
                  {findRowTitle(r)}
                </span>
              </span>
              <span class="shrink-0 font-mono text-[11px] text-content-muted tabular-nums">
                {findRowCount(r)}
              </span>
              {#if active}
                <span class="shrink-0 font-mono text-[10px] text-orange-600">
                  {$_('map.inspector.find.snap_kbd')}
                </span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </section>
  {:else}
    <StatsPanel open={statsOpen} onToggle={toggleStats} onPickGroup={pickStatsGroup} />
  {/if}
</aside>

<dialog
  bind:this={deleteConfirmDialog}
  onclose={onDeleteCancel}
  class="m-auto w-[min(28rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-xl ring-1 ring-edge/60 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
>
  <div class="border-b border-edge/40 bg-surface-muted/80 px-6 py-4">
    <h2 class="text-lg font-bold text-content-strong">
      {$_('map.delete_house.title')}
    </h2>
  </div>

  <div class="px-6 py-5">
    <p class="text-sm text-content">
      {$_('map.delete_house.intro', { values: { count: houseResidents.length } })}
    </p>
    <p class="mt-3 text-xs font-bold uppercase tracking-wider text-content-muted">
      {$_('map.residents.title')}
    </p>
    <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-strong">
      {#each houseResidents as r (r.miiIndex)}
        <li class="truncate">
          <span class="font-bold">{r.name || $_('map.residents.unnamed')}</span>
          <span class="font-mono text-[11px] text-content-faint">
            #{r.miiIndex} · {$_('map.residents.room_short', { values: { index: r.roomIndex } })}
          </span>
        </li>
      {/each}
    </ul>
  </div>

  <div
    class="flex flex-wrap justify-end gap-2 border-t border-edge/40 bg-surface-muted/40 px-6 py-3"
  >
    <button type="button" class={PILL_BUTTON_CLASS} onclick={onDeleteCancel}>
      {$_('map.common.cancel')}
    </button>
    <button
      type="button"
      class="rounded-full border border-edge/60 bg-surface px-3 py-1.5 text-sm font-bold text-danger shadow-sm hover:bg-surface-muted"
      onclick={onDeleteHouseOnly}
    >
      {$_('map.delete_house.delete_only_label')}
    </button>
    <button type="button" class={PRIMARY_BUTTON_CLASS} onclick={onDeleteEvictAndDelete}>
      {$_('map.delete_house.evict_label')}
    </button>
  </div>
</dialog>
