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
  import { enumOptionsFor } from '../sav/knownKeys';
  import type { Entry } from '../sav/types';
  import { markDirty } from '../playerEditor.svelte';
  import { CARD_CLASS, FORM_INPUT_CLASS, LABEL_CLASS } from '../styles';
  import DateField from './DateField.svelte';
  import EntryEditor from './EntryEditor.svelte';
  import { HAND_SWATCHES } from './profileFields';
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

  const anyFound = $derived(
    name != null ||
      islandName != null ||
      money != null ||
      playTime != null ||
      skin != null ||
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
          if (!Number.isFinite(n) || n < 0) return 'Must be a non-negative integer';
          setUInt(entry, Math.trunc(n));
          break;
        }
        case DataType.Int: {
          const n = Number(trimmed);
          if (!Number.isFinite(n)) return 'Must be an integer';
          setUInt(entry, Math.trunc(n) >>> 0);
          break;
        }
        case DataType.Int64: {
          setInt64(entry, BigInt(trimmed));
          break;
        }
        case DataType.UInt64: {
          const n = BigInt(trimmed);
          if (n < 0n) return 'Must be a non-negative integer';
          setUInt64(entry, n);
          break;
        }
        default:
          return 'Unsupported field type';
      }
      markDirty(entry);
      tick++;
      return null;
    } catch {
      return 'Invalid number';
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
    if (intPart === '' && fracPart === '') return 'Must be a number';
    if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) {
      return 'Must be a non-negative number';
    }
    const cents = (fracPart + '00').slice(0, 2);
    const totalStr = (intPart || '0') + cents;
    const total = Number(totalStr);
    if (!Number.isFinite(total) || total < 0) return 'Must be a non-negative number';
    if (total > MAX_MONEY_CENTS) return 'Max is 999,999.99';
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
          return 'Unsupported field type';
      }
      markDirty(entry);
      tick++;
      return null;
    } catch {
      return 'Invalid number';
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

  let nameError = $state<string | null>(null);
  let islandError = $state<string | null>(null);
  let phoneticNameError = $state<string | null>(null);
  let phoneticIslandError = $state<string | null>(null);
  let moneyError = $state<string | null>(null);
  let playTimeError = $state<string | null>(null);
  let bootError = $state<string | null>(null);

  const numberInputClass = `${FORM_INPUT_CLASS} font-mono`;
  const compactSelectClass =
    'mt-1.5 rounded-lg border border-amber-400/60 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';
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
      <span class="mt-1 block text-xs font-bold text-red-700">{error}</span>
    {/if}
  </label>
{/snippet}

{#if !anyFound}
  <section class={CARD_CLASS}>
    <p class="text-sm text-slate-600">
      None of the curated Player fields were found in this save. Use the Advanced section below to
      browse everything.
    </p>
  </section>
{:else}
  <div class="grid gap-4">
    <section class={CARD_CLASS}>
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="grid gap-3">
          {#if name}
            {@render textField(name, 'Player name', nameValue, (m) => (nameError = m), nameError)}
          {/if}
          {#if howCallName}
            {@render textField(
              howCallName,
              'Pronounced',
              phoneticNameValue,
              (m) => (phoneticNameError = m),
              phoneticNameError,
            )}
          {/if}
        </div>

        <div class="grid gap-3">
          {#if islandName}
            {@render textField(
              islandName,
              'Island',
              islandValue,
              (m) => (islandError = m),
              islandError,
            )}
          {/if}
          {#if howCallIsland}
            {@render textField(
              howCallIsland,
              'Pronounced',
              phoneticIslandValue,
              (m) => (phoneticIslandError = m),
              phoneticIslandError,
            )}
          {/if}
        </div>
      </div>

      {#if skin}
        <div class="mt-6 border-t border-amber-200/60 pt-5">
          <span class={LABEL_CLASS}>Skin tone</span>
          <div class="mt-2">
            <SwatchPicker swatches={HAND_SWATCHES} value={getUInt(skin)} onChange={setSkin} />
          </div>
        </div>
      {/if}
    </section>

    {#if money || playTime || bootNum || (bdayDay && bdayMonth && bdayYear)}
      <section class={CARD_CLASS}>
        <div class="flex flex-wrap gap-x-8 gap-y-5">
          {#if money}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>Money</span>
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
                <p class="mt-1 text-xs font-bold text-red-700">{moneyError}</p>
              {/if}
            </div>
          {/if}

          {#if bdayDay && bdayMonth && bdayYear}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>Birthday</span>
              <div class="mt-1.5">
                <DateField day={bdayDay} month={bdayMonth} year={bdayYear} />
              </div>
            </div>
          {/if}

          {#if playTime}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>Play time</span>
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
                <span class="text-xs text-slate-700">
                  seconds ·
                  <span class="font-mono text-slate-900">
                    {formatPlayTime(playTimeValue)}
                  </span>
                </span>
              </div>
              {#if playTimeError}
                <p class="mt-1 text-xs text-red-600">{playTimeError}</p>
              {/if}
            </div>
          {/if}

          {#if bootNum}
            <div class="min-w-0">
              <span class={LABEL_CLASS}>Boots</span>
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
                <p class="mt-1 text-xs text-red-600">{bootError}</p>
              {/if}
            </div>
          {/if}
        </div>
      </section>
    {/if}

    {#if region || regionCode || nameLang || islandLang}
      <section class={CARD_CLASS}>
        <h3 class="mb-4 text-sm font-semibold text-neutral-900">Region & language</h3>
        <div class="grid gap-4 sm:grid-cols-2">
          {#if region}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>Region</span>
              <div class="mt-1.5 max-w-xs"><EntryEditor entry={region} /></div>
            </label>
          {/if}
          {#if regionCode}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>Region code</span>
              <div class="mt-1.5 max-w-xs">
                <EntryEditor entry={regionCode} />
              </div>
            </label>
          {/if}
          {#if nameLang}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>Name language</span>
              <div class="mt-1.5 max-w-xs">
                <EntryEditor entry={nameLang} />
              </div>
            </label>
          {/if}
          {#if islandLang}
            <label class="block min-w-0">
              <span class={LABEL_CLASS}>Island name language</span>
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
