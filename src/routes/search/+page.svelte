<script lang="ts">
  import { searchActors } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Search, Loader2, User } from 'lucide-svelte';

  let q = $state('');
  let results = $state([]);
  let status = $state('');
  let loading = $state(false);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;

    loading = true;
    status = '';
    try {
      results = await searchActors(q, { limit: 25 });
    } catch (err) {
      status = 'Error: ' + (err?.message || err);
    } finally {
      loading = false;
    }
  }

  function authorHref(handle) {
    return `#/@${encodeURIComponent(handle)}`;
  }
</script>

<div class="container max-w-4xl py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">Search People</h1>
    <p class="text-muted-foreground">Find people on Bluesky and discover their music tracks</p>
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
            placeholder="Search handles... (e.g., hwww.org)"
            class="pl-9"
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !q.trim()}>
          {#if loading}
            <Loader2 class="h-4 w-4 animate-spin" />
          {:else}
            Search
          {/if}
        </Button>
      </form>
    </CardContent>
  </Card>

  {#if status}
    <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6">
      <p class="text-sm text-destructive">{status}</p>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <Loader2 class="inline-block h-8 w-8 animate-spin" />
        <p class="mt-2 text-muted-foreground">Searching...</p>
      </div>
    </div>
  {:else if results.length > 0}
    <div class="space-y-3">
      {#each results as actor}
        <Card class="hover:shadow-md transition-shadow">
          <a href={authorHref(actor.handle)} class="block">
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
    <div class="text-center py-12">
      <User class="inline-block h-12 w-12 text-muted-foreground mb-3" />
      <p class="text-muted-foreground">No people found for "{q}"</p>
    </div>
  {/if}
</div>
