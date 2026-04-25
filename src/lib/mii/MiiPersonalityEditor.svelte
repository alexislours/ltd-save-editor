<script lang="ts">
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
    label: string;
    minWord: string;
    maxWord: string;
  };
  const AXES: Axis[] = [
    {
      name: 'Mii.CharacterParam.Gaiety',
      label: 'Movement',
      minWord: 'Slow',
      maxWord: 'Quick',
    },
    {
      name: 'Mii.CharacterParam.Activeness',
      label: 'Speech',
      minWord: 'Polite',
      maxWord: 'Honest',
    },
    {
      name: 'Mii.CharacterParam.Audaciousness',
      label: 'Energy',
      minWord: 'Flat',
      maxWord: 'Varied',
    },
    {
      name: 'Mii.CharacterParam.Sociability',
      label: 'Thinking',
      minWord: 'Serious',
      maxWord: 'Chill',
    },
    {
      name: 'Mii.CharacterParam.Commonsense',
      label: 'Overall',
      minWord: 'Normal',
      maxWord: 'Quirky',
    },
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

<div class="rounded-2xl bg-amber-300/90 p-3 shadow-sm ring-1 ring-amber-400/60">
  {#if personality}
    <div class="mb-2 flex items-baseline justify-between rounded-full bg-amber-50 px-4 py-2">
      <span class="text-sm font-bold text-slate-900">Personality</span>
      <span class="text-base font-bold text-orange-600">
        {personality.parent} &middot; {personality.child}
      </span>
    </div>
  {/if}
  <div class="grid gap-2">
    {#each resolved as axis (axis.name)}
      <div
        class="grid grid-cols-[7rem_4rem_1fr_4rem] items-center gap-3 rounded-full bg-amber-50 px-4 py-2"
      >
        <span class="text-sm font-bold text-slate-900">{axis.label}</span>
        <span class="text-right text-xs text-slate-700">{axis.minWord}</span>
        <div class="flex justify-between gap-1">
          {#each Array.from({ length: STEPS }, (_, i) => i) as i (i)}
            {@const selected = axis.value === i + 1}
            <button
              type="button"
              class={[
                'relative h-7 w-7 rounded-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95 sm:h-8 sm:w-8',
                selected ? 'bg-orange-500 shadow-md ring-2 ring-orange-600' : BOX_TINTS[i],
              ]}
              aria-label="{axis.label}: {i + 1} of {STEPS} ({i + 1 <= STEPS / 2
                ? axis.minWord
                : axis.maxWord} side)"
              aria-pressed={selected}
              onclick={() => setValue(axis.entry, i)}
            >
              {#if selected}
                <svg
                  class="absolute inset-0 m-auto h-4 w-4 text-white"
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
        <span class="text-xs text-slate-700">{axis.maxWord}</span>
      </div>
    {/each}
  </div>
</div>
