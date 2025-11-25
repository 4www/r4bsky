<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Label } from '$lib/components/ui/label';
  import { Languages } from 'lucide-svelte';
  import { locale as localeStore, translate, availableLocales } from '$lib/i18n';

  const t = (key, vars = {}) => translate($localeStore, key, vars);
</script>

<div class="settings-stack">
  <Card>
    <CardHeader>
      <CardTitle class="card-title-icon">
        <Languages class="icon" />
        {t('settings.languageTitle')}
      </CardTitle>
      <CardDescription>
        {t('settings.languageDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent class="content-stack-sm">
      <Label for="language-select">{t('settings.languageLabel')}</Label>
      <select
        id="language-select"
        class="select"
        bind:value={$localeStore}
      >
        {#each availableLocales as option}
          <option value={option.code}>{option.label}</option>
        {/each}
      </select>
      <p class="footnote">
        Language preference is stored locally in your browser.
      </p>
    </CardContent>
  </Card>
</div>

<style>
  .settings-stack {
    display: flex;
    flex-direction: column;
    gap: var(--size-fluid-2);
  }

  .card-title-icon {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  :global(.content-stack-sm) {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  .select {
    width: 100%;
    padding: var(--size-2) var(--size-3);
    background: var(--background);
    color: var(--foreground);
    border: var(--border-size-1) solid var(--border);
    border-radius: var(--radius-2);
  }

  .select:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .footnote {
    color: var(--muted-foreground);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
  }
</style>
