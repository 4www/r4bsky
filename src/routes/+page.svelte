<script lang="ts">
  import { session } from '$lib/state/session';
  import { getProfile, listR4FavoritesByDid, getProfiles } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import SignInForm from '$lib/components/SignInForm.svelte';
  import { Loader2, Users } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import SeoHead from '$lib/components/SeoHead.svelte';

  let myProfile = $state(null);
  let follows = $state([]);
  let followProfiles = $state(new Map());
  let loadingHome = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);
  let listHeight = $state(560);
  let listContainer = $state<HTMLElement | null>(null);

  const virtualizerStore = createVirtualizer({
    count: 0,
    getScrollElement: () => listContainer,
    estimateSize: () => 120,
    overscan: 4,
    getItemKey: (index) => follows[index]?.uri || follows[index]?.subject || index,
  });

  // Update virtualizer when follows change
  $effect(() => {
    $virtualizerStore.setOptions({
      count: follows.length,
    });
  });

  async function loadHomeData() {
    if (!$session?.did || !$session?.handle) return;
    loadingHome = true;
    try {
      const [profile, favoritesData] = await Promise.all([
        getProfile($session.handle),
        listR4FavoritesByDid($session.did, { limit: 10 })
      ]);
      myProfile = profile;
      const uniqueFollows = new Map();
      for (const follow of favoritesData.favorites || []) {
        const key = follow?.subject || follow?.uri;
        if (key && !uniqueFollows.has(key)) {
          uniqueFollows.set(key, follow);
        }
      }
      follows = Array.from(uniqueFollows.values());

      if (follows.length > 0) {
        const dids = follows.map(f => f.subject).filter(Boolean);
        followProfiles = await getProfiles(dids);
      }
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      loadingHome = false;
    }
  }

  const isAuthenticated = $derived($session && $session.did);

  $effect(() => {
    if (isAuthenticated) {
      loadHomeData();
    }
  });

  onMount(() => {
    if (!browser) return;
    const calcHeight = () => {
      listHeight = Math.max(320, Math.floor(window.innerHeight - 260));
    };
    calcHeight();
    window.addEventListener('resize', calcHeight);
    return () => window.removeEventListener('resize', calcHeight);
  });
</script>

<SeoHead title={t('home.title')} description={t('home.subtitle')} />

{#if isAuthenticated}
  <div class="container max-w-4xl py-4 space-y-6">
    {#if loadingHome}
      <div class="flex items-center justify-center min-h-[50vh]">
        <StateCard
          icon={Loader2}
          loading={true}
          title="Loading your profile"
          description="Fetching your profile and favorites."
        />
      </div>
    {:else}
      {#if myProfile && $session?.handle}
        <ProfileHeader
          profile={myProfile}
          handle={$session.handle}
          size="lg"
          class="mb-6"
        />
      {/if}

      {#if follows.length > 0}
        <div class="mb-4 overflow-auto" role="region" aria-label="Your favorite profiles" bind:this={listContainer} style="height: {listHeight}px;">
          <div style="height: {$virtualizerStore.getTotalSize()}px; width: 100%; position: relative;">
            {#each $virtualizerStore.getVirtualItems() as virtualItem (virtualItem.key)}
              {@const index = virtualItem.index}
              {@const style = `position: absolute; top: 0; left: 0; width: 100%; height: ${virtualItem.size}px; transform: translateY(${virtualItem.start}px);`}
              <div class="px-0.5" {style}>
                {#if follows[index]}
                  {@const profile = followProfiles.get(follows[index]?.subject)}
                  <ProfileHeader
                    profile={profile}
                    handle={profile?.handle || follows[index]?.subject}
                    size="sm"
                    class="my-2"
                  />
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <Card class="border-2">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Users class="h-5 w-5" />
              No favorites yet
            </CardTitle>
            <CardDescription>
              Start adding Radio4000 favorites to see them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button href="/search" class="w-full">
              {t('home.exploreProfiles')}
            </Button>
          </CardContent>
        </Card>
      {/if}
    {/if}
  </div>
{:else}
  <div class="container mx-auto max-w-2xl mt-10 px-3 space-y-8">
    <div class="mb-8 text-center space-y-3 animate-in">
      <h1 class="text-4xl font-bold text-gradient">{t('home.title')}</h1>
      <p class="text-lg text-muted-foreground">{t('home.subtitle')}</p>
    </div>

    <SignInForm variant="default" />
  </div>
{/if}
