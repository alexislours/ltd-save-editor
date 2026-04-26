<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { arrayCount, arrGetInt, arrGetString } from '../sav/codec';
  import { murmur3_x86_32 } from '../sav/hash';
  import type { Entry } from '../sav/types';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import MiiElementEditor from './MiiElementEditor.svelte';
  import MiiFoodPicker from './MiiFoodPicker.svelte';
  import MiiGivenFlagPicker from './MiiGivenFlagPicker.svelte';
  import MiiLoveGenderEditor from './MiiLoveGenderEditor.svelte';
  import MiiPersonalityEditor from './MiiPersonalityEditor.svelte';
  import MiiRankedFoodPicker from './MiiRankedFoodPicker.svelte';
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
  const LOVE_GENDER_HASH = murmur3_x86_32('Mii.MiiMisc.FaceInfo.IsLoveGender') >>> 0;
  const levelEntry = $derived(byHash.get(SATISFY_LEVEL_HASH) ?? null);
  const meterEntry = $derived(byHash.get(SATISFY_METER_HASH) ?? null);
  const loveGenderEntry = $derived(byHash.get(LOVE_GENDER_HASH) ?? null);

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

  function resolveFields(fields: MiiField[] | undefined) {
    const out: { field: MiiField; entry: Entry }[] = [];
    if (!fields) return out;
    for (const f of fields) {
      const e = byHash.get(f.hash);
      if (!e) continue;
      if (e.type !== f.expectedType) continue;
      out.push({ field: f, entry: e });
    }
    return out;
  }

  const sectionsResolved = $derived.by(() => {
    return MII_SECTIONS.map((sec) => ({
      ...sec,
      resolved: resolveFields(sec.fields),
      resolvedSpoiler: resolveFields(sec.spoilerFields),
      resolvedPostSpoiler: resolveFields(sec.postSpoilerFields),
    })).filter(
      (sec) =>
        sec.resolved.length > 0 ||
        sec.resolvedSpoiler.length > 0 ||
        sec.resolvedPostSpoiler.length > 0,
    );
  });

  function slotLabel(slot: Slot): string {
    const params = { index: slot.index + 1, name: slot.name };
    if (slot.level == null) {
      return $_('mii.panel.slot_label', { values: params });
    }
    return $_('mii.panel.slot_label_with_level', {
      values: { ...params, level: slot.level },
    });
  }
</script>

{#if !nameEntry}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('mii.panel.no_name_spine')}</p>
  </section>
{:else if slots.length === 0}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('mii.panel.no_slots')}</p>
  </section>
{:else}
  <div class="grid gap-4">
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

    {#if selectedIndex != null}
      {#each sectionsResolved as sec (sec.titleKey)}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-content-strong">
            {$_(`mii.sections.${sec.titleKey}`)}
          </h3>
          {#if sec.descriptionKey}
            <p class="mt-0.5 text-xs text-content-muted">
              {$_(`mii.sections.${sec.descriptionKey}`)}
            </p>
          {/if}
          {#if sec.titleKey === 'personality'}
            {@const byName = new Map(sec.resolved.map((r) => [r.field.name, r.entry]))}
            <div class="mt-4">
              <MiiPersonalityEditor miiIndex={selectedIndex} entriesByName={byName} />
            </div>
          {:else if sec.resolved.length > 0}
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              {#each sec.resolved as r (r.field.hash)}
                <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
              {/each}
              {#if sec.titleKey === 'identity' && loveGenderEntry}
                <MiiLoveGenderEditor entry={loveGenderEntry} miiIndex={selectedIndex} />
              {/if}
            </div>
          {/if}
          {#if sec.resolvedSpoiler.length > 0}
            <details class="group mt-3 rounded-md border border-edge/60 bg-surface-muted p-3">
              <summary
                class="flex cursor-pointer list-none items-start justify-between gap-3 select-none"
              >
                <span class="flex items-start gap-2 text-sm text-warn">
                  <span aria-hidden="true" class="leading-5">⚠</span>
                  <span class="flex flex-col gap-0.5">
                    <span class="font-bold">{$_('mii.spoiler.warning')}</span>
                    <span class="text-xs font-normal"
                      >{$_(`mii.spoiler.captions.${sec.titleKey}`)}</span
                    >
                  </span>
                </span>
                <span class="shrink-0 text-xs font-normal text-warn">
                  <span class="group-open:hidden">{$_('mii.spoiler.show')}</span>
                  <span class="hidden group-open:inline">{$_('mii.spoiler.hide')}</span>
                </span>
              </summary>
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                {#each sec.resolvedSpoiler as r (r.field.hash)}
                  {#if sec.titleKey === 'food'}
                    <MiiFoodPicker entry={r.entry} index={selectedIndex} field={r.field} />
                  {:else}
                    <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
                  {/if}
                {/each}
              </div>
            </details>
          {/if}
          {#if sec.resolvedPostSpoiler.length > 0}
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              {#each sec.resolvedPostSpoiler as r (r.field.hash)}
                {#if sec.titleKey === 'food' && r.field.name === 'Mii.MiiMisc.EatInfo.RankedFoodId.Id'}
                  <MiiRankedFoodPicker entry={r.entry} index={selectedIndex} field={r.field} />
                {:else if sec.titleKey === 'food' && r.field.name === 'Mii.MiiMisc.EatInfo.GivenFlag'}
                  <MiiGivenFlagPicker entry={r.entry} index={selectedIndex} field={r.field} />
                {:else}
                  <MiiElementEditor entry={r.entry} index={selectedIndex} field={r.field} />
                {/if}
              {/each}
            </div>
          {/if}
        </section>
      {/each}

      {#if voiceEntriesByName.size > 0}
        <section class={CARD_CLASS}>
          <h3 class="text-base font-bold text-content-strong">{$_('mii.sections.voice')}</h3>
          <p class="mt-0.5 text-xs text-content-muted">{$_('mii.sections.voice_caption')}</p>
          <div class="mt-4">
            <MiiVoiceEditor miiIndex={selectedIndex} entriesByName={voiceEntriesByName} />
          </div>
        </section>
      {/if}

      <MiiRelationsTable {entries} miiIndex={selectedIndex} />
    {/if}
  </div>
{/if}
