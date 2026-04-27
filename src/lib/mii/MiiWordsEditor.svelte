<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { SvelteMap } from 'svelte/reactivity';
  import { arrGetEnum, arrGetString, arrSetEnum, arrSetString } from '../sav/codec';
  import { gameLocaleFor, type GameLocale } from '../sav/gameLocale';
  import { GENERATED_ENUM_OPTION_NAMES } from '../sav/generatedNames';
  import { murmur3_x86_32 } from '../sav/hash';
  import { wordKindLabel, wordKindNames } from '../sav/wordKindLabels.svelte';
  import type { Entry } from '../sav/types';
  import { FORM_INPUT_CLASS, LABEL_CLASS, PILL_BUTTON_CLASS } from '../styles';
  import { markDirty, miiState } from './miiEditor.svelte';

  type Props = {
    entries: Entry[];
    miiIndex: number;
    perMii?: number;
  };
  let { entries, miiIndex, perMii = 12 }: Props = $props();

  const KIND_HASH = murmur3_x86_32('Mii.MiiMisc.WordInfo.WordArray.WordKind') >>> 0;
  const TEXT_HASH = murmur3_x86_32('Mii.MiiMisc.WordInfo.WordArray.WordText') >>> 0;
  const HOWTOCALL_HASH = murmur3_x86_32('Mii.MiiMisc.WordInfo.WordArray.WordHowToCall') >>> 0;
  const REGION_HASH = murmur3_x86_32('Mii.MiiMisc.WordInfo.WordArray.WordRegionLanguageID') >>> 0;

  const INVALID_KIND_HASH = murmur3_x86_32('Invalid') >>> 0;
  const PHRASE_KIND_HASH = murmur3_x86_32('Phrase') >>> 0;
  const JPJA_REGION_HASH = murmur3_x86_32('JPja') >>> 0;

  const VISIBLE_REGIONS: GameLocale[] = [
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
  ];
  const VISIBLE_REGION_HASHES = VISIBLE_REGIONS.map((n) => ({
    hash: murmur3_x86_32(n) >>> 0,
    name: n,
  }));

  const MAX_WIDE_CHARS = 63;

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });
  const kindEntry = $derived(byHash.get(KIND_HASH) ?? null);
  const textEntry = $derived(byHash.get(TEXT_HASH) ?? null);
  const howEntry = $derived(byHash.get(HOWTOCALL_HASH) ?? null);
  const regionEntry = $derived(byHash.get(REGION_HASH) ?? null);
  const ready = $derived(
    kindEntry != null && textEntry != null && howEntry != null && regionEntry != null,
  );

  const ui = $derived($locale);
  const gameLoc = $derived(gameLocaleFor(ui));

  function regionLabel(regionHash: number): string {
    const name = GENERATED_ENUM_OPTION_NAMES.get(regionHash >>> 0);
    return name ?? `0x${(regionHash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function arrIndex(slot: number): number {
    return miiIndex * perMii + slot;
  }

  type Row = {
    slot: number;
    index: number;
    kindHash: number;
    regionHash: number;
    text: string;
    howToCall: string;
    isFilled: boolean;
  };
  const rows = $derived.by<Row[]>(() => {
    void miiState.tick;
    const out: Row[] = [];
    if (!ready) return out;
    for (let s = 0; s < perMii; s++) {
      const i = arrIndex(s);
      let kindHash = INVALID_KIND_HASH;
      let regionHash = JPJA_REGION_HASH;
      let text = '';
      let how = '';
      try {
        kindHash = arrGetEnum(kindEntry!, i) >>> 0;
      } catch {
        /* empty */
      }
      try {
        regionHash = arrGetEnum(regionEntry!, i) >>> 0;
      } catch {
        /* empty */
      }
      try {
        text = arrGetString(textEntry!, i);
      } catch {
        /* empty */
      }
      try {
        how = arrGetString(howEntry!, i);
      } catch {
        /* empty */
      }
      out.push({
        slot: s,
        index: i,
        kindHash,
        regionHash,
        text,
        howToCall: how,
        isFilled: kindHash !== INVALID_KIND_HASH,
      });
    }
    return out;
  });

  let showEmpty = $state(false);
  const visibleRows = $derived(showEmpty ? rows : rows.filter((r) => r.isFilled));

  function commitKind(slot: number, newHash: number): void {
    if (!kindEntry || !textEntry || !howEntry || !regionEntry) return;
    const i = arrIndex(slot);
    arrSetEnum(kindEntry, i, newHash >>> 0);
    markDirty(kindEntry);
    if (newHash >>> 0 === INVALID_KIND_HASH) {
      arrSetString(textEntry, i, '');
      arrSetString(howEntry, i, '');
      markDirty(textEntry);
      markDirty(howEntry);
      // Reset region to schema default for cleanliness.
      arrSetEnum(regionEntry, i, JPJA_REGION_HASH);
      markDirty(regionEntry);
      return;
    }
    try {
      if (arrGetEnum(regionEntry, i) === JPJA_REGION_HASH) {
        const target = murmur3_x86_32(gameLoc) >>> 0;
        arrSetEnum(regionEntry, i, target);
        markDirty(regionEntry);
      }
    } catch {
      /* empty */
    }
  }

  function commitRegion(slot: number, newHash: number): void {
    if (!regionEntry) return;
    arrSetEnum(regionEntry, arrIndex(slot), newHash >>> 0);
    markDirty(regionEntry);
  }

  function validateText(s: string): string | null {
    if (s.length > MAX_WIDE_CHARS)
      return $_('mii.words.error_too_long', { values: { max: MAX_WIDE_CHARS } });
    if (s.length === MAX_WIDE_CHARS) {
      const last = s.charCodeAt(MAX_WIDE_CHARS - 1);
      if (last >= 0xd800 && last <= 0xdbff) return $_('mii.words.error_split_surrogate');
    }
    return null;
  }

  let textErrors = $state<Record<number, string | null>>({});
  let howErrors = $state<Record<number, string | null>>({});

  function commitText(slot: number, raw: string): void {
    if (!textEntry) return;
    const err = validateText(raw);
    textErrors = { ...textErrors, [slot]: err };
    if (err) return;
    arrSetString(textEntry, arrIndex(slot), raw);
    markDirty(textEntry);
  }
  function commitHow(slot: number, raw: string): void {
    if (!howEntry) return;
    const err = validateText(raw);
    howErrors = { ...howErrors, [slot]: err };
    if (err) return;
    arrSetString(howEntry, arrIndex(slot), raw);
    markDirty(howEntry);
  }

  function addSlot(): void {
    const empty = rows.find((r) => !r.isFilled);
    if (!empty) return;
    commitKind(empty.slot, PHRASE_KIND_HASH);
  }

  function clearSlot(slot: number): void {
    if (!window.confirm($_('mii.words.clear_confirm'))) return;
    commitKind(slot, INVALID_KIND_HASH);
    textErrors = { ...textErrors, [slot]: null };
    howErrors = { ...howErrors, [slot]: null };
  }

  $effect(() => {
    void miiIndex;
    textErrors = {};
    howErrors = {};
  });

  const filledCount = $derived(rows.filter((r) => r.isFilled).length);

  function regionOptionsFor(currentHash: number): { hash: number; label: string }[] {
    const list: { hash: number; label: string }[] = VISIBLE_REGION_HASHES.map((r) => ({
      hash: r.hash,
      label: r.name as string,
    }));
    const cur = currentHash >>> 0;
    if (!list.some((o) => o.hash === cur)) {
      list.push({ hash: cur, label: regionLabel(cur) });
    }
    return list;
  }

  const kindOptions = $derived.by(() => {
    return [
      { hash: INVALID_KIND_HASH, label: $_('mii.words.kind_invalid') },
      ...wordKindNames().map((n) => ({
        hash: murmur3_x86_32(n) >>> 0,
        label: wordKindLabel(n, ui),
      })),
    ];
  });

  function kindOptionsFor(currentHash: number): { hash: number; label: string }[] {
    const cur = currentHash >>> 0;
    if (kindOptions.some((o) => o.hash === cur)) return kindOptions;
    return [...kindOptions, { hash: cur, label: `0x${cur.toString(16).padStart(8, '0')}` }];
  }
</script>

{#if !ready}
  <p class="text-sm text-content-muted">{$_('mii.words.missing')}</p>
{:else}
  <div class="grid gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-xs text-content-muted">
        {$_('mii.words.summary', { values: { filled: filledCount, total: perMii } })}
      </p>
      <label class="ml-auto inline-flex items-center gap-2 text-xs text-content">
        <input
          type="checkbox"
          checked={showEmpty}
          onchange={(e) => (showEmpty = e.currentTarget.checked)}
          class="h-3.5 w-3.5 rounded border-edge text-orange-500 focus:ring-orange-500/40"
        />
        {$_('mii.words.show_empty')}
      </label>
      {#if filledCount < perMii}
        <button type="button" class={PILL_BUTTON_CLASS} onclick={addSlot}>
          + {$_('mii.words.add_slot')}
        </button>
      {/if}
    </div>

    {#if visibleRows.length === 0}
      <p
        class="rounded-md border border-dashed border-edge/60 px-3 py-4 text-center text-xs text-content-muted"
      >
        {$_('mii.words.empty_hint')}
      </p>
    {:else}
      <div class="grid gap-3">
        {#each visibleRows as r (r.slot)}
          <div class="rounded-xl border border-edge/40 bg-surface-muted/40 p-3 shadow-sm">
            <div class="flex justify-end">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-danger-edge bg-surface px-3 py-1.5 text-sm font-bold text-danger shadow-sm transition-colors hover:bg-danger-bg disabled:opacity-40"
                onclick={() => clearSlot(r.slot)}
                disabled={!r.isFilled}
                title={$_('mii.words.clear_tip')}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current">
                  <path
                    d="M12.71 4.71 11.29 3.29 8 6.59 4.71 3.29 3.29 4.71 6.59 8l-3.3 3.29 1.42 1.42L8 9.41l3.29 3.3 1.42-1.42L9.41 8z"
                  />
                </svg>
                {$_('mii.words.clear_action')}
              </button>
            </div>

            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block min-w-0">
                <span class={LABEL_CLASS}>{$_('mii.words.kind_label')}</span>
                <select
                  class={FORM_INPUT_CLASS}
                  value={r.kindHash >>> 0}
                  onchange={(e) =>
                    commitKind(r.slot, Number.parseInt(e.currentTarget.value, 10) || 0)}
                >
                  {#each kindOptionsFor(r.kindHash) as opt (opt.hash)}
                    <option value={opt.hash >>> 0}>{opt.label}</option>
                  {/each}
                </select>
              </label>
              <label class="block min-w-0">
                <span class={LABEL_CLASS}>{$_('mii.words.region_label')}</span>
                <select
                  class={FORM_INPUT_CLASS}
                  value={r.regionHash >>> 0}
                  onchange={(e) =>
                    commitRegion(r.slot, Number.parseInt(e.currentTarget.value, 10) || 0)}
                >
                  {#each regionOptionsFor(r.regionHash) as opt (opt.hash)}
                    <option value={opt.hash >>> 0}>{opt.label}</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block min-w-0">
                <span class={LABEL_CLASS}>{$_('mii.words.text_label')}</span>
                <input
                  type="text"
                  class={FORM_INPUT_CLASS}
                  value={r.text}
                  maxlength={MAX_WIDE_CHARS}
                  oninput={(e) => commitText(r.slot, e.currentTarget.value)}
                  placeholder={$_('mii.words.text_placeholder')}
                  aria-invalid={textErrors[r.slot] != null}
                />
                <span class="mt-1 flex items-center justify-between text-[11px]">
                  {#if textErrors[r.slot]}
                    <span class="font-bold text-danger">{textErrors[r.slot]}</span>
                  {:else}
                    <span class="text-content-faint">&nbsp;</span>
                  {/if}
                  <span class="font-mono tabular-nums text-content-faint">
                    {r.text.length} / {MAX_WIDE_CHARS}
                  </span>
                </span>
              </label>

              <label class="block min-w-0">
                <span class={LABEL_CLASS}>{$_('mii.words.how_label')}</span>
                <input
                  type="text"
                  class={FORM_INPUT_CLASS}
                  value={r.howToCall}
                  maxlength={MAX_WIDE_CHARS}
                  oninput={(e) => commitHow(r.slot, e.currentTarget.value)}
                  placeholder={r.text || $_('mii.words.how_placeholder')}
                  aria-invalid={howErrors[r.slot] != null}
                />
                <span class="mt-1 flex items-center justify-between text-[11px]">
                  {#if howErrors[r.slot]}
                    <span class="font-bold text-danger">{howErrors[r.slot]}</span>
                  {:else}
                    <span class="text-content-faint">{$_('mii.words.how_hint')}</span>
                  {/if}
                  <span class="font-mono tabular-nums text-content-faint">
                    {r.howToCall.length} / {MAX_WIDE_CHARS}
                  </span>
                </span>
              </label>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
