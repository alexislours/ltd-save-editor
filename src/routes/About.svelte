<script lang="ts">
  import AppLayout from '../lib/AppLayout.svelte';
  import Card from '../lib/Card.svelte';

  const repoUrl = 'https://github.com/alexislours/ltd-save-editor';
  const discordUrl = 'https://discord.gg/YHFNTvXrdE';

  const credits = [
    {
      href: 'https://github.com/tlmodding/living-the-dream-save-editor',
      label: 'tlmodding/living-the-dream-save-editor',
      note: 'For the base structure of the save file.',
    },
    {
      href: 'https://github.com/tlmodding/ltd-gamedata',
      label: 'tlmodding/ltd-gamedata',
      note: 'The hash list shipped to the client.',
    },
    {
      label: 'Rafa',
      note: 'For providing test save files.',
    },
    {
      label: 'SuperSpazzy',
      note: 'For the work on the hash list.',
    },
  ];
</script>

<AppLayout>
  <div class="space-y-6">
    <div
      role="alert"
      class="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-900 shadow-sm ring-1 ring-red-300"
    >
      <span aria-hidden="true" class="text-lg leading-none">⚠️</span>
      <div>
        <p class="font-bold">Always back up your save files before editing.</p>
        <p class="mt-1 text-red-800">
          Make a copy of your <code class="rounded bg-red-100 px-1 py-0.5 text-xs">Mii.sav</code>,
          <code class="rounded bg-red-100 px-1 py-0.5 text-xs">Player.sav</code>, and
          <code class="rounded bg-red-100 px-1 py-0.5 text-xs">Map.sav</code> files somewhere safe before
          loading them here. A bad edit can corrupt your save and there is no in-game recovery.
        </p>
      </div>
    </div>

    <Card title="About">
      <p class="text-sm text-slate-700">
        A browser-based save editor for <em>Tomodachi Life: Living the Dream</em>
        (Nintendo Switch). Drop your
        <code class="rounded bg-amber-100 px-1 py-0.5 text-xs">Mii.sav</code>,
        <code class="rounded bg-amber-100 px-1 py-0.5 text-xs">Player.sav</code>, and
        <code class="rounded bg-amber-100 px-1 py-0.5 text-xs">Map.sav</code> files in, edit, and download
        a patched copy. Everything runs locally - files never leave your machine.
      </p>
      <p class="mt-3 text-sm text-slate-700">
        Community:
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-orange-700 underline-offset-2 hover:underline"
        >
          Tomodachi Life Modding Hub (Discord)
        </a>
      </p>
      <p class="mt-3 text-sm text-slate-700">
        Source code:
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-orange-700 underline-offset-2 hover:underline"
        >
          {repoUrl}
        </a>
      </p>
    </Card>

    <Card title="Credits">
      <ul class="space-y-3 text-sm text-slate-700">
        {#each credits as credit (credit.label)}
          <li>
            {#if credit.href}
              <a
                href={credit.href}
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-orange-700 underline-offset-2 hover:underline"
              >
                {credit.label}
              </a>
            {:else}
              <span class="font-medium text-slate-900">{credit.label}</span>
            {/if}
            <span class="text-slate-600"> - {credit.note}</span>
          </li>
        {/each}
      </ul>
    </Card>

    <Card title="Disclaimer">
      <p class="text-sm text-slate-700">
        This is an unofficial, fan-made tool. <em>Tomodachi Life: Living the Dream</em> is © Nintendo.
      </p>
    </Card>
  </div>
</AppLayout>
