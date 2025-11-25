<script lang="ts">
  import { searchActors } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Search, Loader2, User, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';
  import { clsx } from 'clsx';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';

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

<div class={clsx('search-profiles', className)}>
  {#if showHeading}
    <header class="search-header">
      <h2>{t('search.title')}</h2>
      <p>{t('search.description')}</p>
    </header>
  {/if}

  <Card>
    <CardContent>
      <form onsubmit={search} class="search-form">
        <div class="search-input-wrap">
          <Search size={20} class="search-icon" />
          <Input
            id="search-q"
            name="q"
            type="search"
            bind:value={q}
            placeholder={t('search.placeholder')}
            class="search-input"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" disabled={loading || !q.trim()}>
          {#if loading}
            <Loader2 size={20} class="loading-spin" />
          {:else}
            {t('search.submit')}
          {/if}
        </Button>
      </form>
    </CardContent>
  </Card>

  {#if status}
    <StateCard icon={AlertCircle} title={t('search.errorTitle')} description={status}>
      {#snippet actions()}
        <Button variant="outline" type="button" onclick={executeSearch} disabled={loading}>
          {t('buttons.tryAgain')}
        </Button>
      {/snippet}
    </StateCard>
  {/if}

  {#if loading}
    <StateCard icon={Loader2} loading={true} title={t('search.loadingTitle')} description={t('search.loadingDescription')} />
  {:else if results.length > 0}
    <div class="results">
      {#each results as actor, idx (actor.did || actor.handle || idx)}
        <ProfileHeader profile={actor} handle={actor.handle} size="sm" />
      {/each}
    </div>
  {:else if hasSearched && !loading}
    <StateCard icon={User} title={t('search.emptyTitle')} description={t('search.emptyDescription', { query: q })}>
      {#snippet actions()}
        <Button variant="outline" type="button" onclick={() => { q = ''; results = []; status = ''; hasSearched = false; }}>
          {t('search.clear')}
        </Button>
      {/snippet}
    </StateCard>
  {/if}
</div>

<style>
  .search-profiles {
    display: flex;
    flex-direction: column;
    gap: var(--size-5);
  }

  .search-header {
    text-align: center;
  }

  .search-form {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  .search-input-wrap {
    position: relative;
    flex: 1;
  }

  .search-input-wrap :global(.search-icon) {
    position: absolute;
    left: var(--size-3);
    top: 50%;
    translate: 0 -50%;
    opacity: 0.6;
  }

  .search-input-wrap :global(.search-input) {
    padding-left: var(--size-7);
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: var(--size-3);
  }

  :global(.loading-spin) {
    animation: var(--animation-spin);
  }

  @media (min-width: 640px) {
    .search-form {
      flex-direction: row;
    }
  }
</style>
