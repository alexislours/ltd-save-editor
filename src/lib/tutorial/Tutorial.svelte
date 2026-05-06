<script lang="ts">
  import { tick } from 'svelte';
  import { _ } from 'svelte-i18n';
  import type { Driver } from 'driver.js';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { track } from '$lib/analytics';
  import { isSaveLoaded } from '$lib/saveFile/saveFile.svelte';
  import {
    TUTORIAL_STEP_BUILDERS,
    buildTutorials,
    firstStepSelector,
    type DriverStep,
    type TutorialEntry,
    type TutorialId,
  } from '$lib/tutorial/tutorialSteps';

  function clickSubtab(value: string): void {
    const btn = document.querySelector<HTMLButtonElement>(
      `[data-tutorial="subtabs"] [data-subtab="${value}"]`,
    );
    btn?.click();
  }

  let activeDriver: Driver | null = null;
  let open = $state(false);
  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  const tutorials = $derived(
    buildTutorials($_, {
      player: isSaveLoaded('player'),
      mii: isSaveLoaded('mii'),
      map: isSaveLoaded('map'),
    }),
  );

  const visibleTutorials = $derived(tutorials.filter((t) => t.available));

  async function startDriver(
    tutorialId: TutorialId,
    steps: DriverStep[],
    onEnd?: () => void,
  ): Promise<void> {
    if (steps.length === 0) return;
    const { driver } = await import('driver.js');
    activeDriver?.destroy();
    let dismissed = false;
    let lastIndex = 0;
    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      smoothScroll: true,
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.65,
      nextBtnText: $_('tutorial.next'),
      prevBtnText: $_('tutorial.prev'),
      doneBtnText: $_('tutorial.done'),
      progressText: '{{current}} / {{total}}',
      steps,
      onCloseClick: (_el, _step, opts) => {
        dismissed = true;
        opts.driver.destroy();
      },
      onDestroyStarted: (_el, _step, opts) => {
        lastIndex = opts.driver.getActiveIndex() ?? lastIndex;
        if (!opts.driver.isLastStep()) dismissed = true;
        opts.driver.destroy();
      },
      onDestroyed: () => {
        activeDriver = null;
        if (dismissed) {
          track('tutorial_dismissed', {
            tutorial: tutorialId,
            step: lastIndex + 1,
            steps: steps.length,
          });
        } else {
          track('tutorial_completed', { tutorial: tutorialId, steps: steps.length });
        }
        onEnd?.();
      },
    });
    activeDriver = d;
    d.drive();
  }

  function waitForElement(selector: string, timeoutMs = 1500): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        resolve();
        return;
      }
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeoutMs);
    });
  }

  function activeSubtab(): string | null {
    return (
      document
        .querySelector<HTMLElement>('[data-tutorial="subtabs"] [aria-current="page"]')
        ?.getAttribute('data-subtab') ?? null
    );
  }

  async function start(t: TutorialEntry): Promise<void> {
    open = false;
    track('tutorial_started', { from: page.url.pathname, tutorial: t.id });
    if (t.route && page.url.pathname !== t.route) {
      await goto(resolve(t.route));
      await tick();
      await waitForElement(firstStepSelector(t.id), 3000);
    }
    const initialSubtab = activeSubtab();
    const steps = TUTORIAL_STEP_BUILDERS[t.id]($_);
    await startDriver(t.id, steps, () => {
      if (initialSubtab && initialSubtab !== activeSubtab()) clickSubtab(initialSubtab);
    });
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === dialog) open = false;
  }
</script>

<button
  type="button"
  onclick={() => (open = true)}
  aria-haspopup="dialog"
  class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-content-strong shadow-sm ring-1 ring-edge/60 transition-colors hover:bg-surface-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
>
  <svg
    class="h-4 w-4 text-orange-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
    />
  </svg>
  {$_('tutorial.button')}
</button>

<dialog
  bind:this={dialog}
  onclose={() => (open = false)}
  onclick={handleBackdropClick}
  class="m-auto w-[min(36rem,calc(100vw_-_2rem))] rounded-2xl bg-surface p-0 text-content-strong shadow-2xl ring-1 ring-edge/60 backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
>
  <header class="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
    <div class="min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-brand/90">
        {$_('tutorial.dialog_eyebrow')}
      </p>
      <h2 class="mt-1 text-xl font-bold text-content-strong">
        {$_('tutorial.dialog_title')}
      </h2>
      <p class="mt-1 text-sm text-content-muted">
        {$_('tutorial.dialog_intro')}
      </p>
    </div>
    <button
      type="button"
      onclick={() => (open = false)}
      aria-label={$_('tutorial.dialog_close')}
      class="-mt-1 -mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-muted hover:text-content-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  </header>

  <div class="max-h-[70vh] overflow-y-auto px-3 pt-2 pb-5 sm:px-4">
    <ul class="flex flex-col gap-2">
      {#each visibleTutorials as t (t.id)}
        <li>
          <button
            type="button"
            onclick={() => start(t)}
            class="group relative flex w-full items-center gap-4 rounded-xl border border-edge/40 bg-surface px-4 py-3.5 text-left transition-all hover:-translate-y-px hover:border-orange-400/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            <span
              class={[
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
                t.accent,
              ]}
              aria-hidden="true"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d={t.iconPath} />
              </svg>
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="text-sm font-bold text-content-strong">{t.name}</span>
              <span class="text-xs leading-relaxed text-content-muted">{t.description}</span>
            </span>
            <svg
              class="h-4 w-4 shrink-0 text-content-faint transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.25"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</dialog>
