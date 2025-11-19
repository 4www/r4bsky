<script lang="ts">
  import SearchProfiles from '$lib/components/SearchProfiles.svelte';
  import { locale, translate } from '$lib/i18n';

  const t = (key, vars = {}) => translate($locale, key, vars);
</script>

<div class="container max-w-4xl py-8 lg:py-12 space-y-8">
  <div class="text-center animate-in space-y-3">
    <h1 class="text-4xl lg:text-5xl font-bold text-gradient">{t('search.title')}</h1>
    <p class="text-lg text-muted-foreground max-w-2xl mx-auto">{t('search.description')}</p>
  </div>

  <SearchProfiles showHeading={false} />
</div>
