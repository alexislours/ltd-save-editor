<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { safe } from '$lib/sav/format';
  import { MII_SCHEMA } from '$lib/sav/schema';
  import type { SchemaLeaf } from '$lib/sav/schema/leaf';
  import { miiAccessor } from './miiEditor.svelte';
  import { classifyPersonality } from './personality';

  type Props = {
    miiIndex: number;
    leaves: SchemaLeaf[];
  };
  let { miiIndex, leaves }: Props = $props();

  type Axis = {
    leaf: SchemaLeaf;
    axisKey: 'movement' | 'speech' | 'energy' | 'thinking' | 'overall';
  };
  const AXES: Axis[] = [
    { leaf: MII_SCHEMA.Mii.CharacterParam.Gaiety, axisKey: 'movement' },
    { leaf: MII_SCHEMA.Mii.CharacterParam.Activeness, axisKey: 'speech' },
    { leaf: MII_SCHEMA.Mii.CharacterParam.Audaciousness, axisKey: 'energy' },
    { leaf: MII_SCHEMA.Mii.CharacterParam.Sociability, axisKey: 'thinking' },
    { leaf: MII_SCHEMA.Mii.CharacterParam.Commonsense, axisKey: 'overall' },
  ];

  const STEPS = 8;

  type ResolvedAxis = Axis & { value: number };

  const presentSet = $derived(new Set(leaves));

  const resolved = $derived.by<ResolvedAxis[]>(() => {
    const mii = miiAccessor();
    if (!mii) return [];
    const out: ResolvedAxis[] = [];
    for (const a of AXES) {
      if (!presentSet.has(a.leaf)) continue;
      const value = safe(() => mii.getElement(a.leaf, miiIndex) as number, 0);
      out.push({ ...a, value });
    }
    return out;
  });

  function axisValue(leaf: SchemaLeaf): number {
    return resolved.find((x) => x.leaf === leaf)?.value ?? 0;
  }

  const personality = $derived.by(() => {
    if (resolved.length < 4) return null;
    return classifyPersonality({
      gaiety: axisValue(MII_SCHEMA.Mii.CharacterParam.Gaiety),
      activeness: axisValue(MII_SCHEMA.Mii.CharacterParam.Activeness),
      audaciousness: axisValue(MII_SCHEMA.Mii.CharacterParam.Audaciousness),
      sociability: axisValue(MII_SCHEMA.Mii.CharacterParam.Sociability),
    });
  });

  function setValue(leaf: SchemaLeaf, displayIndex: number) {
    const mii = miiAccessor();
    if (!mii) return;
    const stored = displayIndex + 1;
    try {
      mii.setElement(leaf, miiIndex, stored | 0);
    } catch {
      /* schema mismatch is filtered upstream */
    }
  }

  const BOX_TINTS = [
    'bg-emerald-500',
    'bg-emerald-400',
    'bg-emerald-300',
    'bg-emerald-200',
    'bg-orange-200',
    'bg-orange-300',
    'bg-orange-400',
    'bg-orange-500',
  ];
</script>

<div class="rounded-2xl bg-header/90 p-3 shadow-sm ring-1 ring-edge/60">
  {#if personality}
    <div class="mb-2 flex items-baseline justify-between rounded-full bg-surface-muted px-4 py-2">
      <span class="text-sm font-bold text-content-strong">{$_('mii.personality.label')}</span>
      <span class="text-base font-bold text-brand-soft">
        {$_('mii.personality.summary', {
          values: {
            parent: $_(`mii.personality.parent.${personality.parent}`),
            child: $_(`mii.personality.child.${personality.child}`),
          },
        })}
      </span>
    </div>
  {/if}
  <div class="grid gap-2">
    {#each resolved as axis (axis.leaf.hash)}
      {@const axisLabel = $_(`mii.personality.axis.${axis.axisKey}`)}
      {@const minWord = $_(`mii.personality.axis_min.${axis.axisKey}`)}
      {@const maxWord = $_(`mii.personality.axis_max.${axis.axisKey}`)}
      <div
        class="flex flex-col gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 sm:grid sm:grid-cols-[7rem_4rem_1fr_4rem] sm:items-center sm:gap-3 sm:rounded-full sm:py-2"
      >
        <span class="text-sm font-bold text-content-strong">{axisLabel}</span>
        <span class="hidden text-xs text-content sm:inline sm:text-right">{minWord}</span>
        <div class="flex min-w-0 justify-between gap-1">
          {#each Array.from({ length: STEPS }, (_, i) => i) as i (i)}
            {@const selected = axis.value === i + 1}
            <button
              type="button"
              class={[
                'relative aspect-square min-w-0 flex-1 rounded-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95 sm:h-8 sm:w-8 sm:max-w-8 sm:flex-none',
                selected ? 'bg-orange-500 shadow-md ring-2 ring-orange-600' : BOX_TINTS[i],
              ]}
              aria-label={$_('mii.personality.step_aria', {
                values: {
                  label: axisLabel,
                  step: i + 1,
                  total: STEPS,
                  side: i + 1 <= STEPS / 2 ? minWord : maxWord,
                },
              })}
              aria-pressed={selected}
              onclick={() => setValue(axis.leaf, i)}
            >
              {#if selected}
                <svg
                  class="absolute inset-0 m-auto h-3.5 w-3.5 text-white sm:h-4 sm:w-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 8.5l3.5 3.5L13 4.5" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
        <span class="hidden text-xs text-content sm:inline">{maxWord}</span>
        <div class="flex justify-between gap-3 text-xs text-content sm:hidden">
          <span>{minWord}</span>
          <span>{maxWord}</span>
        </div>
      </div>
    {/each}
  </div>
</div>
