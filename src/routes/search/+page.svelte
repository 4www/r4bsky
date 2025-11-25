<script lang="ts">
  import SearchProfiles from '$lib/components/SearchProfiles.svelte';
  import { locale, translate } from '$lib/i18n';

  const t = (key, vars = {}) => translate($locale, key, vars);
</script>

<div class="search-page">
  <header class="animate-in">
    <h1>{t('search.title')}</h1>
    <p>{t('search.description')}</p>
  </header>

  <SearchProfiles showHeading={false} />
</div>

<style>
  .search-page {
    max-width: 56rem;
    margin-inline: auto;
    padding: var(--size-fluid-2);
    display: flex;
    flex-direction: column;
    gap: var(--size-fluid-2);
  }

  .search-page > header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  .search-page > header h1 {
    font-weight: var(--font-weight-7);
  }

  .search-page > header p {
    color: var(--muted-foreground);
    max-width: 42rem;
    margin-inline: auto;
  }
</style>
