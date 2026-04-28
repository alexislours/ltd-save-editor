<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import {
    arrayCount,
    arrGetEnum,
    arrGetInt64,
    arrGetString,
    arrGetUInt,
    arrSetEnum,
    arrSetInt64,
    arrSetString,
    arrSetUInt,
  } from '../sav/codec';
  import { DataType } from '../sav/dataType';
  import { GENERATED_ENUM_OPTION_NAMES } from '../sav/generatedNames';
  import { murmur3_x86_32 } from '../sav/hash';
  import { enumOptionsFor } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty, playerState } from '../playerEditor.svelte';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS, PILL_BUTTON_CLASS } from '../styles';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const TEXT_HASH = murmur3_x86_32('UGC.Text.TextData.Text') >>> 0;
  const HOW_HASH = murmur3_x86_32('UGC.Text.TextData.HowToCallText') >>> 0;
  const GENRE_HASH = murmur3_x86_32('UGC.Text.TextData.Genre') >>> 0;
  const REGION_HASH = murmur3_x86_32('UGC.Text.TextData.RegionLanguageID') >>> 0;
  const ATTR_HASH = murmur3_x86_32('UGC.Text.TextData.Attribute') >>> 0;
  const GRAM_HASH = murmur3_x86_32('UGC.Text.TextData.WordAttrGrammaticality') >>> 0;
  const TIME_HASH = murmur3_x86_32('UGC.Text.TextData.AddTime') >>> 0;

  const INVALID_GENRE_HASH = murmur3_x86_32('Invalid') >>> 0;
  const PHRASE_GENRE_HASH = murmur3_x86_32('Phrase') >>> 0;
  const NEUTRAL_ATTR_HASH = murmur3_x86_32('Neutral') >>> 0;
  const NONE_GRAM_HASH = murmur3_x86_32('cNone') >>> 0;
  const JPJA_REGION_HASH = murmur3_x86_32('JPja') >>> 0;

  const MAX_WIDE_CHARS = 63;

  const VISIBLE_REGIONS = [
    'JPja',
    'USen',
    'USes',
    'USfr',
    'EUen',
    'EUes',
    'EUfr',
    'EUde',
    'EUit',
    'EUnl',
    'CNzh',
    'KRko',
    'TWzh',
  ] as const;
  const VISIBLE_REGION_HASHES = VISIBLE_REGIONS.map((n) => ({
    hash: murmur3_x86_32(n) >>> 0,
    name: n,
  }));

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });
  const textEntry = $derived(byHash.get(TEXT_HASH) ?? null);
  const howEntry = $derived(byHash.get(HOW_HASH) ?? null);
  const genreEntry = $derived(byHash.get(GENRE_HASH) ?? null);
  const regionEntry = $derived(byHash.get(REGION_HASH) ?? null);
  const attrEntry = $derived(byHash.get(ATTR_HASH) ?? null);
  const gramEntry = $derived(byHash.get(GRAM_HASH) ?? null);
  const timeEntry = $derived(byHash.get(TIME_HASH) ?? null);

  const ready = $derived(
    textEntry != null && howEntry != null && genreEntry != null && regionEntry != null,
  );

  const length = $derived.by(() => {
    void playerState.tick;
    let max = 0;
    for (const e of [
      textEntry,
      howEntry,
      genreEntry,
      regionEntry,
      attrEntry,
      gramEntry,
      timeEntry,
    ]) {
      if (e) max = Math.max(max, arrayCount(e));
    }
    return max;
  });

  const ui = $derived($locale);

  function regionLabel(regionHash: number): string {
    return (
      GENERATED_ENUM_OPTION_NAMES.get(regionHash >>> 0) ??
      `0x${(regionHash >>> 0).toString(16).padStart(8, '0')}`
    );
  }

  type Row = {
    index: number;
    genreHash: number;
    regionHash: number;
    attrHash: number;
    gramHash: number;
    addTime: bigint;
    text: string;
    howToCall: string;
    isFilled: boolean;
  };

  const rows = $derived.by<Row[]>(() => {
    void playerState.tick;
    const out: Row[] = [];
    if (!ready) return out;
    for (let i = 0; i < length; i++) {
      let genreHash = INVALID_GENRE_HASH;
      let regionHashV = JPJA_REGION_HASH;
      let attrHash = NEUTRAL_ATTR_HASH;
      let gramHash = NONE_GRAM_HASH;
      let addTime = 0n;
      let text = '';
      let how = '';
      try {
        if (genreEntry) genreHash = arrGetEnum(genreEntry, i) >>> 0;
      } catch {
        /* empty */
      }
      try {
        if (regionEntry) regionHashV = arrGetEnum(regionEntry, i) >>> 0;
      } catch {
        /* empty */
      }
      try {
        if (attrEntry) {
          attrHash =
            attrEntry.type === DataType.EnumArray
              ? arrGetEnum(attrEntry, i) >>> 0
              : arrGetUInt(attrEntry, i) >>> 0;
        }
      } catch {
        /* empty */
      }
      try {
        if (gramEntry) {
          gramHash =
            gramEntry.type === DataType.EnumArray
              ? arrGetEnum(gramEntry, i) >>> 0
              : arrGetUInt(gramEntry, i) >>> 0;
        }
      } catch {
        /* empty */
      }
      try {
        if (timeEntry) addTime = arrGetInt64(timeEntry, i);
      } catch {
        /* empty */
      }
      try {
        if (textEntry) text = arrGetString(textEntry, i);
      } catch {
        /* empty */
      }
      try {
        if (howEntry) how = arrGetString(howEntry, i);
      } catch {
        /* empty */
      }
      out.push({
        index: i,
        genreHash,
        regionHash: regionHashV,
        attrHash,
        gramHash,
        addTime,
        text,
        howToCall: how,
        isFilled: genreHash !== INVALID_GENRE_HASH || text.length > 0 || how.length > 0,
      });
    }
    return out;
  });

  let showEmpty = $state(false);
  const visibleRows = $derived(showEmpty ? rows : rows.filter((r) => r.isFilled));
  const filledCount = $derived(rows.filter((r) => r.isFilled).length);

  function commitGenre(index: number, newHash: number): void {
    if (!genreEntry || !textEntry || !howEntry || !regionEntry) return;
    arrSetEnum(genreEntry, index, newHash >>> 0);
    markDirty(genreEntry);
    if (newHash >>> 0 === INVALID_GENRE_HASH) {
      arrSetString(textEntry, index, '');
      arrSetString(howEntry, index, '');
      markDirty(textEntry);
      markDirty(howEntry);
      arrSetEnum(regionEntry, index, JPJA_REGION_HASH);
      markDirty(regionEntry);
    }
  }

  function commitRegion(index: number, newHash: number): void {
    if (!regionEntry) return;
    arrSetEnum(regionEntry, index, newHash >>> 0);
    markDirty(regionEntry);
  }

  function commitAttr(index: number, newHash: number): void {
    if (!attrEntry) return;
    if (attrEntry.type === DataType.EnumArray) arrSetEnum(attrEntry, index, newHash >>> 0);
    else arrSetUInt(attrEntry, index, newHash >>> 0);
    markDirty(attrEntry);
  }

  function commitGram(index: number, newHash: number): void {
    if (!gramEntry) return;
    if (gramEntry.type === DataType.EnumArray) arrSetEnum(gramEntry, index, newHash >>> 0);
    else arrSetUInt(gramEntry, index, newHash >>> 0);
    markDirty(gramEntry);
  }

  function commitAddTime(index: number, raw: string): void {
    if (!timeEntry) return;
    try {
      arrSetInt64(timeEntry, index, BigInt(raw.trim() || '0'));
      markDirty(timeEntry);
    } catch {
      /* swallow */
    }
  }

  function validateText(s: string): string | null {
    if (s.length > MAX_WIDE_CHARS)
      return $_('player.ugc_text.error_too_long', { values: { max: MAX_WIDE_CHARS } });
    if (s.length === MAX_WIDE_CHARS) {
      const last = s.charCodeAt(MAX_WIDE_CHARS - 1);
      if (last >= 0xd800 && last <= 0xdbff) return $_('player.ugc_text.error_split_surrogate');
    }
    return null;
  }

  let textErrors = $state<Record<number, string | null>>({});
  let howErrors = $state<Record<number, string | null>>({});

  function commitText(index: number, raw: string): void {
    if (!textEntry) return;
    const err = validateText(raw);
    textErrors = { ...textErrors, [index]: err };
    if (err) return;
    arrSetString(textEntry, index, raw);
    markDirty(textEntry);
  }

  function commitHow(index: number, raw: string): void {
    if (!howEntry) return;
    const err = validateText(raw);
    howErrors = { ...howErrors, [index]: err };
    if (err) return;
    arrSetString(howEntry, index, raw);
    markDirty(howEntry);
  }

  function addSlot(): void {
    const empty = rows.find((r) => !r.isFilled);
    if (!empty) return;
    commitGenre(empty.index, PHRASE_GENRE_HASH);
  }

  function clearSlot(index: number): void {
    if (!window.confirm($_('player.ugc_text.clear_confirm'))) return;
    commitGenre(index, INVALID_GENRE_HASH);
    textErrors = { ...textErrors, [index]: null };
    howErrors = { ...howErrors, [index]: null };
  }

  type Option = { hash: number; label: string };

  const genreOptions = $derived.by<Option[]>(() => {
    const opts = enumOptionsFor(GENRE_HASH) ?? [];
    return opts.map((o) => {
      const i18nKey = `player.ugc_text.genre.${o.name}`;
      const t = $_(i18nKey);
      return { hash: o.hash >>> 0, label: t === i18nKey ? (o.label ?? o.name) : t };
    });
  });

  const attrOptions = $derived.by<Option[]>(() => {
    const opts = enumOptionsFor(ATTR_HASH) ?? [];
    return opts.map((o) => {
      const i18nKey = `player.ugc_text.attribute.${o.name}`;
      const t = $_(i18nKey);
      return { hash: o.hash >>> 0, label: t === i18nKey ? (o.label ?? o.name) : t };
    });
  });

  const gramOptions = $derived.by<Option[]>(() => {
    const opts = enumOptionsFor(GRAM_HASH) ?? [];
    return opts.map((o) => {
      const i18nKey = `player.ugc_text.grammaticality.${o.name}`;
      const t = $_(i18nKey);
      return { hash: o.hash >>> 0, label: t === i18nKey ? (o.label ?? o.name) : t };
    });
  });

  function withCurrent(options: Option[], currentHash: number, fallback: () => string): Option[] {
    const cur = currentHash >>> 0;
    if (options.some((o) => o.hash === cur)) return options;
    return [...options, { hash: cur, label: fallback() }];
  }

  function regionOptionsFor(currentHash: number): Option[] {
    void ui;
    const list: Option[] = VISIBLE_REGION_HASHES.map((r) => ({
      hash: r.hash,
      label: r.name as string,
    }));
    return withCurrent(list, currentHash, () => regionLabel(currentHash));
  }

  $effect(() => {
    void length;
    textErrors = {};
    howErrors = {};
  });
</script>

{#if !ready}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.ugc_text.missing')}</p>
  </section>
{:else}
  <section class={CARD_CLASS}>
    <header class="mb-3">
      <h3 class="text-base font-bold text-content-strong">{$_('player.ugc_text.heading')}</h3>
      <p class="mt-1 text-xs text-content-muted">{$_('player.ugc_text.description')}</p>
    </header>

    <div class="grid gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-xs text-content-muted">
          {$_('player.ugc_text.summary', {
            values: { filled: filledCount, total: length },
          })}
        </p>
        <label class="ml-auto inline-flex items-center gap-2 text-xs text-content">
          <input
            type="checkbox"
            checked={showEmpty}
            onchange={(e) => (showEmpty = e.currentTarget.checked)}
            class="h-3.5 w-3.5 rounded border-edge text-orange-500 focus:ring-orange-500/40"
          />
          {$_('player.ugc_text.show_empty')}
        </label>
        {#if filledCount < length}
          <button type="button" class={PILL_BUTTON_CLASS} onclick={addSlot}>
            + {$_('player.ugc_text.add_slot')}
          </button>
        {/if}
      </div>

      {#if visibleRows.length === 0}
        <p
          class="rounded-md border border-dashed border-edge/60 px-3 py-4 text-center text-xs text-content-muted"
        >
          {$_('player.ugc_text.empty_hint')}
        </p>
      {:else}
        <div class="grid gap-3">
          {#each visibleRows as r (r.index)}
            <div class="rounded-xl border border-edge/40 bg-surface-muted/40 p-3 shadow-sm">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-content-muted">
                  {$_('player.ugc_text.entry_index', { values: { index: r.index } })}
                </span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-danger-edge bg-surface px-3 py-1.5 text-sm font-bold text-danger shadow-sm transition-colors hover:bg-danger-bg disabled:opacity-40"
                  onclick={() => clearSlot(r.index)}
                  disabled={!r.isFilled}
                  title={$_('player.ugc_text.clear_tip')}
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
                    <path
                      d="M12.71 4.71 11.29 3.29 8 6.59 4.71 3.29 3.29 4.71 6.59 8l-3.3 3.29 1.42 1.42L8 9.41l3.29 3.3 1.42-1.42L9.41 8z"
                    />
                  </svg>
                  {$_('player.ugc_text.clear_action')}
                </button>
              </div>

              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('player.ugc_text.field.genre')}</span>
                  <select
                    class={FORM_INPUT_CLASS}
                    value={r.genreHash >>> 0}
                    onchange={(e) =>
                      commitGenre(r.index, Number.parseInt(e.currentTarget.value, 10) || 0)}
                  >
                    {#each withCurrent(genreOptions, r.genreHash, () => `0x${(r.genreHash >>> 0).toString(16).padStart(8, '0')}`) as opt (opt.hash)}
                      <option value={opt.hash >>> 0}>{opt.label}</option>
                    {/each}
                  </select>
                </label>
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('player.ugc_text.field.regionLanguageId')}</span>
                  <select
                    class={FORM_INPUT_CLASS}
                    value={r.regionHash >>> 0}
                    onchange={(e) =>
                      commitRegion(r.index, Number.parseInt(e.currentTarget.value, 10) || 0)}
                  >
                    {#each regionOptionsFor(r.regionHash) as opt (opt.hash)}
                      <option value={opt.hash >>> 0}>{opt.label}</option>
                    {/each}
                  </select>
                </label>
              </div>

              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('player.ugc_text.field.text')}</span>
                  <input
                    type="text"
                    class={FORM_INPUT_CLASS}
                    value={r.text}
                    maxlength={MAX_WIDE_CHARS}
                    oninput={(e) => commitText(r.index, e.currentTarget.value)}
                    placeholder={$_('player.ugc_text.text_placeholder')}
                    aria-invalid={textErrors[r.index] != null}
                  />
                  <span class="mt-1 flex items-center justify-between text-[11px]">
                    {#if textErrors[r.index]}
                      <span class="font-bold text-danger">{textErrors[r.index]}</span>
                    {:else}
                      <span class="text-content-faint">&nbsp;</span>
                    {/if}
                    <span class="font-mono tabular-nums text-content-faint">
                      {r.text.length} / {MAX_WIDE_CHARS}
                    </span>
                  </span>
                </label>

                <label class="block min-w-0">
                  <span class={LABEL_CLASS}>{$_('player.ugc_text.field.howToCallText')}</span>
                  <input
                    type="text"
                    class={FORM_INPUT_CLASS}
                    value={r.howToCall}
                    maxlength={MAX_WIDE_CHARS}
                    oninput={(e) => commitHow(r.index, e.currentTarget.value)}
                    placeholder={r.text || $_('player.ugc_text.how_placeholder')}
                    aria-invalid={howErrors[r.index] != null}
                  />
                  <span class="mt-1 flex items-center justify-between text-[11px]">
                    {#if howErrors[r.index]}
                      <span class="font-bold text-danger">{howErrors[r.index]}</span>
                    {:else}
                      <span class="text-content-faint">{$_('player.ugc_text.how_hint')}</span>
                    {/if}
                    <span class="font-mono tabular-nums text-content-faint">
                      {r.howToCall.length} / {MAX_WIDE_CHARS}
                    </span>
                  </span>
                </label>
              </div>

              {#if attrEntry || gramEntry || timeEntry}
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  {#if attrEntry}
                    <label class="block min-w-0">
                      <span class={LABEL_CLASS}>{$_('player.ugc_text.field.attribute')}</span>
                      <select
                        class={FORM_INPUT_CLASS}
                        value={r.attrHash >>> 0}
                        onchange={(e) =>
                          commitAttr(r.index, Number.parseInt(e.currentTarget.value, 10) || 0)}
                      >
                        {#each withCurrent(attrOptions, r.attrHash, () => `0x${(r.attrHash >>> 0).toString(16).padStart(8, '0')}`) as opt (opt.hash)}
                          <option value={opt.hash >>> 0}>{opt.label}</option>
                        {/each}
                      </select>
                    </label>
                  {/if}
                  {#if gramEntry}
                    <label class="block min-w-0">
                      <span class={LABEL_CLASS}
                        >{$_('player.ugc_text.field.wordAttrGrammaticality')}</span
                      >
                      <select
                        class={FORM_INPUT_CLASS}
                        value={r.gramHash >>> 0}
                        onchange={(e) =>
                          commitGram(r.index, Number.parseInt(e.currentTarget.value, 10) || 0)}
                      >
                        {#each withCurrent(gramOptions, r.gramHash, () => `0x${(r.gramHash >>> 0).toString(16).padStart(8, '0')}`) as opt (opt.hash)}
                          <option value={opt.hash >>> 0}>{opt.label}</option>
                        {/each}
                      </select>
                    </label>
                  {/if}
                  {#if timeEntry}
                    <label class="block min-w-0">
                      <span class={LABEL_CLASS}>{$_('player.ugc_text.field.addTime')}</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        class="{FORM_INPUT_CLASS} font-mono"
                        value={r.addTime.toString()}
                        onchange={(e) => commitAddTime(r.index, e.currentTarget.value)}
                      />
                    </label>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
