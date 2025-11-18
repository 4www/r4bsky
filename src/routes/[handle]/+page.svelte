<script lang="ts">
  import { resolveHandle, listTracksByDid, getProfile } from '$lib/services/r4-service';
  import { onMount } from 'svelte';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import TrackList from '$lib/components/TrackList.svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
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
  let profile = $state(null);
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
    profile = null;
    items = [];
    cursor = undefined;

    (async () => {
      try {
        const resolvedDid = await resolveHandle(currentHandle);
        if (requestId !== loadRequestId) return;
        did = resolvedDid;

        // Fetch profile data in parallel with tracks
        const [profileData, tracksData] = await Promise.all([
          getProfile(currentHandle),
          listTracksByDid(resolvedDid)
        ]);

        if (requestId !== loadRequestId) return;
        profile = profileData;
        items = tracksData.tracks;
        cursor = tracksData.cursor;
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

<div class="container max-w-4xl py-8 lg:py-12">
  {#if handle}
    <ProfileHeader {profile} {handle} size="lg" class="mb-8" clickable={false}>
      {#snippet children()}
        <div class="flex gap-3 flex-wrap">
          {#if items.length > 0}
            <Button size="lg" class="shadow-md" onclick={() => playAll(0)}>
              <PlayCircle class="mr-2 h-5 w-5" />
              {t('profile.playAll')}
            </Button>
          {/if}
          {#if did && $session?.did !== did}
            <FollowButton actorDid={did} />
          {/if}
        </div>
      {/snippet}
    </ProfileHeader>
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
