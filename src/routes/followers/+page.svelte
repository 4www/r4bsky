<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyDid, getFollowers } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Loader2, User, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { locale, translate } from '$lib/i18n';

  let items = $state([]);
  let cursor = $state(undefined);
  let error = $state('');
  let loading = $state(true);
  let loadingMore = $state(false);
  let needsPermission = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function load() {
    try {
      const did = await getMyDid();
      const res = await getFollowers(did, { cursor });
      items = res.followers;
      cursor = res.cursor;
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('Missing required scope')) {
        error = t('followers.errorMissingScope');
        needsPermission = true;
      } else {
        error = e?.message || String(e);
        needsPermission = false;
      }
    }
  }

  async function refresh() {
    loading = true;
    error = '';
    cursor = undefined;
    items = [];
    needsPermission = false;
    try {
      await load();
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    refresh();
  });

  async function more() {
    if (!cursor || loadingMore) return;
    loadingMore = true;
    try {
      const did = await getMyDid();
      const res = await getFollowers(did, { cursor });
      items = [...items, ...(res.followers || [])];
      cursor = res.cursor;
    } catch (e) {
      error = e?.message || String(e);
      needsPermission = false;
    } finally {
      loadingMore = false;
    }
  }
</script>

<div class="container max-w-4xl py-8">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">{t('followers.title')}</h1>
    <p class="text-muted-foreground mt-1">{t('followers.description')}</p>
  </div>

  {#if loading}
    <StateCard
      icon={Loader2}
      title={t('followers.loading')}
      description={t('followers.description')}
    />
  {:else if error}
    <StateCard
      icon={AlertCircle}
      title={t('followers.errorTitle')}
      description={error}
    >
      {#snippet actions()}
        <Button variant="outline" onclick={refresh}>
          {t('buttons.tryAgain')}
        </Button>
        {#if needsPermission}
          <Button variant="ghost" onclick={() => goto(resolve('/settings'))}>
            {t('buttons.openSettings')}
          </Button>
        {/if}
      {/snippet}
    </StateCard>
  {:else if items.length > 0}
    <div class="space-y-3">
      {#each items as actor, idx (actor.did || actor.handle || idx)}
        <Card class="hover:shadow-md transition-shadow">
          <a href={resolve(`/@${encodeURIComponent(actor.handle || actor.did)}`)} class="block">
            <CardHeader class="pb-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User class="h-5 w-5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <CardTitle class="text-base">
                    {actor.displayName || actor.handle || t('common.unknown')}
                  </CardTitle>
                  <p class="text-sm text-muted-foreground truncate">
                    @{actor.handle || actor.did}
                  </p>
                </div>
              </div>
            </CardHeader>
          </a>
        </Card>
      {/each}
    </div>

    {#if cursor}
      <div class="mt-6 text-center">
        <Button variant="outline" onclick={more} disabled={loadingMore}>
          {#if loadingMore}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {t('followers.loadingMore')}
          {:else}
            {t('followers.loadMore')}
          {/if}
        </Button>
      </div>
    {/if}
  {:else}
    <StateCard
      icon={User}
      title={t('followers.emptyTitle')}
      description={t('followers.emptyDescription')}
    >
      {#snippet actions()}
        <Button variant="outline" onclick={() => goto(resolve('/add'))}>
          {t('followers.publishTrack')}
        </Button>
      {/snippet}
    </StateCard>
  {/if}
</div>
