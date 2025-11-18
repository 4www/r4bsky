<script lang="ts">
  import { listR4FollowsByDid, getProfiles } from '$lib/services/r4-service';
  import { onMount, getContext } from 'svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Loader2, AlertCircle, Users } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';

  const { data } = $props();

  // Get profile and did from layout context
  const profileContext = getContext('profile');
  const profile = $derived(profileContext?.profile);
  const did = $derived(profileContext?.did);

  let follows = $state([]);
  let profiles = $state(new Map());
  let cursor = $state(undefined);
  let status = $state('');
  let loading = $state(false);
  let loadRequestId = 0;
  const t = (key, vars = {}) => translate($locale, key, vars);

  function refreshFollowing() {
    if (did) {
      loadFollowing(did);
    }
  }

  async function loadFollowing(targetDid: string) {
    const requestId = ++loadRequestId;
    loading = true;
    status = '';
    follows = [];
    profiles = new Map();
    cursor = undefined;

    (async () => {
      try {
        const followsData = await listR4FollowsByDid(targetDid);
        if (requestId !== loadRequestId) return;

        follows = followsData.follows;
        cursor = followsData.cursor;

        // Fetch profiles for all followed DIDs
        if (follows.length > 0) {
          const dids = follows.map(f => f.subject).filter(Boolean);
          const profilesMap = await getProfiles(dids);
          if (requestId !== loadRequestId) return;
          profiles = profilesMap;
        }
      } catch (err) {
        if (requestId === loadRequestId) status = (err as Error)?.message || String(err);
      } finally {
        if (requestId === loadRequestId) loading = false;
      }
    })();
  }

  onMount(() => {
    if (did) {
      loadFollowing(did);
    }
  });

  $effect(() => {
    if (did) {
      loadFollowing(did);
    }
  });

  async function more() {
    if (!cursor || !did) return;
    const { follows: newFollows, cursor: c } = await listR4FollowsByDid(did, { cursor });
    follows = [...follows, ...newFollows];
    cursor = c;

    // Fetch profiles for new follows
    if (newFollows.length > 0) {
      const dids = newFollows.map(f => f.subject).filter(Boolean);
      const newProfiles = await getProfiles(dids);
      profiles = new Map([...profiles, ...newProfiles]);
    }
  }
</script>

{#if status}
  <StateCard
    icon={AlertCircle}
    title={t('following.errorTitle')}
    description={status}
    class="mb-6"
  >
    {#snippet actions()}
      <Button variant="outline" onclick={refreshFollowing}>
        {t('buttons.tryAgain')}
      </Button>
    {/snippet}
  </StateCard>
{/if}

{#if loading}
  <StateCard
    icon={Loader2}
    title={t('following.loadingTitle')}
    description={t('following.loadingDescription')}
  />
{:else if follows.length === 0 && !status}
  <StateCard
    icon={Users}
    title={t('following.emptyTitle')}
    description={t('following.emptyDescription')}
  />
{:else if follows.length > 0}
  <div class="space-y-4">
    {#each follows as follow (follow.uri)}
      {@const followProfile = profiles.get(follow.subject)}
      {@const profileHandle = followProfile?.handle || follow.subject}
      <ProfileHeader
        profile={followProfile}
        handle={profileHandle}
        size="sm"
      />
    {/each}
  </div>

  {#if cursor && follows.length >= 50}
    <div class="mt-6 text-center">
      <Button variant="outline" onclick={more}>
        {t('following.loadMore')}
      </Button>
    </div>
  {/if}
{/if}
