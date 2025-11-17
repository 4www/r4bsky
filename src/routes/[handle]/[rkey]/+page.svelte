<script lang="ts">
  import { onMount } from 'svelte';
  import { getTrackByUri, resolveHandle, getHandleByDid } from '$lib/services/r4-service';
  import TrackListItem from '$lib/components/TrackListItem.svelte';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import { session } from '$lib/state/session';
  import { Card, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Loader2, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import { locale, translate } from '$lib/i18n';

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
  let loadRequestId = 0;
  const t = (key, vars = {}) => translate($locale, key, vars);

  function refreshTrack() {
    loadTrack(repo, handle, rkey);
  }

  async function loadTrack(currentRepo: string, currentHandle: string, currentRkey: string) {
    const requestId = ++loadRequestId;
    loading = true;
    status = '';
    item = null;

    try {
      if (currentRepo) {
        did = currentRepo;
        try {
          displayHandle = (await getHandleByDid(currentRepo)) || '';
        } catch {
          displayHandle = '';
        }
        const uri = `at://${currentRepo}/com.radio4000.track/${currentRkey}`;
        const rec = await getTrackByUri(uri);
        if (requestId === loadRequestId) item = { ...rec };
        return;
      }

      if (currentHandle) {
        const resolvedDid = await resolveHandle(currentHandle);
        if (requestId !== loadRequestId) return;
        did = resolvedDid;
        displayHandle = currentHandle;
        const uri = `at://${resolvedDid}/com.radio4000.track/${currentRkey}`;
        const rec = await getTrackByUri(uri);
        if (requestId === loadRequestId) item = { ...rec };
        return;
      }

      if (requestId === loadRequestId) status = t('trackDetail.errorTitle');
    } catch (e) {
      if (requestId === loadRequestId) status = (e as Error)?.message || t('trackDetail.errorTitle');
    } finally {
      if (requestId === loadRequestId) loading = false;
    }
  }

  onMount(() => {
    if (rkey) {
      loadTrack(repo, handle, rkey);
    }
  });
</script>

<div class="container max-w-4xl py-8">
  {#if displayHandle}
    <Card class="mb-6">
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>
            <a href={resolve(`/@${encodeURIComponent(displayHandle)}`)} class="hover:text-primary transition-colors">
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
    <StateCard
      icon={Loader2}
      title={t('trackDetail.loadingTitle')}
      description={t('trackDetail.loadingDescription')}
    />
  {:else if status}
    <StateCard
      icon={AlertCircle}
      title={t('trackDetail.errorTitle')}
      description={status}
    >
      {#snippet actions()}
        <Button variant="outline" onclick={refreshTrack}>
          {t('buttons.tryAgain')}
        </Button>
      {/snippet}
    </StateCard>
  {:else if item}
    <TrackListItem item={item} index={0} items={[item]} {context} {editable} />
  {/if}
</div>
