<script lang="ts">
  import { searchActors } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Search, Loader2, User, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
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

<div class="container max-w-4xl py-8 lg:py-12">
  <div class="mb-10 text-center animate-in">
    <h1 class="text-4xl lg:text-5xl font-bold mb-4 text-gradient">{t('search.title')}</h1>
    <p class="text-lg text-muted-foreground max-w-2xl mx-auto">{t('search.description')}</p>
  </div>

  <Card class="mb-10 border-2 shadow-lg">
    <CardContent class="pt-6">
      <form onsubmit={search} class="flex gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <Input
            id="search-q"
            name="q"
            type="search"
            bind:value={q}
            placeholder={t('search.placeholder')}
            class="pl-12 h-12 text-base border-2"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" class="px-8 shadow-md" disabled={loading || !q.trim()}>
          {#if loading}
            <Loader2 class="h-5 w-5 animate-spin" />
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
    <div class="space-y-4">
      {#each results as actor, idx (actor.did || actor.handle || idx)}
        <Card class="card-hover border-2">
          <a href={resolve(`/@${encodeURIComponent(actor.handle)}`)} class="block">
            <CardHeader class="pb-4">
              <div class="flex items-center gap-4">
                <Avatar
                  src={actor.avatar}
                  alt={actor.displayName || actor.handle}
                  size="lg"
                />
                <div class="flex-1 min-w-0">
                  <CardTitle class="text-lg mb-1">
                    {actor.displayName || actor.handle}
                  </CardTitle>
                  <p class="text-base text-muted-foreground truncate flex items-center gap-2">
                    <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      @
                    </span>
                    {actor.handle}
                  </p>
                </div>
              </div>
              {#if actor.description}
                <p class="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
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
