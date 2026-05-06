<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { safe } from '$lib/sav/format';
  import {
    troubleByHash,
    type Trouble,
    type TroubleTargetKey,
  } from '$lib/sav/lists/troubleList.svelte';
  import { CARD_CLASS } from '$lib/ui/styles';
  import { miiAccessor, miiState } from '$lib/mii/miiEditor.svelte';
  import MiiSlotSelector from '$lib/mii/MiiSlotSelector.svelte';
  import MiiTroubleCooldowns from './MiiTroubleCooldowns.svelte';
  import MiiTroubleSchedule from './MiiTroubleSchedule.svelte';
  import MiiTroubleSelector from './MiiTroubleSelector.svelte';
  import MiiTroubleTargetEditor from './MiiTroubleTargetEditor.svelte';
  import {
    TARGET_FIELD_KEYS,
    TROUBLE_FIELDS,
    TROUBLE_TARGET_FIELDS,
    type ItemTypeValue,
    type TroubleFieldKey,
  } from './troubleFields';
  import { captureSnapshot, revertTroubleFields, type SnapshotMap } from './troubleSnapshots';
  import { applyDefaultSchedule } from './troubleTime';

  type Props = {
    selectedIndex: number | null;
  };
  let { selectedIndex = $bindable(null) }: Props = $props();

  const mii = $derived(miiAccessor());
  const hasId = $derived(mii != null && mii.has(TROUBLE_FIELDS.id.leaf));
  const hasTargetItemType = $derived(mii != null && mii.has(TROUBLE_FIELDS.targetItemType.leaf));
  const hasNextGameTime = $derived(mii != null && mii.has(TROUBLE_FIELDS.nextGameTime.leaf));
  const hasEndGameTime = $derived(mii != null && mii.has(TROUBLE_FIELDS.endGameTime.leaf));
  const hasIsFirstDemoDone = $derived(mii != null && mii.has(TROUBLE_FIELDS.isFirstDemoDone.leaf));

  let originalSlices = $state<SnapshotMap>({});

  $effect(() => {
    void miiState.loadId;
    originalSlices = captureSnapshot(mii, selectedIndex);
  });

  function revertAll(): void {
    revertTroubleFields(mii, selectedIndex, originalSlices);
  }

  const currentTroubleHash = $derived.by(() => {
    if (!mii || selectedIndex == null || !hasId) return 0;
    return safe(() => mii.getElement(TROUBLE_FIELDS.id.leaf, selectedIndex!) as number, 0) >>> 0;
  });
  const currentTrouble = $derived(troubleByHash(currentTroubleHash));

  function impliedItemType(t: Trouble | null): ItemTypeValue {
    const r = t?.relevantTargets;
    if (!r) return -1;
    if (r.includes('targetUgcFood')) return 6;
    if (r.includes('targetUgcGoods')) return 7;
    if (r.includes('targetFood')) return 0;
    if (r.includes('targetCloth')) return 2;
    if (r.includes('targetCoordinate')) return 3;
    if (r.includes('targetGoods')) return 1;
    if (r.includes('targetMapObject')) return 4;
    return -1;
  }

  function clearField(key: TroubleFieldKey): void {
    if (!mii || selectedIndex == null) return;
    const f = TROUBLE_FIELDS[key];
    if (!mii.has(f.leaf)) return;
    const isNegOne =
      key === 'targetMii' ||
      key === 'targetItemType' ||
      key === 'targetUgcFood' ||
      key === 'targetUgcGoods' ||
      key === 'targetUgcText' ||
      key === 'targetPreset';
    for (let s = 0; s < f.perMii; s++) {
      const i = selectedIndex * f.perMii + s;
      try {
        mii.setElement(f.leaf, i, isNegOne ? -1 : (0 as never));
      } catch {
        /* skip */
      }
    }
  }

  function commitTroubleId(rawHash: string): void {
    if (!mii || selectedIndex == null || !hasId) return;
    const newHash = (Number.parseInt(rawHash, 10) || 0) >>> 0;
    if (newHash === currentTroubleHash) return;

    const next = newHash === 0 ? null : troubleByHash(newHash);
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const keepKeys = new Set<TroubleFieldKey>();
    if (next?.relevantTargets) {
      for (const tk of next.relevantTargets) {
        for (const fk of TROUBLE_TARGET_FIELDS[tk]) keepKeys.add(fk);
      }
    } else if (next) {
      for (const k of TARGET_FIELD_KEYS) keepKeys.add(k);
    }

    mii.setElement(TROUBLE_FIELDS.id.leaf, selectedIndex, newHash);

    for (const fk of TARGET_FIELD_KEYS) {
      if (keepKeys.has(fk)) continue;
      clearField(fk);
    }

    if (next) {
      const implied = impliedItemType(next);
      if (hasTargetItemType && implied !== -1) {
        mii.setElement(TROUBLE_FIELDS.targetItemType.leaf, selectedIndex, implied);
      }
      applyDefaultSchedule(mii, selectedIndex, next);
    }

    if (newHash === 0) {
      if (hasNextGameTime) {
        mii.setElement(TROUBLE_FIELDS.nextGameTime.leaf, selectedIndex, 0n);
      }
      if (hasEndGameTime) {
        mii.setElement(TROUBLE_FIELDS.endGameTime.leaf, selectedIndex, 0n);
      }
      if (hasIsFirstDemoDone) {
        mii.setElement(TROUBLE_FIELDS.isFirstDemoDone.leaf, selectedIndex, false);
      }
    }
  }

  const activeTargetKeys = $derived.by<TroubleTargetKey[]>(() => {
    if (!mii || selectedIndex == null || currentTroubleHash === 0) return [];
    if (currentTrouble?.relevantTargets) return currentTrouble.relevantTargets;
    const keys: TroubleTargetKey[] = [];
    const isPopulated = (fk: TroubleFieldKey): boolean => {
      const f = TROUBLE_FIELDS[fk];
      if (!mii.has(f.leaf) || selectedIndex == null) return false;
      for (let s = 0; s < f.perMii; s++) {
        const i = selectedIndex * f.perMii + s;
        try {
          const v = mii.getElement(f.leaf, i) as unknown;
          if (typeof v === 'number') {
            if (v !== 0 && v !== -1) return true;
          }
        } catch {
          /* empty */
        }
      }
      return false;
    };
    for (const tk of Object.keys(TROUBLE_TARGET_FIELDS) as TroubleTargetKey[]) {
      const fields = TROUBLE_TARGET_FIELDS[tk];
      if (fields.some((fk) => isPopulated(fk))) keys.push(tk);
    }
    return keys;
  });

  const ready = $derived(hasId);

  const issuesUrl =
    'https://github.com/alexislours/ltd-save-editor/issues/new?template=bug_report.yml';
</script>

{#snippet complexityWarning()}
  <aside
    role="note"
    class="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4 dark:bg-amber-500/15"
  >
    <div class="flex items-start gap-3">
      <span
        aria-hidden="true"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-base font-bold text-white"
        >!</span
      >
      <div class="flex-1">
        <h3 class="text-sm font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          {$_('mii.troubles.complexity_warning_title')}
        </h3>
        <p class="mt-2 text-sm text-amber-900 dark:text-amber-200">
          {$_('mii.troubles.complexity_warning_body')}
        </p>
        <p class="mt-2 text-sm text-amber-900 dark:text-amber-200">
          {$_('mii.troubles.complexity_warning_no_support')}
          <a
            href={issuesUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
          >
            {$_('mii.troubles.complexity_warning_report_link')}
          </a>.
        </p>
      </div>
    </div>
  </aside>
{/snippet}

{#if !ready}
  <div class="grid gap-4">
    {@render complexityWarning()}
    <MiiSlotSelector bind:selectedIndex />
    <section class={CARD_CLASS}>
      <p class="text-sm text-content-muted">{$_('mii.troubles.missing')}</p>
    </section>
  </div>
{:else}
  <div class="grid gap-4">
    {@render complexityWarning()}
    <MiiSlotSelector bind:selectedIndex />

    {#if selectedIndex != null}
      <MiiTroubleSelector
        {currentTroubleHash}
        {currentTrouble}
        onCommitTroubleId={commitTroubleId}
        onRevertAll={revertAll}
      />

      <MiiTroubleSchedule {selectedIndex} {currentTrouble} />

      {#if currentTroubleHash !== 0 && activeTargetKeys.length > 0}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-content-strong">
            {$_('mii.troubles.targets_heading')}
          </h3>
          <div class="mt-4 grid gap-4">
            {#each activeTargetKeys as targetKind (targetKind)}
              <MiiTroubleTargetEditor {selectedIndex} {targetKind} {currentTrouble} />
            {/each}
          </div>
        </section>
      {/if}

      <MiiTroubleCooldowns {selectedIndex} />
    {/if}
  </div>
{/if}
