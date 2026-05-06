<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { allTroubles, troublePreview, type Trouble } from '$lib/sav/lists/troubleList.svelte';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '$lib/ui/styles';

  type Props = {
    currentTroubleHash: number;
    currentTrouble: Trouble | null;
    onCommitTroubleId: (rawHash: string) => void;
    onRevertAll: () => void;
  };
  let { currentTroubleHash, currentTrouble, onCommitTroubleId, onRevertAll }: Props = $props();

  const ui = $derived($locale);

  type TroubleGroup = { category: string; label: string; troubles: Trouble[] };
  const groupedTroubles = $derived.by<TroubleGroup[]>(() => {
    void ui;
    const all = allTroubles();
    const buckets = new SvelteMap<string, Trouble[]>();
    for (const t of all) {
      let arr = buckets.get(t.category);
      if (!arr) {
        arr = [];
        buckets.set(t.category, arr);
      }
      arr.push(t);
    }
    const out: TroubleGroup[] = [];
    for (const [category, list] of buckets) {
      const label = $_(`mii.troubles.category.${category}`, { default: category });
      list.sort((a, b) => a.name.localeCompare(b.name));
      out.push({ category, label, troubles: list });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  });

  const previewText = $derived(currentTrouble ? troublePreview(currentTrouble, ui) : null);

  function fmtMinutes(min: number): string {
    if (min <= 0) return '';
    if (min < 60) return $_('mii.troubles.duration_minutes', { values: { n: min } });
    const hours = Math.round(min / 60);
    if (hours < 48) return $_('mii.troubles.duration_hours', { values: { n: hours } });
    const days = Math.round(min / 1440);
    return $_('mii.troubles.duration_days', { values: { n: days } });
  }
</script>

<section class={CARD_CLASS}>
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div class="min-w-0">
      <h3 class="text-base font-bold text-content-strong">
        {$_('mii.troubles.section_active')}
      </h3>
      <p class="mt-0.5 text-xs text-content-muted">
        {$_('mii.troubles.section_active_caption')}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-edge/50 bg-transparent px-3 py-1.5 text-sm font-bold text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
        onclick={onRevertAll}
        title={$_('mii.troubles.revert_tip')}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
          <path d="M5 4V1L0 5l5 4V6h6a3 3 0 0 1 0 6H4v2h7a5 5 0 0 0 0-10H5z" />
        </svg>
        {$_('mii.troubles.revert_action')}
      </button>
      {#if currentTroubleHash !== 0}
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border border-danger-edge bg-surface px-3 py-1.5 text-sm font-bold text-danger shadow-sm transition-colors hover:bg-danger-bg"
          onclick={() => onCommitTroubleId('0')}
          title={$_('mii.troubles.reset_trouble_tip')}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
            <path
              d="M12.71 4.71 11.29 3.29 8 6.59 4.71 3.29 3.29 4.71 6.59 8l-3.3 3.29 1.42 1.42L8 9.41l3.29 3.3 1.42-1.42L9.41 8z"
            />
          </svg>
          {$_('mii.troubles.reset_trouble_action')}
        </button>
      {/if}
    </div>
  </div>

  <div class="mt-4 grid gap-4">
    <label class="block min-w-0">
      <span class={LABEL_CLASS}>{$_('mii.troubles.active_label')}</span>
      <select
        class={FORM_INPUT_CLASS}
        value={currentTroubleHash.toString()}
        onchange={(e) => onCommitTroubleId(e.currentTarget.value)}
      >
        <option value="0">{$_('mii.troubles.active_none')}</option>
        {#if currentTroubleHash !== 0 && !currentTrouble}
          <option value={currentTroubleHash.toString()} selected>
            {$_('mii.troubles.unknown', {
              values: { hash: '0x' + currentTroubleHash.toString(16).padStart(8, '0') },
            })}
          </option>
        {/if}
        {#each groupedTroubles as group (group.category)}
          <optgroup label={group.label}>
            {#each group.troubles as t (t.hash)}
              <option value={t.hash.toString()}>
                {troublePreview(t, ui) ?? t.name} · {t.name}
              </option>
            {/each}
          </optgroup>
        {/each}
      </select>
      {#if currentTrouble}
        <span class="mt-1 block font-mono text-[11px] text-content-faint">
          {currentTrouble.name} · 0x{currentTroubleHash.toString(16).padStart(8, '0')}
        </span>
      {/if}
    </label>

    {#if previewText}
      <blockquote
        class="rounded-md border-l-4 border-orange-500/70 bg-surface-muted px-3 py-2 text-sm italic text-content"
      >
        <span class="block text-[10px] font-bold tracking-wide text-content-faint uppercase">
          {$_('mii.troubles.preview_label')}
        </span>
        {previewText}
      </blockquote>
    {/if}

    {#if currentTrouble}
      <div class="flex flex-wrap gap-1.5 text-xs">
        <span
          class="rounded-full bg-surface-sunken px-2.5 py-0.5 font-bold text-content"
          title={$_('mii.troubles.meta.category_tip')}
        >
          {$_(`mii.troubles.category.${currentTrouble.category}`, {
            default: currentTrouble.category,
          })}
        </span>
        <span
          class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
          title={$_('mii.troubles.meta.method_tip')}
        >
          {currentTrouble.methodKey}
        </span>
        {#if currentTrouble.targetMiiNum > 0}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
            title={$_('mii.troubles.meta.target_mii_num_tip')}
          >
            {$_('mii.troubles.meta.target_mii_num', {
              values: { n: currentTrouble.targetMiiNum },
            })}
          </span>
        {/if}
        {#if currentTrouble.endMinute > 0}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
            title={$_('mii.troubles.meta.duration_tip')}
          >
            ⏱ {fmtMinutes(currentTrouble.endMinute)}
          </span>
        {/if}
        {#if currentTrouble.nextTimeMinute > 0}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
            title={$_('mii.troubles.meta.cooldown_tip')}
          >
            ↻ {fmtMinutes(currentTrouble.nextTimeMinute)}
          </span>
        {/if}
        {#if currentTrouble.rescueDay > 0}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
            title={$_('mii.troubles.meta.rescue_day_tip')}
          >
            {$_('mii.troubles.meta.rescue_day', { values: { n: currentTrouble.rescueDay } })}
          </span>
        {/if}
        {#if currentTrouble.enableIntroductionId}
          <span
            class="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-800 dark:text-amber-300"
            title={$_('mii.troubles.meta.gated_tip')}
          >
            🔒 {currentTrouble.enableIntroductionId}
          </span>
        {/if}
        {#if currentTrouble.foodAttr}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            🍽 {currentTrouble.foodAttr}
          </span>
        {/if}
        {#if currentTrouble.goodsAttr}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            🎁 {currentTrouble.goodsAttr}
          </span>
        {/if}
        {#if currentTrouble.clothType}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            👕 {currentTrouble.clothType}
          </span>
        {/if}
        {#if currentTrouble.clothEventType}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            🎉 {currentTrouble.clothEventType}
          </span>
        {/if}
        {#if currentTrouble.clothSeasonType && currentTrouble.clothSeasonType !== 'All'}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            🌤 {currentTrouble.clothSeasonType}
          </span>
        {/if}
        {#if currentTrouble.islandEditType}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            🏝 {currentTrouble.islandEditType}
            {#if currentTrouble.islandEditMapObjCategory}
              · {currentTrouble.islandEditMapObjCategory}
            {/if}
          </span>
        {/if}
        {#if currentTrouble.islandEditPrices.length > 0}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content"
            title={$_('mii.troubles.meta.prices_tip')}
          >
            💰 {currentTrouble.islandEditPrices.join(' / ')}
          </span>
        {/if}
        {#if currentTrouble.boostType}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            ⚡ {currentTrouble.boostType}
          </span>
        {/if}
        {#if currentTrouble.feelingType && currentTrouble.feelingType !== 'Normal'}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            💭 {currentTrouble.feelingType}
          </span>
        {/if}
        {#if currentTrouble.fightFlagType}
          <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content">
            ⚔ {currentTrouble.fightFlagType}
          </span>
        {/if}
        {#each currentTrouble.flags as flag (flag)}
          <span
            class="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-orange-700 dark:text-orange-300"
          >
            {$_(`mii.troubles.flag.${flag}`)}
          </span>
        {/each}
        {#if currentTrouble.generateRate === 0}
          <span
            class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-content-muted italic"
            title={$_('mii.troubles.meta.scripted_tip')}
          >
            {$_('mii.troubles.meta.scripted')}
          </span>
        {/if}
      </div>
    {/if}
  </div>
</section>
