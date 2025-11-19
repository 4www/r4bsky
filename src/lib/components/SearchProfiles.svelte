<script lang="ts">
  import { searchActors } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Search, Loader2, User, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { locale, translate } from '$lib/i18n';
  import Link from '$lib/components/Link.svelte';
  import { cn } from '$lib/utils';

  const props = $props<{ showHeading?: boolean; class?: string }>();
  const showHeading = $derived(props.showHeading ?? true);
  const className = $derived(props.class ?? '');

  let q = $state('');
  let results = $state([]);
  let status = $state('');
  let loading = $state(false);
  let hasSearched = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function executeSearch() {
    if (!q.trim()) return;

    loading = true;
    status = '';
    hasSearched = true;
    try {
      results = await searchActors(q, { limit: 25 });
    } catch (err) {
      status = (err as Error)?.message || String(err);
    } finally {
      loading = false;
    }
  }

  async function search(event) {
    event.preventDefault();
    await executeSearch();
  }
</script>

<div class={cn('space-y-8', className)}>
  {#if showHeading}
    <div class="text-center animate-in space-y-3">
      <h2 class="text-3xl font-bold text-gradient">{t('search.title')}</h2>
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto">{t('search.description')}</p>
    </div>
  {/if}

  <Card class="border-2 shadow-lg">
    <CardContent class="pt-6">
      <form onsubmit={search} class="flex flex-col gap-4 sm:flex-row">
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
      loading={true}
      title={t('search.loadingTitle')}
      description={t('search.loadingDescription')}
    />
  {:else if results.length > 0}
    <div class="space-y-4">
      {#each results as actor, idx (actor.did || actor.handle || idx)}
        <Card class="border-2">
          <Link href={`/@${actor.handle}`} class="block">
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
          </Link>
        </Card>
      {/each}
    </div>
  {:else if hasSearched && !loading}
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
            hasSearched = false;
          }}
        >
          {t('search.clear')}
        </Button>
      {/snippet}
    </StateCard>
  {/if}
</div>
