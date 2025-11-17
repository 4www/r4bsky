<script lang="ts">
  import { getTrackByUri, resolveHandle, getHandleByDid } from '$lib/services/r4-service';
  import TrackListItem from '$lib/components/TrackListItem.svelte';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import { session } from '$lib/state/session';
  import { Card, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Loader2 } from 'lucide-svelte';

  const props = $props();
  const repo = $derived(props.repo || '');
  const _handle = $derived(props.handle || '');
  // Strip @ symbol if present (from URL like /@handle)
  const handle = $derived(_handle ? _handle.replace(/^@/, '') : '');
  const rkey = $derived(props.rkey || '');

  let item = $state(null);
  let did = $state('');
  let status = $state('');
  let loading = $state(true);
  let displayHandle = $state('');
  const context = $derived({ type: 'detail', key: rkey, handle: displayHandle || undefined });
  const editable = $derived((($session?.did && did && $session.did === did) ? true : false));

  async function loadByUri(uri) {
    try {
      const rec = await getTrackByUri(uri);
      item = { ...rec };
      status = '';
    } catch (e) {
      status = 'Error loading track';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!rkey) return;
    if (repo) {
      did = repo;
      (async () => {
        try {
          displayHandle = await getHandleByDid(did) || '';
        } catch {}
      })();
      const uri = `at://${repo}/com.radio4000.track/${rkey}`;
      loadByUri(uri);
      return;
    }
    if (handle) {
      (async () => {
        try {
          did = await resolveHandle(handle);
          displayHandle = handle;
          const uri = `at://${did}/com.radio4000.track/${rkey}`;
          await loadByUri(uri);
        } catch (e) {
          status = 'Error resolving handle';
          loading = false;
        }
      })();
    }
  });
</script>

<div class="container max-w-4xl py-8">
  {#if displayHandle}
    <Card class="mb-6">
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>
            <a href={`#/@${encodeURIComponent(displayHandle)}`} class="hover:text-primary transition-colors">
              @{displayHandle}
            </a>
          </CardTitle>
          {#if did}
            <FollowButton actorDid={did} />
          {/if}
        </div>
      </CardHeader>
    </Card>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <Loader2 class="inline-block h-8 w-8 animate-spin" />
        <p class="mt-2 text-muted-foreground">Loading track...</p>
      </div>
    </div>
  {:else if status}
    <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <p class="text-sm text-destructive">{status}</p>
    </div>
  {:else if item}
    <TrackListItem item={item} index={0} items={[item]} {context} {editable} />
  {/if}
</div>
