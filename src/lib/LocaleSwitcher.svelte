<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { track } from './analytics';
  import { LOCALES, setAppLocale, type AppLocale } from './i18n';

  type LocaleMeta = { name: string; region?: string };

  function splitTag(tag: string): { language: string; region?: string } {
    const [language, region] = tag.split('-');
    return { language, region };
  }

  function describe(tag: string): LocaleMeta {
    const { language, region } = splitTag(tag);
    let name = language;
    try {
      const display = new Intl.DisplayNames([tag], { type: 'language' });
      name = display.of(language) ?? language;
      name = name.charAt(0).toLocaleUpperCase(tag) + name.slice(1);
    } catch {
      // Intl.DisplayNames unavailable
    }
    return { name, region };
  }

  const META: Record<string, LocaleMeta> = Object.fromEntries(
    LOCALES.map((tag) => [tag, describe(tag)]),
  );

  let open = $state(false);
  let currentValue = $state<AppLocale>(LOCALES[0]);

  $effect(() => {
    const unsub = locale.subscribe((v) => {
      if (!v) return;
      if (LOCALES.includes(v)) currentValue = v;
    });
    return unsub;
  });

  function pick(loc: AppLocale): void {
    open = false;
    if (loc === currentValue) return;
    track('locale_changed', { from: currentValue, to: loc });
    setAppLocale(loc);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') open = false;
  }

  function onWindowClick(event: MouseEvent): void {
    if (!open) return;
    if (!(event.target instanceof Node)) return;
    if (root && !root.contains(event.target)) open = false;
  }

  let root = $state<HTMLDivElement | null>(null);
</script>

<svelte:window onclick={onWindowClick} onkeydown={onKeydown} />

<div bind:this={root} class="relative">
  <button
    type="button"
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
    class="flex items-center gap-1.5 rounded-full bg-surface-muted/80 px-3 py-1 text-xs font-semibold leading-none text-brand/90 ring-1 ring-edge/60 transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
  >
    <span class="sr-only">{$_('header.language_sr')}</span>
    <span>{META[currentValue].name}</span>
    {#if META[currentValue].region}
      <span class="text-[10px] font-bold uppercase tracking-wider text-brand/70">
        {META[currentValue].region}
      </span>
    {/if}
  </button>

  {#if open}
    <ul
      role="listbox"
      aria-label="Language"
      class="absolute right-0 z-20 mt-2 max-h-80 w-48 overflow-y-auto rounded-lg bg-surface py-1 shadow-lg ring-1 ring-edge/60"
    >
      {#each LOCALES as loc (loc)}
        {@const meta = META[loc]}
        {@const active = loc === currentValue}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={active}
            onclick={() => pick(loc)}
            class={[
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
              active
                ? 'bg-orange-500/15 font-semibold text-brand'
                : 'text-content hover:bg-surface-muted',
            ]}
          >
            <span class="flex-1">{meta.name}</span>
            {#if meta.region}
              <span
                class="font-mono text-[10px] font-bold uppercase tracking-wider text-content-faint"
              >
                {meta.region}
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
