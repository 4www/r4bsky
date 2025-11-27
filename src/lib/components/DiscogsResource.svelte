<script lang="ts">
  import { onMount } from 'svelte';
  import { parseDiscogsUrl, fetchDiscogs, resourceTrackToR4Track } from '$lib/services/discogs.service';
  import { play } from '$lib/player/store';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { ExternalLink, Play, Disc } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import TrackListItem from '$lib/components/TrackListItem.svelte';

  let { url = '', handle = '' } = $props();

  const t = (key, vars = {}) => translate($locale, key, vars);

  let resource = $state(null);
  let loading = $state(true);
  let error = $state('');

  async function loadResource() {
    if (!url) return;

    loading = true;
    error = '';

    try {
      const info = parseDiscogsUrl(url);
      if (!info) {
        error = 'Invalid Discogs URL';
        return;
      }

      const data = await fetchDiscogs(info);
      resource = data;
    } catch (e) {
      error = String(e?.message || e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadResource();
  });

  $effect(() => {
    if (url) {
      loadResource();
    }
  });

  function playTrack(track, index) {
    const tracks = resource.tracklist
      .map(t => resourceTrackToR4Track(t, resource))
      .filter(t => t.url); // Only tracks with video URLs

    play(tracks, index, {
      type: 'discogs',
      key: resource.id,
      handle: handle || resource.artists_sort || resource.artists?.map(a => a.name).join(', ')
    });
  }

  function playAll() {
    playTrack(resource.tracklist[0], 0);
  }

  const artistName = $derived(
    resource?.artists_sort || resource?.artists?.map(a => a.name).join(', ') || 'Unknown Artist'
  );

  const r4Tracks = $derived.by(() => {
    if (!resource?.tracklist) return [];
    return resource.tracklist
      .map(t => resourceTrackToR4Track(t, resource))
      .filter(t => t.url); // Only tracks with video URLs
  });

  const context = $derived({
    type: 'discogs',
    key: resource?.id,
    handle: handle || resource?.artists_sort || resource?.artists?.map(a => a.name).join(', ')
  });
</script>

{#if loading}
  <Card>
    <CardContent class="p-6">
      <p class="text-sm text-muted-foreground">Loading Discogs data...</p>
    </CardContent>
  </Card>
{:else if error}
  <Card>
    <CardContent class="p-6">
      <p class="text-sm text-destructive">{error}</p>
    </CardContent>
  </Card>
{:else if resource}
  <Card>
    <CardHeader>
      <div class="flex items-start gap-4">
        {#if resource.thumb || resource.cover_image}
          <img
            src={resource.thumb || resource.cover_image}
            alt={resource.title}
            class="w-20 h-20 rounded object-cover shrink-0"
          />
        {:else}
          <div class="w-20 h-20 rounded bg-muted flex items-center justify-center shrink-0">
            <Disc class="h-8 w-8 text-muted-foreground" />
          </div>
        {/if}
        <div class="flex-1 min-w-0">
          <CardTitle class="text-lg">{artistName}</CardTitle>
          <CardDescription>{resource.title}</CardDescription>
          {#if resource.year || resource.genres?.length}
            <div class="flex gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
              {#if resource.year}
                <span>{resource.year}</span>
              {/if}
              {#if resource.genres?.length}
                <span>•</span>
                <span>{resource.genres.join(', ')}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <Button variant="primary" onclick={playAll} size="sm" class="flex-1 min-w-[120px]">
          <Play class="mr-2 h-3.5 w-3.5" />
          Play All
        </Button>
        <Button
          onclick={() => window.open(resource.uri, '_blank')}
          variant="outline"
          size="sm"
          class="flex-1 min-w-[120px]"
        >
          <ExternalLink class="mr-2 h-3.5 w-3.5" />
          Discogs
        </Button>
      </div>

      {#if r4Tracks.length > 0}
        <div class="space-y-1">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
            Tracklist ({r4Tracks.length} {r4Tracks.length === 1 ? 'track' : 'tracks'} with video)
          </p>
          <div class="rounded-lg border-0 space-y-0">
            {#each r4Tracks as track, idx}
              <TrackListItem
                item={track}
                index={idx}
                items={r4Tracks}
                {context}
                editable={false}
                flat={true}
                showAuthor={false}
              />
            {/each}
          </div>
        </div>
      {:else if resource.tracklist?.length}
        <div class="space-y-1">
          <p class="text-xs text-muted-foreground">
            No tracks with video URLs available
          </p>
        </div>
      {/if}
    </CardContent>
  </Card>
{/if}
