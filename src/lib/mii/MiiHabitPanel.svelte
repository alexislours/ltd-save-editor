<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { safe } from '$lib/sav/format';
  import {
    allHabits,
    HABIT_STATE_NEVER_OWNED,
    HABIT_STATE_OWN,
    HABIT_STATE_UNOWN,
    habitCaption,
    habitLabel,
    type Habit,
    type HabitCategory,
  } from '$lib/sav/lists/habitList.svelte';
  import { buildHashMap } from '$lib/sav/materialized/schemaIndex';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import type { SchemaLeaf } from '$lib/sav/schema/leaf';
  import { CARD_CLASS, PILL_BUTTON_CLASS, TAB_PILL_CLASS } from '$lib/ui/styles';
  import { miiAccessor } from './miiEditor.svelte';
  import MiiSlotSelector from './MiiSlotSelector.svelte';

  type Props = {
    selectedIndex: number | null;
  };
  let { selectedIndex = $bindable(null) }: Props = $props();

  const ui = $derived($locale);

  const SCHEMA_BY_HASH = buildHashMap(MII_SCHEMA);

  function leafForHash(hash: number): SchemaLeaf | null {
    return SCHEMA_BY_HASH.get(hash >>> 0) ?? null;
  }

  const habits = $derived(allHabits());

  const CATEGORY_ORDER: HabitCategory[] = [
    'WalkType',
    'StandType',
    'EatType',
    'GreetingType',
    'GetAngryType',
    'ExpressionType',
    'VoiceType',
    'StomachType',
    'OtherType',
  ];

  type Group = { category: HabitCategory; label: string; habits: Habit[] };
  const grouped = $derived.by<Group[]>(() => {
    void ui;
    const buckets = new SvelteMap<HabitCategory, Habit[]>();
    for (const h of habits) {
      let arr = buckets.get(h.category);
      if (!arr) {
        arr = [];
        buckets.set(h.category, arr);
      }
      arr.push(h);
    }
    const out: Group[] = [];
    for (const cat of CATEGORY_ORDER) {
      const list = buckets.get(cat);
      if (!list || list.length === 0) continue;
      list.sort((a, b) => {
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
        return habitLabel(a, ui).localeCompare(habitLabel(b, ui));
      });
      out.push({
        category: cat,
        label: $_(`mii.habits.category.${cat}`, { default: cat }),
        habits: list,
      });
    }
    return out;
  });

  let selectedCategory = $state<HabitCategory>('WalkType');
  $effect(() => {
    if (grouped.length === 0) return;
    if (!grouped.some((g) => g.category === selectedCategory)) {
      selectedCategory = grouped[0].category;
    }
  });

  const currentGroup = $derived(grouped.find((g) => g.category === selectedCategory) ?? null);

  function getBool(hash: number): boolean {
    if (selectedIndex == null) return false;
    const mii = miiAccessor();
    if (!mii) return false;
    const leaf = leafForHash(hash);
    if (!leaf || !mii.has(leaf)) return false;
    return safe(() => mii.getElement(leaf, selectedIndex!) as boolean, false);
  }

  function setBool(hash: number, v: boolean): void {
    if (selectedIndex == null) return;
    const mii = miiAccessor();
    if (!mii) return;
    const leaf = leafForHash(hash);
    if (!leaf || !mii.has(leaf)) return;
    mii.setElement(leaf, selectedIndex, v);
  }

  function setStateHash(habit: Habit, hash: number): void {
    if (selectedIndex == null) return;
    const mii = miiAccessor();
    if (!mii) return;
    const leaf = leafForHash(habit.stateHash);
    if (!leaf || !mii.has(leaf)) return;
    mii.setElement(leaf, selectedIndex, hash >>> 0);
  }

  function getStateHash(habit: Habit): number {
    if (selectedIndex == null) return HABIT_STATE_NEVER_OWNED;
    const mii = miiAccessor();
    if (!mii) return HABIT_STATE_NEVER_OWNED;
    const leaf = leafForHash(habit.stateHash);
    if (!leaf || !mii.has(leaf)) return HABIT_STATE_NEVER_OWNED;
    return (
      safe(() => mii.getElement(leaf, selectedIndex!) as number, HABIT_STATE_NEVER_OWNED) >>> 0
    );
  }

  function getIsOwn(habit: Habit): boolean {
    return getBool(habit.isOwnHash);
  }

  function getIsChecked(habit: Habit): boolean {
    return getBool(habit.isCheckedHash);
  }

  function setIsOwn(habit: Habit, v: boolean): void {
    setBool(habit.isOwnHash, v);
    if (v) {
      setStateHash(habit, HABIT_STATE_OWN);
    } else {
      const cur = getStateHash(habit);
      setStateHash(habit, cur === HABIT_STATE_OWN ? HABIT_STATE_UNOWN : cur);
      if (getIsChecked(habit)) setBool(habit.isCheckedHash, false);
    }
  }

  function selectChecked(group: Group, habitName: string | null): void {
    if (selectedIndex == null) return;
    for (const h of group.habits) {
      const shouldCheck = habitName != null && h.name === habitName;
      if (getIsChecked(h) !== shouldCheck) setBool(h.isCheckedHash, shouldCheck);
      if (shouldCheck) {
        if (!getIsOwn(h)) setBool(h.isOwnHash, true);
        if (getStateHash(h) !== HABIT_STATE_OWN) setStateHash(h, HABIT_STATE_OWN);
      }
    }
  }

  function clearCategory(group: Group): void {
    if (selectedIndex == null) return;
    for (const h of group.habits) {
      if (getIsChecked(h)) setBool(h.isCheckedHash, false);
      if (getIsOwn(h)) setBool(h.isOwnHash, false);
      if (getStateHash(h) !== HABIT_STATE_NEVER_OWNED) {
        setStateHash(h, HABIT_STATE_NEVER_OWNED);
      }
    }
  }

  function checkedHabit(group: Group): Habit | null {
    for (const h of group.habits) {
      if (getIsChecked(h)) return h;
    }
    return null;
  }

  const currentCheckedName = $derived.by<string | null>(() => {
    if (!currentGroup) return null;
    return checkedHabit(currentGroup)?.name ?? null;
  });

  const ready = $derived.by(() => {
    if (habits.length === 0) return false;
    const mii = miiAccessor();
    if (!mii) return false;
    return habits.some((h) => {
      const leaf = leafForHash(h.isCheckedHash);
      return leaf != null && mii.has(leaf);
    });
  });
</script>

{#if !ready && habits.length > 0}
  <div class="grid gap-4">
    <MiiSlotSelector bind:selectedIndex />
    <section class={CARD_CLASS}>
      <p class="text-sm text-content-muted">{$_('mii.habits.missing')}</p>
    </section>
  </div>
{:else}
  <div class="grid gap-4">
    <MiiSlotSelector bind:selectedIndex />

    {#if selectedIndex != null && currentGroup}
      <section class={CARD_CLASS}>
        <div class="min-w-0">
          <h3 class="text-base font-bold text-content-strong">
            {$_('mii.habits.heading')}
          </h3>
          <p class="mt-0.5 text-xs text-content-muted">
            {$_('mii.habits.caption')}
          </p>
        </div>

        <nav class="mt-4 flex flex-wrap gap-2" aria-label={$_('mii.habits.category_tabs_label')}>
          {#each grouped as group (group.category)}
            {@const active = group.category === selectedCategory}
            {@const checked = checkedHabit(group)}
            <button
              type="button"
              class={[
                TAB_PILL_CLASS,
                active
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-surface-sunken/70 text-content hover:text-content-strong',
              ]}
              onclick={() => (selectedCategory = group.category)}
              aria-current={active ? 'page' : undefined}
              title={checked ? habitLabel(checked, ui) : $_('mii.habits.none_in_category')}
            >
              <span>{group.label}</span>
              {#if checked}
                <span
                  class={[
                    'inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold',
                    active ? 'bg-white text-orange-600' : 'bg-orange-500 text-white',
                  ]}
                  aria-hidden="true">✓</span
                >
              {/if}
            </button>
          {/each}
        </nav>

        <div class="mt-4 grid gap-2">
          <label
            class="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-sunken/40 px-3 py-2 ring-1 ring-edge/30 hover:bg-surface-sunken/70"
          >
            <input
              type="radio"
              name="habit-{currentGroup.category}"
              checked={currentCheckedName == null}
              onchange={() => selectChecked(currentGroup, null)}
              class="h-4 w-4 border-edge text-orange-500 focus:ring-orange-500/40"
            />
            <span class="font-bold text-content-muted italic">
              {$_('mii.habits.none_in_category')}
            </span>
          </label>

          {#each currentGroup.habits as habit (habit.name)}
            {@const isChecked = currentCheckedName === habit.name}
            {@const isOwn = getIsOwn(habit)}
            {@const cap = habitCaption(habit, ui)}
            {@const ownLeaf = leafForHash(habit.isOwnHash)}
            {@const hasOwnLeaf = ownLeaf != null && (miiAccessor()?.has(ownLeaf) ?? false)}
            <div
              class={[
                'rounded-xl px-3 py-2 ring-1 transition-colors',
                isChecked
                  ? 'bg-orange-500/10 ring-orange-500/60'
                  : 'bg-surface-sunken/40 ring-edge/30',
              ]}
            >
              <label class="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="habit-{currentGroup.category}"
                  checked={isChecked}
                  onchange={() => selectChecked(currentGroup, habit.name)}
                  class="mt-1 h-4 w-4 shrink-0 border-edge text-orange-500 focus:ring-orange-500/40"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-baseline gap-2">
                    <span class="font-bold text-content-strong">
                      {habitLabel(habit, ui)}
                    </span>
                    <span class="font-mono text-[10px] text-content-faint">
                      {habit.name}
                    </span>
                  </div>
                  {#if cap}
                    <p class="mt-1 text-xs text-content-muted whitespace-pre-line">
                      {cap}
                    </p>
                  {/if}
                </div>
              </label>

              {#if hasOwnLeaf}
                <label
                  class="mt-2 ml-7 flex items-center gap-2 text-xs text-content"
                  title={$_('mii.habits.is_own_tip')}
                >
                  <input
                    type="checkbox"
                    checked={isOwn}
                    disabled={isChecked}
                    onchange={(e) => setIsOwn(habit, e.currentTarget.checked)}
                    class="h-3.5 w-3.5 rounded border-edge text-orange-500 focus:ring-orange-500/40 disabled:opacity-50"
                  />
                  <span>{$_('mii.habits.is_own_label')}</span>
                </label>
              {/if}
            </div>
          {/each}
        </div>

        <div class="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            class={PILL_BUTTON_CLASS}
            onclick={() => clearCategory(currentGroup)}
          >
            {$_('mii.habits.clear_category')}
          </button>
        </div>
      </section>
    {/if}
  </div>
{/if}
