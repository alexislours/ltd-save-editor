<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import {
    getEnum,
    getInt64,
    getString,
    getUInt,
    getUInt64,
    setEnum,
    setInt64,
    setString,
    setUInt,
    setUInt64,
    stringEncodedSize,
  } from '../sav/codec';
  import { DataType } from '../sav/dataType';
  import { murmur3_x86_32 } from '../sav/hash';
  import { _ } from 'svelte-i18n';
  import { enumOptionsFor, type EnumOption } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty } from '../playerEditor.svelte';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import DateField from './DateField.svelte';
  import EntryEditor from './EntryEditor.svelte';
  import { HAND_COLORS } from './profileFields';
  import SwatchPicker from './SwatchPicker.svelte';

  type Props = { entries: Entry[] };
  let { entries }: Props = $props();

  const byHash = $derived.by(() => {
    const m = new SvelteMap<number, Entry>();
    for (const e of entries) m.set(e.hash, e);
    return m;
  });

  const find = (n: string): Entry | null => byHash.get(murmur3_x86_32(n) >>> 0) ?? null;
  const findHash = (h: number): Entry | null => byHash.get(h >>> 0) ?? null;

  const name = $derived(find('Player.Name'));
  const islandName = $derived(find('Player.IslandName'));
  const howCallName = $derived(find('Player.HowToCallName'));
  const howCallIsland = $derived(find('Player.HowToCallIslandName'));
  const nameLang = $derived(find('Player.NameRegionLanguageID'));
  const islandLang = $derived(find('Player.IslandNameRegionLanguageID'));
  const skin = $derived(find('Player.SkinColorIndex'));

  const money = $derived(find('Player.Money'));
  const currency = $derived(find('Player.Currency'));

  const region = $derived(find('Player.Region'));
  const regionCode = $derived(find('Player.RegionCode'));
  const bootNum = $derived(find('Player.BootNum'));
  const playTime = $derived(find('Player.PlayTime'));

  const bdayDay = $derived(findHash(0xdb7786bb));
  const bdayMonth = $derived(findHash(0xc754bef3));
  const bdayYear = $derived(findHash(0x11996629));

  const fountainLevel = $derived(find('Liberation.FountainLevel'));
  // Liberation.<Unknown_55D4C49B> — controls the number of wishes available.
  const wishes = $derived(findHash(0xa32f7e47));

  const anyFound = $derived(
    name != null ||
      islandName != null ||
      money != null ||
      playTime != null ||
      skin != null ||
      fountainLevel != null ||
      wishes != null ||
      (bdayDay != null && bdayMonth != null && bdayYear != null),
  );

  let tick = $state(0);

  function setSkin(v: number): void {
    if (!skin) return;
    setUInt(skin, v);
    markDirty(skin);
  }

  function commitString(entry: Entry, value: string): string | null {
    try {
      stringEncodedSize(entry.type, value);
      setString(entry, value);
      markDirty(entry);
      tick++;
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  function readNumber(entry: Entry): number | bigint | null {
    switch (entry.type) {
      case DataType.UInt:
      case DataType.Int:
      case DataType.Enum:
        return getUInt(entry);
      case DataType.Int64:
        return getInt64(entry);
      case DataType.UInt64:
        return getUInt64(entry);
      default:
        return null;
    }
  }

  function writeNumber(entry: Entry, raw: string): string | null {
    const trimmed = raw.replace(/[,\s]/g, '');
    try {
      switch (entry.type) {
        case DataType.UInt:
        case DataType.Enum: {
          const n = Number(trimmed);
          if (!Number.isFinite(n) || n < 0) return $_('player.errors.non_negative_integer');
          setUInt(entry, Math.trunc(n));
          break;
        }
        case DataType.Int: {
          const n = Number(trimmed);
          if (!Number.isFinite(n)) return $_('player.errors.integer');
          setUInt(entry, Math.trunc(n) >>> 0);
          break;
        }
        case DataType.Int64: {
          setInt64(entry, BigInt(trimmed));
          break;
        }
        case DataType.UInt64: {
          const n = BigInt(trimmed);
          if (n < 0n) return $_('player.errors.non_negative_integer');
          setUInt64(entry, n);
          break;
        }
        default:
          return $_('player.errors.unsupported_type');
      }
      markDirty(entry);
      tick++;
      return null;
    } catch {
      return $_('player.errors.invalid_number');
    }
  }

  /** Money is stored as integer cents (e.g. 89050 = 890.50). */
  function formatMoney(v: number | bigint | null): string {
    if (v == null) return '';
    const n = typeof v === 'bigint' ? Number(v) : v;
    if (!Number.isFinite(n)) return '';
    return (n / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /** Game caps money at 99,999,999 cents (= $999,999.99). */
  const MAX_MONEY_CENTS = 99_999_999;

  function writeMoney(entry: Entry, raw: string): string | null {
    // Accept "890.50", "890,50", "890" (decimal optional), with thousands
    // separators.
    const cleaned = raw.replace(/\s/g, '').replace(/,/g, '.');
    const lastDot = cleaned.lastIndexOf('.');
    let intPart: string;
    let fracPart = '';
    if (lastDot >= 0) {
      intPart = cleaned.slice(0, lastDot).replace(/\./g, '');
      fracPart = cleaned.slice(lastDot + 1);
    } else {
      intPart = cleaned.replace(/\./g, '');
    }
    if (intPart === '' && fracPart === '') return $_('player.errors.number');
    if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) {
      return $_('player.errors.non_negative_number');
    }
    const cents = (fracPart + '00').slice(0, 2);
    const totalStr = (intPart || '0') + cents;
    const total = Number(totalStr);
    if (!Number.isFinite(total) || total < 0) return $_('player.errors.non_negative_number');
    if (total > MAX_MONEY_CENTS) return $_('player.errors.money_max');
    try {
      switch (entry.type) {
        case DataType.UInt:
        case DataType.Int:
        case DataType.Enum:
          setUInt(entry, Math.trunc(total) >>> 0);
          break;
        case DataType.Int64:
          setInt64(entry, BigInt(totalStr));
          break;
        case DataType.UInt64:
          setUInt64(entry, BigInt(totalStr));
          break;
        default:
          return $_('player.errors.unsupported_type');
      }
      markDirty(entry);
      tick++;
      return null;
    } catch {
      return $_('player.errors.invalid_number');
    }
  }

  function formatPlayTime(seconds: number | bigint | null): string {
    if (seconds == null) return '';
    const s = typeof seconds === 'bigint' ? Number(seconds) : seconds;
    if (!Number.isFinite(s) || s < 0) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h.toLocaleString('en-US')}h ${m}m`;
  }

  const moneyValue = $derived.by(() => (void tick, money ? readNumber(money) : null));
  const playTimeValue = $derived.by(() => (void tick, playTime ? readNumber(playTime) : null));
  const bootValue = $derived.by(() => (void tick, bootNum ? readNumber(bootNum) : null));
  const fountainLevelValue = $derived.by(
    () => (void tick, fountainLevel ? readNumber(fountainLevel) : null),
  );
  const wishesValue = $derived.by(() => (void tick, wishes ? readNumber(wishes) : null));
  const nameValue = $derived.by(() => (void tick, name ? getString(name) : ''));
  const islandValue = $derived.by(() => (void tick, islandName ? getString(islandName) : ''));
  const phoneticNameValue = $derived.by(
    () => (void tick, howCallName ? getString(howCallName) : ''),
  );
  const phoneticIslandValue = $derived.by(
    () => (void tick, howCallIsland ? getString(howCallIsland) : ''),
  );

  const currencyOptions = $derived(currency ? enumOptionsFor(currency.hash) : null);
  const currencyRaw = $derived.by(() => (void tick, currency ? getEnum(currency) : 0));

  const regionOptions = $derived(region ? enumOptionsFor(region.hash) : null);
  const regionRaw = $derived.by(() => (void tick, region ? getEnum(region) : 0));

  const handSwatches = $derived(
    HAND_COLORS.map((color, i) => ({
      value: i,
      color,
      label: $_(`player.hand_tones.${i}`),
    })),
  );

  function localizeRegion(opt: EnumOption): string {
    const key = `player.regions.${opt.name}`;
    const t = $_(key);
    return t === key ? (opt.label ?? opt.name) : t;
  }

  let nameError = $state<string | null>(null);
  let islandError = $state<string | null>(null);
  let phoneticNameError = $state<string | null>(null);
  let phoneticIslandError = $state<string | null>(null);
  let moneyError = $state<string | null>(null);
  let playTimeError = $state<string | null>(null);
  let bootError = $state<string | null>(null);
  let fountainLevelError = $state<string | null>(null);
  let wishesError = $state<string | null>(null);

  const numberInputClass = `${FORM_INPUT_CLASS} font-mono`;
  const compactSelectClass =
    'mt-1.5 rounded-lg border border-edge/60 bg-surface px-2.5 py-2 text-sm text-content-strong shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';
</script>

{#snippet textField(
  entry: Entry,
  label: string,
  value: string,
  onError: (msg: string | null) => void,
  error: string | null,
)}
  <label class="block min-w-0">
    <span class={LABEL_CLASS}>{label}</span>
    <input
      type="text"
      class={FORM_INPUT_CLASS}
      {value}
      onchange={(e) => onError(commitString(entry, e.currentTarget.value))}
    />
    {#if error}
      <span class="mt-1 block text-xs font-bold text-danger">{error}</span>
    {/if}
  </label>
{/snippet}

{#if !anyFound}
  <section class={CARD_CLASS}>
    <p class="text-sm text-content-muted">{$_('player.empty_state')}</p>
  </section>
{:else}
  <div class="grid gap-4">
    <section class={CARD_CLASS}>
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="grid gap-3">
          {#if name}
            {@render textField(
              name,
              $_('player.name_label'),
              nameValue,
              (msg) => (nameError = msg),
              nameError,
            )}
          {/if}
          {#if howCallName}
            {@render textField(
              howCallName,
              $_('player.name_pronounced_label'),
              phoneticNameValue,
              (msg) => (phoneticNameError = msg),
              phoneticNameError,
            )}
          {/if}
        </div>

        <div class="grid gap-3">
          {#if islandName}
            {@render textField(
              islandName,
              $_('player.island_label'),
              islandValue,
              (msg) => (islandError = msg),
              islandError,
            )}
          {/if}
          {#if howCallIsland}
            {@render textField(
              howCallIsland,
              $_('player.island_pronounced_label'),
              phoneticIslandValue,
              (msg) => (phoneticIslandError = msg),
              phoneticIslandError,
            )}
          {/if}
        </div>
      </div>

      {#if skin}
        <div class="mt-6 border-t border-edge/40 pt-5">
          <span class={LABEL_CLASS}>{$_('player.skin_tone_label')}</span>
          <div class="mt-2">
            <SwatchPicker swatches={handSwatches} value={getUInt(skin)} onChange={setSkin} />
          </div>
        </div>
      {/if}
    </section>

    {#if money || playTime || bootNum || (bdayDay && bdayMonth && bdayYear)}
      <section class={CARD_CLASS}>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if money}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>{$_('player.money_label')}</span>
              <div class="flex items-stretch gap-2">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-40"
                  value={formatMoney(moneyValue)}
                  onchange={(e) => {
                    moneyError = writeMoney(money!, e.currentTarget.value);
                  }}
                />
                {#if currency && currencyOptions && currencyOptions.length > 0}
                  <select
                    class={compactSelectClass}
                    onchange={(e) => {
                      const n = Number.parseInt(e.currentTarget.value, 10);
                      if (Number.isFinite(n)) {
                        setEnum(currency!, n);
                        markDirty(currency!);
                        tick++;
                      }
                    }}
                  >
                    {#each currencyOptions as opt (opt.hash)}
                      <option value={opt.hash} selected={opt.hash === currencyRaw}>
                        {opt.name}
                      </option>
                    {/each}
                    {#if !currencyOptions.some((o) => o.hash === currencyRaw)}
                      <option value={currencyRaw} selected>
                        0x{currencyRaw.toString(16).padStart(8, '0')}
                      </option>
                    {/if}
                  </select>
                {/if}
              </div>
              {#if moneyError}
                <p class="mt-1 text-xs font-bold text-danger">{moneyError}</p>
              {/if}
            </div>
          {/if}

          {#if bdayDay && bdayMonth && bdayYear}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>{$_('player.birthday_label')}</span>
              <div class="mt-1.5">
                <DateField day={bdayDay} month={bdayMonth} year={bdayYear} />
              </div>
            </div>
          {/if}

          {#if playTime}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>{$_('player.play_time_label')}</span>
              <div class="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-28"
                  value={playTimeValue == null ? '' : playTimeValue.toString()}
                  onchange={(e) => {
                    playTimeError = writeNumber(playTime!, e.currentTarget.value);
                  }}
                />
                <span class="text-xs text-content">
                  {$_('player.play_time_unit')} ·
                  <span class="font-mono text-content-strong">
                    {formatPlayTime(playTimeValue)}
                  </span>
                </span>
              </div>
              {#if playTimeError}
                <p class="mt-1 text-xs text-danger">{playTimeError}</p>
              {/if}
            </div>
          {/if}

          {#if bootNum}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>{$_('player.boots_label')}</span>
              <div class="mt-1.5">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-20"
                  value={bootValue == null ? '' : bootValue.toString()}
                  onchange={(e) => {
                    bootError = writeNumber(bootNum!, e.currentTarget.value);
                  }}
                />
              </div>
              {#if bootError}
                <p class="mt-1 text-xs text-danger">{bootError}</p>
              {/if}
            </div>
          {/if}
        </div>
      </section>
    {/if}

    {#if fountainLevel || wishes}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-content-strong">
          {$_('player.fountain_section')}
        </h3>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if fountainLevel}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>{$_('player.fountain_level_label')}</span>
              <div class="mt-1.5">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-28"
                  value={fountainLevelValue == null ? '' : fountainLevelValue.toString()}
                  onchange={(e) => {
                    fountainLevelError = writeNumber(fountainLevel!, e.currentTarget.value);
                  }}
                />
              </div>
              {#if fountainLevelError}
                <p class="mt-1 text-xs text-danger">{fountainLevelError}</p>
              {/if}
            </div>
          {/if}

          {#if wishes}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>{$_('player.wishes_label')}</span>
              <div class="mt-1.5">
                <input
                  type="text"
                  inputmode="numeric"
                  class="{numberInputClass} w-28"
                  value={wishesValue == null ? '' : wishesValue.toString()}
                  onchange={(e) => {
                    wishesError = writeNumber(wishes!, e.currentTarget.value);
                  }}
                />
              </div>
              {#if wishesError}
                <p class="mt-1 text-xs text-danger">{wishesError}</p>
              {/if}
            </div>
          {/if}
        </div>
      </section>
    {/if}

    {#if region || regionCode || nameLang || islandLang}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-content-strong">
          {$_('player.region_section')}
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          {#if region}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>{$_('player.region_label')}</span>
              <div class="mt-1.5 max-w-xs">
                {#if regionOptions && regionOptions.length > 0}
                  <select
                    class={compactSelectClass}
                    onchange={(e) => {
                      const n = Number.parseInt(e.currentTarget.value, 10);
                      if (Number.isFinite(n)) {
                        setEnum(region!, n);
                        markDirty(region!);
                        tick++;
                      }
                    }}
                  >
                    {#each regionOptions as opt (opt.hash)}
                      <option value={opt.hash} selected={opt.hash === regionRaw}>
                        {localizeRegion(opt)}
                      </option>
                    {/each}
                    {#if !regionOptions.some((o) => o.hash === regionRaw)}
                      <option value={regionRaw} selected>
                        0x{regionRaw.toString(16).padStart(8, '0')}
                      </option>
                    {/if}
                  </select>
                {:else}
                  <EntryEditor entry={region} />
                {/if}
              </div>
            </label>
          {/if}
          {#if regionCode}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>{$_('player.region_code_label')}</span>
              <div class="mt-1.5 max-w-xs">
                <EntryEditor entry={regionCode} />
              </div>
            </label>
          {/if}
          {#if nameLang}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>{$_('player.name_language_label')}</span>
              <div class="mt-1.5 max-w-xs">
                <EntryEditor entry={nameLang} />
              </div>
            </label>
          {/if}
          {#if islandLang}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>{$_('player.island_language_label')}</span>
              <div class="mt-1.5 max-w-xs">
                <EntryEditor entry={islandLang} />
              </div>
            </label>
          {/if}
        </div>
      </section>
    {/if}
  </div>
{/if}
