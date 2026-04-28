<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { arrGetInt, arrSetInt } from '../sav/codec';
  import type { Entry } from '../sav/types';
  import { markDirty, miiState } from './miiEditor.svelte';
  import { classifyPersonality } from './personality';

  type Props = {
    miiIndex: number;
    entriesByName: Map<string, Entry>;
  };
  let { miiIndex, entriesByName }: Props = $props();

  type Axis = {
    name: string;
    /** Used to look up `mii.personality.axis.<axisKey>` etc. */
    axisKey: 'movement' | 'speech' | 'energy' | 'thinking' | 'overall';
  };
  const AXES: Axis[] = [
    { name: 'Mii.CharacterParam.Gaiety', axisKey: 'movement' },
    { name: 'Mii.CharacterParam.Activeness', axisKey: 'speech' },
    { name: 'Mii.CharacterParam.Audaciousness', axisKey: 'energy' },
    { name: 'Mii.CharacterParam.Sociability', axisKey: 'thinking' },
    { name: 'Mii.CharacterParam.Commonsense', axisKey: 'overall' },
  ];

  const STEPS = 8;

  type ResolvedAxis = Axis & { entry: Entry; value: number };

  const resolved = $derived.by<ResolvedAxis[]>(() => {
    void miiState.tick;
    const out: ResolvedAxis[] = [];
    for (const a of AXES) {
      const e = entriesByName.get(a.name);
      if (!e) continue;
      let value: number;
      try {
        value = arrGetInt(e, miiIndex);
      } catch {
        value = 0;
      }
      out.push({ ...a, entry: e, value });
    }
    return out;
  });

  function axisValue(name: string): number {
    return resolved.find((x) => x.name === name)?.value ?? 0;
  }

  const personality = $derived.by(() => {
    if (resolved.length < 4) return null;
    return classifyPersonality({
      gaiety: axisValue('Mii.CharacterParam.Gaiety'),
      activeness: axisValue('Mii.CharacterParam.Activeness'),
      audaciousness: axisValue('Mii.CharacterParam.Audaciousness'),
      sociability: axisValue('Mii.CharacterParam.Sociability'),
    });
  });

  function setValue(entry: Entry, displayIndex: number) {
    // displayIndex is 0..STEPS-1 (the box clicked). The save uses 1..8.
    const stored = displayIndex + 1;
    try {
      arrSetInt(entry, miiIndex, stored | 0);
      markDirty(entry);
    } catch {
      // ignore - schema mismatch is already filtered upstream
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
    {#each resolved as axis (axis.name)}
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
              onclick={() => setValue(axis.entry, i)}
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
