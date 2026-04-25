<script lang="ts">
  import { _ } from 'svelte-i18n';
  import AppLayout from '../lib/AppLayout.svelte';
  import Card from '../lib/Card.svelte';

  const repoUrl = 'https://github.com/alexislours/ltd-save-editor';
  const discordUrl = 'https://discord.gg/YHFNTvXrdE';

  const credits: Array<{ href?: string; label: string; noteKey: string }> = [
    {
      href: 'https://github.com/tlmodding/living-the-dream-save-editor',
      label: 'tlmodding/living-the-dream-save-editor',
      noteKey: 'about.credits.save_structure_note',
    },
    {
      href: 'https://github.com/tlmodding/ltd-gamedata',
      label: 'tlmodding/ltd-gamedata',
      noteKey: 'about.credits.hash_list_note',
    },
    {
      label: 'Rafa',
      noteKey: 'about.credits.test_saves_note',
    },
    {
      label: 'SuperSpazzy',
      noteKey: 'about.credits.hash_work_note',
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
        <p class="font-bold">{$_('about.backup_warning_title')}</p>
        <p class="mt-1 text-red-800">{$_('about.backup_warning_body')}</p>
      </div>
    </div>

    <Card title={$_('about.title')}>
      <p class="text-sm text-slate-700">{$_('about.intro')}</p>
      <p class="mt-3 text-sm text-slate-700">
        {$_('about.community_label')}
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-orange-700 underline-offset-2 hover:underline"
        >
          {$_('about.community_link')}
        </a>
      </p>
      <p class="mt-3 text-sm text-slate-700">
        {$_('about.source_label')}
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

    <Card title={$_('about.credits_title')}>
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
            <span class="text-slate-600"> - {$_(credit.noteKey)}</span>
          </li>
        {/each}
      </ul>
    </Card>

    <Card title={$_('about.disclaimer_title')}>
      <p class="text-sm text-slate-700">{$_('about.disclaimer')}</p>
    </Card>
  </div>
</AppLayout>
