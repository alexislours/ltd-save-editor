<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { arrGetEnum, arrGetInt, arrSetEnum, arrSetInt } from '../sav/codec';
  import type { Entry } from '../sav/types';
  import { markDirty, miiState } from './miiEditor.svelte';

  type Props = {
    miiIndex: number;
    entriesByName: Map<string, Entry>;
  };
  let { miiIndex, entriesByName }: Props = $props();

  type SliderField = {
    name: string;
    /** Looked up via `mii.voice.<labelKey>`. */
    labelKey: 'slider_speed' | 'slider_pitch' | 'slider_depth' | 'slider_delivery';
    min: number;
    max: number;
  };
  const SLIDERS: SliderField[] = [
    { name: 'Mii.Voice.Speed', labelKey: 'slider_speed', min: 0, max: 50 },
    { name: 'Mii.Voice.Pitch', labelKey: 'slider_pitch', min: 0, max: 50 },
    { name: 'Mii.Voice.Formant', labelKey: 'slider_depth', min: 0, max: 50 },
    { name: 'Mii.Voice.Tension', labelKey: 'slider_delivery', min: -25, max: 25 },
  ];

  const INTONATION_NAME = 'Mii.Voice.Intonation';
  const PRESET_NAME = 'Mii.Voice.PresetType';
  const INTONATION_STEPS = 6;

  const PRESET_CUSTOM = 1658541559; // 0x62db55f7

  type Preset = {
    type: number;
    /** Identifier under `mii.voice.preset.<name>`. */
    name: string;
    icon: string;
    Speed: number;
    Pitch: number;
    Formant: number;
    Tension: number;
    Intonation: number;
  };

  const PRESETS: Preset[] = [
    {
      type: 589706439,
      name: 'Boy',
      icon: '/voice-icons/voice_00.png',
      Speed: 25,
      Pitch: 28,
      Formant: 28,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 3235795834,
      name: 'Girl',
      icon: '/voice-icons/voice_01.png',
      Speed: 25,
      Pitch: 39,
      Formant: 31,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 232570486,
      name: 'Male',
      icon: '/voice-icons/voice_02.png',
      Speed: 28,
      Pitch: 16,
      Formant: 20,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 991922965,
      name: 'Female',
      icon: '/voice-icons/voice_03.png',
      Speed: 28,
      Pitch: 34,
      Formant: 25,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 2037022324,
      name: 'Old man',
      icon: '/voice-icons/voice_04.png',
      Speed: 12,
      Pitch: 14,
      Formant: 25,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 4013701139,
      name: 'Old woman',
      icon: '/voice-icons/voice_05.png',
      Speed: 12,
      Pitch: 27,
      Formant: 30,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 1250167332,
      name: 'Big',
      icon: '/voice-icons/voice_07.png',
      Speed: 22,
      Pitch: 13,
      Formant: 6,
      Tension: 5,
      Intonation: 0,
    },
    {
      type: 4091959656,
      name: 'Small',
      icon: '/voice-icons/voice_08.png',
      Speed: 35,
      Pitch: 45,
      Formant: 40,
      Tension: 15,
      Intonation: 0,
    },
    {
      type: 2108450225,
      name: 'Robot L',
      icon: '/voice-icons/voice_09.png',
      Speed: 22,
      Pitch: 10,
      Formant: 33,
      Tension: 0,
      Intonation: 0,
    },
    {
      type: 1755188696,
      name: 'Robot S',
      icon: '/voice-icons/voice_10.png',
      Speed: 32,
      Pitch: 45,
      Formant: 50,
      Tension: 0,
      Intonation: 3,
    },
  ];
  const RANDOM_ICON = '/voice-icons/voice_06.png';

  function safeInt(entry: Entry | undefined, fallback = 0): number {
    if (!entry) return fallback;
    try {
      return arrGetInt(entry, miiIndex);
    } catch {
      return fallback;
    }
  }
  function safeEnum(entry: Entry | undefined, fallback = 0): number {
    if (!entry) return fallback;
    try {
      return arrGetEnum(entry, miiIndex);
    } catch {
      return fallback;
    }
  }

  const sliderState = $derived.by(() => {
    void miiState.tick;
    return SLIDERS.map((s) => {
      const entry = entriesByName.get(s.name);
      let value = safeInt(entry, s.min);
      if (value < s.min) value = s.min;
      if (value > s.max) value = s.max;
      return { ...s, entry, value };
    });
  });

  const intonationState = $derived.by(() => {
    void miiState.tick;
    const entry = entriesByName.get(INTONATION_NAME);
    let value = safeInt(entry, 0);
    if (value < 0) value = 0;
    if (value > INTONATION_STEPS - 1) value = INTONATION_STEPS - 1;
    return { entry, value };
  });

  const presetState = $derived.by(() => {
    void miiState.tick;
    const entry = entriesByName.get(PRESET_NAME);
    return { entry, value: safeEnum(entry, PRESET_CUSTOM) };
  });

  const matchedPresetIndex = $derived.by(() => {
    return PRESETS.findIndex((p) => p.type === presetState.value);
  });

  let mode = $state<'custom' | 'simple'>('custom');
  $effect(() => {
    void miiState.tick;
    mode = matchedPresetIndex >= 0 ? 'simple' : 'custom';
  });

  function commitInt(name: string, value: number) {
    const entry = entriesByName.get(name);
    if (!entry) return;
    try {
      arrSetInt(entry, miiIndex, value | 0);
      markDirty(entry);
    } catch {
      /* schema mismatch handled upstream */
    }
  }

  function commitPreset(typeHash: number) {
    const entry = entriesByName.get(PRESET_NAME);
    if (!entry) return;
    try {
      arrSetEnum(entry, miiIndex, typeHash >>> 0);
      markDirty(entry);
    } catch {
      /* ignore */
    }
  }

  function applyPreset(p: Preset) {
    commitInt('Mii.Voice.Speed', p.Speed);
    commitInt('Mii.Voice.Pitch', p.Pitch);
    commitInt('Mii.Voice.Formant', p.Formant);
    commitInt('Mii.Voice.Tension', p.Tension);
    commitInt(INTONATION_NAME, p.Intonation);
    commitPreset(p.type);
  }

  function onSliderInput(name: string, raw: string) {
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n)) return;
    commitInt(name, n);
    if (presetState.value !== PRESET_CUSTOM) commitPreset(PRESET_CUSTOM);
  }

  function onIntonationClick(displayIndex: number) {
    commitInt(INTONATION_NAME, displayIndex);
    if (presetState.value !== PRESET_CUSTOM) commitPreset(PRESET_CUSTOM);
  }

  function randomize() {
    const rint = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
    for (const s of SLIDERS) commitInt(s.name, rint(s.min, s.max));
    commitInt(INTONATION_NAME, rint(0, INTONATION_STEPS - 1));
    commitPreset(PRESET_CUSTOM);
  }

  function pct(value: number, min: number, max: number) {
    return ((value - min) / (max - min)) * 100;
  }
</script>

<div class="rounded-2xl bg-header/90 p-4 shadow-sm ring-1 ring-edge/60">
  <div class="flex flex-wrap items-center gap-2">
    <div class="inline-flex rounded-full bg-surface-sunken/80 p-1 ring-1 ring-edge/50">
      <button
        type="button"
        class={[
          'rounded-full px-5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
          mode === 'simple'
            ? 'bg-orange-500 text-white shadow'
            : 'text-content hover:text-content-strong',
        ]}
        aria-pressed={mode === 'simple'}
        onclick={() => (mode = 'simple')}
      >
        {$_('mii.voice.mode_simple')}
      </button>
      <button
        type="button"
        class={[
          'rounded-full px-5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600',
          mode === 'custom'
            ? 'bg-orange-500 text-white shadow'
            : 'text-content hover:text-content-strong',
        ]}
        aria-pressed={mode === 'custom'}
        onclick={() => (mode = 'custom')}
      >
        {$_('mii.voice.mode_custom')}
      </button>
    </div>

    <button
      type="button"
      class="ml-auto inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-content-strong shadow ring-1 ring-edge/60 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95"
      onclick={randomize}
      title={$_('mii.voice.random_title')}
    >
      <img src={RANDOM_ICON} alt="" class="h-5 w-5" />
      {$_('mii.voice.random')}
    </button>
  </div>

  {#if mode === 'simple'}
    <div
      class="mx-auto mt-4 grid max-w-md grid-flow-col grid-rows-2 gap-2"
      style="grid-template-columns: repeat(5, minmax(0, 1fr));"
    >
      {#each PRESETS as preset, i (preset.type)}
        {@const selected = matchedPresetIndex === i}
        {@const presetLabel = $_(`mii.voice.preset.${preset.name}`)}
        <button
          type="button"
          class={[
            'flex aspect-square items-center justify-center rounded-xl p-1.5 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95',
            selected
              ? 'bg-orange-500 shadow-md ring-2 ring-orange-600'
              : 'bg-surface shadow hover:bg-surface-muted',
          ]}
          aria-pressed={selected}
          aria-label={presetLabel}
          title={presetLabel}
          onclick={() => applyPreset(preset)}
        >
          <img
            src={preset.icon}
            alt=""
            class={['h-8 w-8 select-none', selected ? 'brightness-0 invert' : '']}
            draggable="false"
          />
        </button>
      {/each}
    </div>
  {:else}
    <div class="mt-4 grid gap-3">
      {#each sliderState as s (s.name)}
        {#if s.entry}
          {@const p = pct(s.value, s.min, s.max)}
          {@const sliderLabel = $_(`mii.voice.${s.labelKey}`)}
          <div
            class="flex flex-col gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 sm:grid sm:grid-cols-[7rem_1fr_3rem] sm:items-center sm:gap-3 sm:rounded-full sm:py-2"
          >
            <span class="text-sm font-bold text-content-strong">{sliderLabel}</span>
            <div class="flex items-center gap-3 sm:contents">
              <input
                type="range"
                min={s.min}
                max={s.max}
                step="1"
                value={s.value}
                oninput={(e) => onSliderInput(s.name, e.currentTarget.value)}
                aria-label={sliderLabel}
                class="block h-2 w-full min-w-0 flex-1 cursor-pointer appearance-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-edge [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110
                       [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-edge [&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110"
                style="background: linear-gradient(to right, rgb(120 113 108) 0%, rgb(120 113 108) {p}%, rgb(168 162 158) {p}%, rgb(168 162 158) 100%);"
              />
              <span class="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-content">
                {s.value}
              </span>
            </div>
          </div>
        {/if}
      {/each}

      {#if intonationState.entry}
        <div
          class="flex flex-col gap-1.5 rounded-2xl bg-surface-muted px-4 py-2.5 sm:grid sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-3 sm:rounded-full sm:py-2"
        >
          <span class="text-sm font-bold text-content-strong">{$_('mii.voice.tone')}</span>
          <div class="flex min-w-0 flex-1 justify-between gap-1.5 sm:gap-2">
            {#each Array.from({ length: INTONATION_STEPS }, (_, i) => i) as i (i)}
              {@const selected = intonationState.value === i}
              <button
                type="button"
                class={[
                  'aspect-square min-w-0 flex-1 rounded-lg text-sm font-bold transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 active:scale-95 sm:h-10 sm:w-10 sm:max-w-10 sm:flex-none',
                  selected
                    ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-600'
                    : 'bg-surface text-content-strong shadow',
                ]}
                aria-label={$_('mii.voice.tone_step_aria', {
                  values: { step: i + 1, total: INTONATION_STEPS },
                })}
                aria-pressed={selected}
                onclick={() => onIntonationClick(i)}
              >
                {i + 1}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
