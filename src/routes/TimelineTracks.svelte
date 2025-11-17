<script lang="ts">
  import { onMount } from 'svelte';
  import { timelineTracks, isScopeMissing } from '$lib/services/r4-service';
  import { setPlaylist } from '$lib/player/store';
  import TrackList from '$lib/components/TrackList.svelte';
  import { Button } from '$lib/components/ui/button';
  import { PlayCircle, AlertCircle } from 'lucide-svelte';

  let items = $state([]);
  let error = $state('');
  let loading = $state(true);
  const context = { type: 'timeline', key: 'following' };

  onMount(async () => {
    try {
      items = await timelineTracks({ limitPerActor: 5 });
    } catch (e) {
      error = (e as Error)?.message || String(e);
      if (isScopeMissing(e)) error = 'Missing permission to read followings. Visit Settings to manage permissions.';
    } finally {
      loading = false;
    }
  });

  function playAll(fromIdx: number) {
    setPlaylist(items, fromIdx);
  }
</script>

<div class="container max-w-4xl py-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold">Your Timeline</h1>
    {#if items.length > 0}
      <Button onclick={() => playAll(0)}>
        <PlayCircle class="mr-2 h-4 w-4" />
        Play All
      </Button>
    {/if}
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p class="mt-2 text-muted-foreground">Loading tracks...</p>
      </div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <div class="flex items-start gap-3">
        <AlertCircle class="h-5 w-5 text-destructive mt-0.5" />
        <div class="flex-1">
          <h3 class="font-semibold text-destructive mb-2">Failed to load timeline</h3>
          <p class="text-sm text-destructive/90 mb-4">{error}</p>
          <Button variant="outline" onclick={() => (location.hash = '#/settings')}>
            Open Settings
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <TrackList tracks={items} {context} onremoved={(e) => { items = items.filter((t) => t.uri !== e.detail.uri); }} />
  {/if}
</div>
