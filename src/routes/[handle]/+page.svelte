<script lang="ts">
  import { resolveHandle, listTracksByDid } from '$lib/services/r4-service';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { PlayCircle, Loader2 } from 'lucide-svelte';
  import { setPlaylist } from '$lib/player/store';

  const { data } = $props();
  // Strip @ symbol if present (from URL like /@handle) - make it reactive with $derived
  const handle = $derived(data?.handle ? data.handle.replace(/^@/, '') : '');

  let did = $state('');
  let items = $state([]);
  let cursor = $state(undefined);
  let status = $state('');
  let loading = $state(false);
  const context = $derived(did ? { type: 'author', key: did, handle } : { type: 'author', key: handle || '' });

  async function loadAuthor() {
    if (!handle) return;

    loading = true;
    status = '';
    did = '';
    items = [];
    cursor = undefined;

    try {
      did = await resolveHandle(handle);
      const { tracks, cursor: c } = await listTracksByDid(did);
      items = tracks;
      cursor = c;
    } catch (err) {
      status = 'Error: ' + (err?.message || err);
    } finally {
      loading = false;
    }
  }

  // Load author whenever handle changes
  $effect(() => {
    if (handle) {
      loadAuthor();
    }
  });

  async function more() {
    if (!cursor) return;
    const { tracks, cursor: c } = await listTracksByDid(did, { cursor });
    items = [...items, ...tracks];
    cursor = c;
  }

  function playAll(fromIdx) {
    setPlaylist(items, fromIdx);
  }
</script>

<div class="container max-w-4xl py-8">
  {#if handle}
    <Card class="mb-6">
      <CardHeader>
        <div class="flex items-start justify-between">
          <div>
            <CardTitle class="text-2xl">@{handle}</CardTitle>
            {#if did}
              <CardDescription class="mt-1">
                {did.slice(0, 20)}...
              </CardDescription>
            {/if}
          </div>
          <div class="flex gap-2">
            {#if items.length > 0}
              <Button onclick={() => playAll(0)}>
                <PlayCircle class="mr-2 h-4 w-4" />
                Play All
              </Button>
            {/if}
            {#if did}
              <FollowButton actorDid={did} />
            {/if}
          </div>
        </div>
      </CardHeader>
    </Card>
  {:else}
    <Card>
      <CardHeader>
        <CardTitle>View Profile</CardTitle>
        <CardDescription>Enter a Bluesky handle to view their tracks</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4">
          <div class="space-y-2">
            <Label for="author-handle">Handle</Label>
            <Input
              id="author-handle"
              name="handle"
              type="text"
              placeholder="alice.bsky.social"
              required
            />
          </div>
          <Button type="submit" class="w-full">
            Load Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  {/if}

  {#if status}
    <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6">
      <p class="text-sm text-destructive">{status}</p>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <Loader2 class="inline-block h-8 w-8 animate-spin" />
        <p class="mt-2 text-muted-foreground">Loading tracks...</p>
      </div>
    </div>
  {:else if items.length}
    <TrackList
      tracks={items}
      {context}
      editable={($session?.did && did && $session.did === did) || false}
      on:remove={(e) => { items = items.filter((t) => t.uri !== e.detail.uri); }}
    />
    {#if cursor}
      <div class="mt-6 text-center">
        <Button variant="outline" onclick={more}>
          Load More Tracks
        </Button>
      </div>
    {/if}
  {/if}
</div>
