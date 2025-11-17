<script lang="ts">
  import { resolveHandle, listTracksByDid } from '$lib/services/r4-service';
  import { onMount } from 'svelte';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { PlayCircle, Loader2, AlertCircle } from 'lucide-svelte';
  import { setPlaylist } from '$lib/player/store';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';

  const { data } = $props();
  // Strip @ symbol if present (from URL like /@handle) - make it reactive with $derived
  const handle = $derived(data?.handle ? data.handle.replace(/^@/, '') : '');

  let did = $state('');
  let items = $state([]);
  let cursor = $state(undefined);
  let status = $state('');
  let loading = $state(false);
  const context = $derived(did ? { type: 'author', key: did, handle } : { type: 'author', key: handle || '' });
  let loadRequestId = 0;
  const t = (key, vars = {}) => translate($locale, key, vars);

  function refreshAuthor() {
    if (handle) {
      loadAuthor(handle);
    }
  }

  async function loadAuthor(currentHandle: string) {
    const requestId = ++loadRequestId;
    loading = true;
    status = '';
    did = '';
    items = [];
    cursor = undefined;

    (async () => {
      try {
        const resolvedDid = await resolveHandle(currentHandle);
        if (requestId !== loadRequestId) return;
        did = resolvedDid;
        const { tracks, cursor: c } = await listTracksByDid(resolvedDid);
        if (requestId !== loadRequestId) return;
        items = tracks;
        cursor = c;
      } catch (err) {
        if (requestId === loadRequestId) status = (err as Error)?.message || String(err);
      } finally {
        if (requestId === loadRequestId) loading = false;
      }
    })();
  }

  onMount(() => {
    if (handle) {
      loadAuthor(handle);
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
                {t('profile.playAll')}
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
        <CardTitle>{t('profile.viewFormTitle')}</CardTitle>
        <CardDescription>{t('profile.viewFormDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4">
          <div class="space-y-2">
            <Label for="author-handle">{t('profile.formLabel')}</Label>
            <Input
              id="author-handle"
              name="handle"
              type="text"
              placeholder={t('profile.formPlaceholder')}
              required
            />
          </div>
          <Button type="submit" class="w-full">
            {t('profile.formSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  {/if}

  {#if status}
    <StateCard
      icon={AlertCircle}
      title={t('profile.errorTitle')}
      description={status}
      class="mb-6"
    >
      {#if handle}
        {#snippet actions()}
          <Button variant="outline" onclick={refreshAuthor}>
            {t('buttons.tryAgain')}
          </Button>
        {/snippet}
      {/if}
    </StateCard>
  {/if}

  {#if loading}
    <StateCard
      icon={Loader2}
      title={t('profile.loadingTitle')}
      description={t('profile.loadingDescription')}
    />
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
          {t('profile.loadMore')}
        </Button>
      </div>
    {/if}
  {/if}
</div>
