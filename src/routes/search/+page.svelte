<script lang="ts">
  import { searchActors } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Search, Loader2, User, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';
  import { resolve } from '$app/paths';

  let q = $state('');
  let results = $state([]);
  let status = $state('');
  let loading = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function executeSearch() {
    if (!q.trim()) return;

    loading = true;
    status = '';
    try {
      results = await searchActors(q, { limit: 25 });
    } catch (err) {
      status = (err as Error)?.message || String(err);
    } finally {
      loading = false;
    }
  }

  async function search(e) {
    e.preventDefault();
    await executeSearch();
  }
</script>

<div class="container max-w-4xl py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">{t('search.title')}</h1>
    <p class="text-muted-foreground">{t('search.description')}</p>
  </div>

  <Card class="mb-8">
    <CardContent class="pt-6">
      <form onsubmit={search} class="flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-q"
            name="q"
            type="search"
            bind:value={q}
            placeholder={t('search.placeholder')}
            class="pl-9"
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !q.trim()}>
          {#if loading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            {t('search.submit')}
          {/if}
        </Button>
      </form>
    </CardContent>
  </Card>

  {#if status}
    <StateCard
      icon={AlertCircle}
      title={t('search.errorTitle')}
      description={status}
    >
      {#snippet actions()}
        <Button variant="outline" type="button" onclick={executeSearch} disabled={loading}>
          {t('buttons.tryAgain')}
        </Button>
      {/snippet}
    </StateCard>
  {/if}

  {#if loading}
    <StateCard
      icon={Loader2}
      title={t('search.loadingTitle')}
      description={t('search.loadingDescription')}
    />
  {:else if results.length > 0}
    <div class="space-y-3">
      {#each results as actor, idx (actor.did || actor.handle || idx)}
        <Card class="hover:shadow-md transition-shadow">
          <a href={resolve(`/@${encodeURIComponent(actor.handle)}`)} class="block">
            <CardHeader class="pb-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User class="h-5 w-5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <CardTitle class="text-base">
                    {actor.displayName || actor.handle}
                  </CardTitle>
                  <p class="text-sm text-muted-foreground truncate">
                    @{actor.handle}
                  </p>
                </div>
              </div>
              {#if actor.description}
                <p class="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {actor.description}
                </p>
              {/if}
            </CardHeader>
          </a>
        </Card>
      {/each}
    </div>
  {:else if q && !loading}
    <StateCard
      icon={User}
      title={t('search.emptyTitle')}
      description={t('search.emptyDescription', { query: q })}
    >
      {#snippet actions()}
        <Button
          variant="outline"
          type="button"
          onclick={() => {
            q = '';
            results = [];
            status = '';
          }}
        >
          {t('search.clear')}
        </Button>
      {/snippet}
    </StateCard>
  {/if}
</div>
