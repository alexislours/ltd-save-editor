<script lang="ts">
  import { _ } from 'virtual:i18n/mii+residents+advanced';
  import { safe } from '$lib/sav/format';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import { showToast } from '$lib/toast/toast.svelte';
  import { syncResidents } from '$lib/map/residents/residents.svelte';
  import { syncFromSave as syncMapObjects } from '$lib/map/state/mapObjectsEditor.svelte';
  import { syncFromSave as syncPlayer } from '$lib/player/playerEditor.svelte';
  import { isSaveLoaded } from '$lib/saveFile/saveFile.svelte';
  import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS, PILL_BUTTON_CLASS } from '$lib/ui/styles';
  import { miiAccessor, miiState } from './miiEditor.svelte';
  import { DEFAULT_CHAR_INFO_EX } from './ownership/defaultCharInfoEx';
  import { deleteMii } from './ownership/deleteMii';
  import { populatedMiiIndices } from './ownership/populated';

  type Props = {
    selectedIndex: number | null;
  };
  let { selectedIndex = $bindable(null) }: Props = $props();

  const mii = $derived(miiAccessor());
  const hasName = $derived(mii != null && mii.has(MII_SCHEMA.Mii.Name.Name));
  const namedIndices = $derived.by<number[]>(() => {
    void miiState.rev;
    if (!mii || !hasName) return [];
    const names = mii.get(MII_SCHEMA.Mii.Name.Name);
    const out: number[] = [];
    for (let i = 0; i < names.length; i++) {
      if (names[i].length > 0) out.push(i);
    }
    return out;
  });
  const canStampCharInfoEx = $derived(
    mii != null &&
      mii.has(MII_SCHEMA.Mii.CharInfoEx) &&
      namedIndices.length > 0 &&
      namedIndices.every((i) => {
        const bytes = mii.getElement(MII_SCHEMA.Mii.CharInfoEx, i);
        for (let b = 0; b < bytes.length; b++) if (bytes[b] !== 0) return false;
        return true;
      }),
  );

  function stampDefaultCharInfoEx(): void {
    if (!mii) return;
    const targets = namedIndices;
    for (const i of targets) {
      mii.setElement(MII_SCHEMA.Mii.CharInfoEx, i, new Uint8Array(DEFAULT_CHAR_INFO_EX));
    }
    showToast(
      'success',
      $_('mii.panel.fix_zero_charinfoex_done', { values: { count: targets.length } }),
    );
  }

  type Slot = {
    index: number;
    name: string;
    level: number | null;
    xpPercent: number | null;
  };
  const slots = $derived.by<Slot[]>(() => {
    void miiState.rev;
    if (!mii || !hasName) return [];
    const out: Slot[] = [];
    const hasLevel = mii.has(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level);
    const hasMeter = mii.has(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Meter);
    for (const i of populatedMiiIndices(mii)) {
      const n = safe(() => mii.getElement(MII_SCHEMA.Mii.Name.Name, i), '');
      const level = hasLevel
        ? safe(
            () => mii.getElement(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level, i) + 1,
            null as number | null,
          )
        : null;
      let xpPercent: number | null = null;
      if (hasMeter) {
        const m = safe(() => mii.getElement(MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Meter, i), null);
        if (m !== null) xpPercent = Math.max(0, Math.min(100, m));
      }
      out.push({ index: i, name: n, level, xpPercent });
    }
    return out;
  });

  $effect(() => {
    if (slots.length === 0) {
      selectedIndex = null;
      return;
    }
    if (selectedIndex == null || !slots.some((s) => s.index === selectedIndex)) {
      selectedIndex = slots[0].index;
    }
  });

  const selectedSlot = $derived(
    selectedIndex == null ? null : (slots.find((s) => s.index === selectedIndex) ?? null),
  );

  function slotLabel(slot: Slot): string {
    const params = { index: slot.index + 1, name: slot.name };
    if (slot.level == null) {
      return $_('mii.panel.slot_label', { values: params });
    }
    return $_('mii.panel.slot_label_with_level', {
      values: { ...params, level: slot.level },
    });
  }

  let confirmingDelete = $state(false);
  const canDelete = $derived(isSaveLoaded('mii') && isSaveLoaded('map') && isSaveLoaded('player'));

  function deleteSelected(): void {
    if (!mii || selectedSlot == null || !canDelete) return;
    const name = selectedSlot.name;
    syncMapObjects();
    syncResidents();
    syncPlayer();
    deleteMii(selectedSlot.index);
    showToast('success', $_('mii.panel.delete_done', { values: { name } }));
  }
</script>

{#if !hasName}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('mii.panel.no_name_spine')}</p>
  </section>
{:else if slots.length === 0}
  <section class={CARD_CLASS}>
    {#if canStampCharInfoEx}
      <p class="text-sm text-content-muted">{$_('mii.panel.fix_zero_charinfoex')}</p>
      <button type="button" class="{PILL_BUTTON_CLASS} mt-3" onclick={stampDefaultCharInfoEx}>
        {$_('mii.panel.fix_zero_charinfoex_button')}
      </button>
    {:else}
      <p class="text-sm text-content-muted">{$_('mii.panel.no_slots')}</p>
    {/if}
  </section>
{:else}
  <section class={CARD_CLASS}>
    <label class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.panel.selector_label')}</span>
      <select
        class="{FORM_INPUT_CLASS} max-w-md"
        value={selectedIndex ?? ''}
        onchange={(e) => {
          const n = Number.parseInt(e.currentTarget.value, 10);
          selectedIndex = Number.isFinite(n) ? n : null;
        }}
      >
        {#each slots as slot (slot.index)}
          <option value={slot.index}>{slotLabel(slot)}</option>
        {/each}
      </select>
      <span class="mt-1 block text-xs text-content-muted">
        {$_('mii.panel.slot_count', { values: { count: slots.length } })}
      </span>
    </label>

    {#if selectedSlot}
      <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="text-2xl font-bold text-content-strong">
          {selectedSlot.name}
        </span>
        {#if selectedSlot.level != null}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 font-mono text-xs font-bold text-warn"
            title="Mii.MiiMisc.SatisfyInfo.Level"
          >
            {$_('mii.panel.level_pill', { values: { level: selectedSlot.level } })}
          </span>
        {/if}
        <span class="text-xs text-content-muted">
          {$_('mii.panel.slot_short', { values: { index: selectedSlot.index + 1 } })}
        </span>
        <button
          type="button"
          class="ml-auto self-center inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-3 py-1.5 text-xs font-bold text-danger ring-1 ring-danger-edge/70 transition-colors hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-danger-bg disabled:hover:text-danger"
          disabled={!canDelete}
          title={canDelete ? undefined : $_('mii.panel.delete_needs_map')}
          onclick={() => (confirmingDelete = true)}
        >
          {$_('mii.panel.delete_button')}
        </button>
      </div>
      {#if selectedSlot.xpPercent != null}
        <div class="mt-3 max-w-md" title="Mii.MiiMisc.SatisfyInfo.Meter">
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-bold text-content-strong">
              {$_('mii.panel.level_meter_label')}
            </span>
            <span class="font-mono text-xs text-content">
              {selectedSlot.xpPercent}%
            </span>
          </div>
          <div
            class="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={selectedSlot.xpPercent}
          >
            <div
              class="h-full rounded-full bg-orange-500 transition-[width]"
              style:width="{selectedSlot.xpPercent}%"
            ></div>
          </div>
        </div>
      {/if}
    {/if}
  </section>

  <ConfirmDialog
    bind:open={confirmingDelete}
    title={$_('mii.panel.delete_confirm_title')}
    body={$_('mii.panel.delete_confirm_body', { values: { name: selectedSlot?.name ?? '' } })}
    confirmLabel={$_('mii.panel.delete_button')}
    onConfirm={deleteSelected}
  />
{/if}
