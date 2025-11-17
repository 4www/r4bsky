<script lang="ts">
  import { onMount } from 'svelte';
  import { getMyDid, getFollowers } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Loader2, User, AlertCircle } from 'lucide-svelte';

  let items = $state([]);
  let cursor = $state(undefined);
  let error = $state('');
  let loading = $state(true);
  let loadingMore = $state(false);

  async function load() {
    try {
      const did = await getMyDid();
      const res = await getFollowers(did, { cursor });
      items = res.followers;
      cursor = res.cursor;
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('Missing required scope')) {
        error = 'Missing permission to read social graph. Visit Settings to manage permissions.';
      } else {
        error = e?.message || String(e);
      }
    }
  }

  onMount(() => {
    load().finally(() => { loading = false; });
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
    } finally {
      loadingMore = false;
    }
  }
</script>

<div class="container max-w-4xl py-8">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">Followers</h1>
    <p class="text-muted-foreground mt-1">People following you on Bluesky</p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <Loader2 class="inline-block h-8 w-8 animate-spin" />
        <p class="mt-2 text-muted-foreground">Loading...</p>
      </div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <div class="flex items-start gap-3">
        <AlertCircle class="h-5 w-5 text-destructive mt-0.5" />
        <div class="flex-1">
          <h3 class="font-semibold text-destructive mb-2">Error</h3>
          <p class="text-sm text-destructive/90 mb-4">{error}</p>
          {#if error.includes('Missing permission')}
            <Button variant="outline" onclick={() => (location.hash = '#/settings')}>
              Open Settings
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {:else if items.length > 0}
    <div class="space-y-3">
      {#each items as actor}
        <Card class="hover:shadow-md transition-shadow">
          <a href={`#/@${encodeURIComponent(actor.handle || actor.did)}`} class="block">
            <CardHeader class="pb-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User class="h-5 w-5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <CardTitle class="text-base">
                    {actor.displayName || actor.handle || 'Unknown'}
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
            Loading...
          {:else}
            Load More
          {/if}
        </Button>
      </div>
    {/if}
  {:else}
    <div class="text-center py-12">
      <User class="inline-block h-12 w-12 text-muted-foreground mb-3" />
      <p class="text-muted-foreground">No followers yet</p>
    </div>
  {/if}
</div>
