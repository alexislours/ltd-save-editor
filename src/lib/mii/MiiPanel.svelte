<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import { arrayCount, arrGetInt, arrGetString } from '../sav/codec';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import MiiElementEditor from './MiiElementEditor.svelte';
  import MiiPersonalityEditor from './MiiPersonalityEditor.svelte';
  import MiiRelationsTable from './MiiRelationsTable.svelte';
  import MiiVoiceEditor from './MiiVoiceEditor.svelte';
  import { miiState } from './miiEditor.svelte';
  import { MII_SECTIONS, NAME_FIELD_HASH, type MiiField } from './miiFields';

  const VOICE_FIELD_NAMES = [
    'Mii.Voice.PresetType',
    'Mii.Voice.Speed',
    'Mii.Voice.Pitch',
    'Mii.Voice.Formant',
    'Mii.Voice.Tension',
    'Mii.Voice.Intonation',
  ] as const;

  type Props = {
    entries: Entry[];
    selectedIndex?: number | null;
  };
  let { entries, selectedIndex = $bindable(null) }: Props = $props();

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const nameEntry = $derived(byHash.get(NAME_FIELD_HASH) ?? null);

  const SATISFY_LEVEL_HASH = murmur3_x86_32('Mii.MiiMisc.SatisfyInfo.Level') >>> 0;
  const SATISFY_METER_HASH = murmur3_x86_32('Mii.MiiMisc.SatisfyInfo.Meter') >>> 0;
  const levelEntry = $derived(byHash.get(SATISFY_LEVEL_HASH) ?? null);
  const meterEntry = $derived(byHash.get(SATISFY_METER_HASH) ?? null);

  type Slot = {
    index: number;
    name: string;
    level: number | null;
    xpPercent: number | null;
  };
  const slots = $derived.by<Slot[]>(() => {
    void miiState.tick;
    if (!nameEntry) return [];
    const count = arrayCount(nameEntry);
    const out: Slot[] = [];
    for (let i = 0; i < count; i++) {
      let n: string;
      try {
        n = arrGetString(nameEntry, i);
      } catch {
        n = '';
      }
      if (n.length === 0) continue;
      let level: number | null = null;
      if (levelEntry) {
        try {
          level = arrGetInt(levelEntry, i) + 1;
        } catch {
          level = null;
        }
      }
      let xpPercent: number | null = null;
      if (meterEntry) {
        try {
          const m = arrGetInt(meterEntry, i);
          xpPercent = Math.max(0, Math.min(100, m));
        } catch {
          xpPercent = null;
        }
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

  const voiceEntriesByName = $derived.by(() => {
    const m = new SvelteMap<string, Entry>();
    for (const name of VOICE_FIELD_NAMES) {
      const h = murmur3_x86_32(name) >>> 0;
      const e = byHash.get(h);
      if (e) m.set(name, e);
    }
    return m;
  });

  const sectionsResolved = $derived.by(() => {
    return MII_SECTIONS.map((sec) => {
      const fields: { field: MiiField; entry: Entry }[] = [];
      for (const f of sec.fields) {
        const e = byHash.get(f.hash);
        if (!e) continue;
        if (e.type !== f.expectedType) continue;
        fields.push({ field: f, entry: e });
      }
      return { ...sec, resolved: fields };
    }).filter((sec) => sec.resolved.length > 0);
  });

  function slotLabel(slot: Slot): string {
    const lvl = slot.level == null ? '' : ` · Lv ${slot.level}`;
    return `#${slot.index + 1} · ${slot.name}${lvl}`;
  }
</script>

{#if !nameEntry}
  <section class={CARD_CLASS}>
    <p class="text-sm text-slate-600">
      This save doesn't expose the Mii.Name.Name spine - there's nothing to enumerate. Use the
      Player tab's advanced panel to inspect raw entries.
    </p>
  </section>
{:else if slots.length === 0}
  <section class={CARD_CLASS}>
    <p class="text-sm text-slate-600">
      No populated Mii slots were found. Slots are detected by checking Mii.Name.Name for a
      non-empty string.
    </p>
  </section>
{:else}
  <div class="grid gap-4">
    <section class={CARD_CLASS}>
      <label class="block min-w-0">
        <span class={LABEL_CLASS}>Mii</span>
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
        <span class="mt-1 block text-xs text-slate-600">
          {slots.length} populated slot{slots.length === 1 ? '' : 's'}
        </span>
      </label>

      {#if selectedSlot}
        <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-2xl font-bold text-slate-900">
            {selectedSlot.name}
          </span>
          {#if selectedSlot.level != null}
            <span
              class="rounded-full bg-amber-200 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900"
              title="Mii.MiiMisc.SatisfyInfo.Level"
            >
              Level {selectedSlot.level}
            </span>
          {/if}
          <span class="text-xs text-slate-600">
            slot #{selectedSlot.index + 1}
          </span>
        </div>
        {#if selectedSlot.xpPercent != null}
          <div class="mt-3 max-w-md" title="Mii.MiiMisc.SatisfyInfo.Meter">
            <div class="flex items-baseline justify-between">
              <span class="text-sm font-bold text-slate-900">Level %</span>
              <span class="font-mono text-xs text-slate-700">
                {selectedSlot.xpPercent}%
              </span>
            </div>
            <div
              class="mt-1 h-2 overflow-hidden rounded-full bg-amber-100"
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

    {#if selectedIndex != null}
      {#each sectionsResolved as sec (sec.title)}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-slate-900">{sec.title}</h3>
          {#if sec.description}
            <p class="mt-0.5 text-xs text-slate-600">{sec.description}</p>
          {/if}
          {#if sec.title === 'Personality'}
            {@const byName = new Map(sec.resolved.map((r) => [r.field.name, r.entry]))}
            <div class="mt-4">
              <MiiPersonalityEditor miiIndex={selectedIndex} entriesByName={byName} />
            </div>
          {:else}
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              {#each sec.resolved as r (r.field.hash)}
                <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
              {/each}
            </div>
          {/if}
        </section>
      {/each}

      {#if voiceEntriesByName.size > 0}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-slate-900">Voice</h3>
          <p class="mt-0.5 text-xs text-slate-600">
            Sliders cover 0-50 (51 steps). Picking a Simple preset overwrites every slider.
          </p>
          <div class="mt-4">
            <MiiVoiceEditor miiIndex={selectedIndex} entriesByName={voiceEntriesByName} />
          </div>
        </section>
      {/if}

      <MiiRelationsTable {entries} miiIndex={selectedIndex} />
    {/if}
  </div>
{/if}
