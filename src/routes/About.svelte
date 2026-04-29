<script lang="ts">
  import { _, locale } from 'svelte-i18n';
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
      label: 'Star-F0rce',
      noteKey: 'about.credits.sharemii_note',
    },
    {
      label: 'Rafa',
      noteKey: 'about.credits.test_saves_note',
    },
    {
      label: 'SuperSpazzy',
      noteKey: 'about.credits.hash_work_note',
    },
    {
      label: 'Camille',
      noteKey: 'about.credits.wish_offset_note',
    },
    {
      label: 'Morgan',
      noteKey: 'about.credits.island_size_note',
    },
  ];

  const TRANSLATORS: Record<string, string[]> = {
    'pt-BR': ['Rafa'],
  };

  const listFormatter = $derived(
    new Intl.ListFormat($locale ?? 'en-US', { style: 'long', type: 'conjunction' }),
  );
  const languageNames = $derived(new Intl.DisplayNames([$locale ?? 'en-US'], { type: 'language' }));

  const translations = $derived(
    Object.entries(TRANSLATORS).map(([tag, authors]) => ({
      tag,
      language: languageNames.of(tag) ?? tag,
      authors: listFormatter.format(authors),
    })),
  );
</script>

<AppLayout>
  <div class="space-y-6">
    <div
      role="alert"
      class="flex gap-3 rounded-2xl bg-danger-bg p-4 text-sm text-danger shadow-sm ring-1 ring-danger-edge"
    >
      <span aria-hidden="true" class="text-lg leading-none">⚠️</span>
      <div>
        <p class="font-bold">{$_('about.backup_warning_title')}</p>
        <p class="mt-1">{$_('about.backup_warning_body')}</p>
      </div>
    </div>

    <Card title={$_('about.title')}>
      <p class="text-sm text-content">{$_('about.intro')}</p>
      <p class="mt-3 text-sm text-content">
        {$_('about.community_label')}
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-brand underline-offset-2 hover:underline"
        >
          {$_('about.community_link')}
        </a>
      </p>
      <p class="mt-3 text-sm text-content">
        {$_('about.source_label')}
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-brand underline-offset-2 hover:underline"
        >
          {repoUrl}
        </a>
      </p>
    </Card>

    <Card title={$_('about.credits_title')}>
      <ul class="space-y-3 text-sm text-content">
        {#each credits as credit (credit.label)}
          <li>
            {#if credit.href}
              <a
                href={credit.href}
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-brand underline-offset-2 hover:underline"
              >
                {credit.label}
              </a>
            {:else}
              <span class="font-medium text-content-strong">{credit.label}</span>
            {/if}
            <span class="text-content-muted"> - {$_(credit.noteKey)}</span>
          </li>
        {/each}
      </ul>
    </Card>

    <Card title={$_('about.translations_title')}>
      <ul class="space-y-3 text-sm text-content">
        {#each translations as translation (translation.tag)}
          <li>
            <span class="font-medium text-content-strong">{translation.language}</span>
            <span class="text-content-muted"> - {translation.authors}</span>
          </li>
        {/each}
      </ul>
    </Card>

    <Card title={$_('about.disclaimer_title')}>
      <p class="text-sm text-content">{$_('about.disclaimer')}</p>
    </Card>
  </div>
</AppLayout>
