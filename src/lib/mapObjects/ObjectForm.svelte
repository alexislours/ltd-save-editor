<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { hexU32 } from '../sav/format';
  import { INPUT_CLASS, LABEL_CLASS } from '../styles';
  import { actorDisplay, allActors, footprintSizeLabel } from './actors';
  import {
    clearSlot,
    getRow,
    objectsState,
    setActor,
    setLinkedMapId,
    setPosition,
    setRotation,
  } from './mapObjectsEditor.svelte';

  type Props = {
    index: number;
    onCleared: () => void;
  };
  let { index, onCleared }: Props = $props();

  const row = $derived.by(() => {
    void objectsState.rev;
    return getRow(index);
  });

  const display = $derived(row ? actorDisplay(row.actor) : null);
  const actorOptions = $derived(allActors());

  const ROTATIONS = [0, 90, 180, 270] as const;

  const displayToStored = (deg: number) => (360 - deg) % 360;

  function onActorChange(e: Event): void {
    if (!row) return;
    const value = (e.target as HTMLSelectElement).value;
    const hash = parseInt(value, 16);
    if (!Number.isFinite(hash)) return;
    setActor(row.index, hash >>> 0);
  }

  const inputClass = INPUT_CLASS;
  const labelClass = LABEL_CLASS;
</script>

{#if row && display}
  <div class="grid gap-4">
    <div class="flex items-center gap-2">
      <span
        class="h-3 w-3 shrink-0 rounded-full"
        style="background-color: {display.color}"
        aria-hidden="true"
      ></span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold text-content-strong">
          {display.label}
        </p>
        <p class="truncate font-mono text-[11px] text-content-faint">
          {display.key || hexU32(row.actor)}
          · {footprintSizeLabel(row.actor)}
          · slot #{row.index}
        </p>
      </div>
    </div>

    <label class="grid gap-1.5">
      <span class={labelClass}>Actor</span>
      <select class={inputClass} value={hexU32(row.actor)} onchange={onActorChange}>
        {#if !actorOptions.some((a) => a.hash === row.actor)}
          <option value={hexU32(row.actor)}>
            Unknown {hexU32(row.actor)}
          </option>
        {/if}
        {#each actorOptions as a (a.hash)}
          <option value={'0x' + a.hash.toString(16).padStart(8, '0')}>
            [{$_(`map.objects.group.${a.group}`)}] {a.label}
          </option>
        {/each}
      </select>
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="grid gap-1.5">
        <span class={labelClass}>Grid X</span>
        <input
          type="number"
          min="-1"
          max="119"
          class={inputClass}
          value={row.x}
          oninput={(e) =>
            setPosition(
              row.index,
              parseInt((e.currentTarget as HTMLInputElement).value || '0', 10),
              row.y,
            )}
        />
      </label>
      <label class="grid gap-1.5">
        <span class={labelClass}>Grid Y</span>
        <input
          type="number"
          min="-1"
          max="79"
          class={inputClass}
          value={row.y}
          oninput={(e) =>
            setPosition(
              row.index,
              row.x,
              parseInt((e.currentTarget as HTMLInputElement).value || '0', 10),
            )}
        />
      </label>
    </div>

    <div class="grid gap-1.5">
      <span class={labelClass}>Rotation</span>
      <div class="inline-flex overflow-hidden rounded-full ring-1 ring-edge/60">
        {#each ROTATIONS as deg (deg)}
          {@const selected = row.rot === displayToStored(deg)}
          <button
            type="button"
            class={[
              'flex-1 px-2 py-1.5 text-sm font-bold transition-colors',
              selected
                ? 'bg-orange-500 text-white'
                : 'bg-surface text-content hover:bg-surface-muted',
              deg !== 0 ? 'border-l border-edge/60' : '',
            ]}
            onclick={() => setRotation(row.index, displayToStored(deg))}
          >
            {deg}°
          </button>
        {/each}
      </div>
      {#if ![0, 90, 180, 270].includes(row.rot)}
        <p class="text-[11px] text-brand">
          Non-standard angle: {(((360 - row.rot) % 360) + 360) % 360}° (preserved)
        </p>
      {/if}
    </div>

    <label class="grid gap-1.5">
      <span class={labelClass}>
        Linked map
        <span class="font-normal text-content-faint">(-1 = none)</span>
      </span>
      <input
        type="number"
        min="-1"
        class={inputClass}
        value={row.link}
        oninput={(e) =>
          setLinkedMapId(
            row.index,
            parseInt((e.currentTarget as HTMLInputElement).value || '-1', 10),
          )}
      />
    </label>

    <button
      type="button"
      class="rounded-full border border-danger-edge bg-surface px-3 py-1.5 text-sm font-bold text-danger shadow-sm transition hover:bg-danger-bg"
      onclick={() => {
        if (clearSlot(row.index)) onCleared();
      }}
    >
      Delete object
    </button>
    <p class="-mt-2 text-[11px] text-content-faint">
      Deletes the object by zeroing its <code class="font-mono">ActorKey</code>. Position and
      rotation bytes are preserved for round-trip safety.
    </p>
  </div>
{:else}
  <p class="text-xs text-content-muted">No object selected.</p>
{/if}
