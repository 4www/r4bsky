<script lang="ts">
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { session } from '$lib/state/session';
  import { getProfile, listR4FavoritesByDid, getProfiles } from '$lib/services/r4-service';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import { Music4, Loader2, Users } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';

  let handle = $state('');
  let error = $state('');
  let signingIn = $state(false);
  let myProfile = $state(null);
  let follows = $state([]);
  let followProfiles = $state(new Map());
  let loadingHome = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function handleSignIn() {
    if (!handle.trim()) {
      error = t('home.errorRequired');
      return;
    }

    error = '';
    signingIn = true;

    try {
      await bskyOAuth.signIn(handle.trim());
    } catch (err) {
      error = t('home.errorMessage', { message: (err as Error)?.message || 'Unknown error' });
      signingIn = false;
    }
  }

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
</script>

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
        <div class="space-y-3 mb-4">
          {#each follows as follow (follow.uri)}
            {@const profile = followProfiles.get(follow.subject)}
            {@const profileHandle = profile?.handle || follow.subject}
            <ProfileHeader
              {profile}
              handle={profileHandle}
              size="sm"
            />
          {/each}
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

    <Card class="border-2 shadow-xl">
      <CardContent class="pt-6">
        <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }} class="space-y-6">
          <div class="space-y-2">
            <Label for="handle" class="text-base">{t('home.handleLabel')}</Label>
            <Input
              id="handle"
              type="text"
              placeholder={t('home.handlePlaceholder')}
              bind:value={handle}
              disabled={signingIn}
              class="h-12 text-base"
            />
          </div>

          {#if error}
            <div class="rounded-lg bg-destructive/15 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          {/if}

          <Button type="submit" class="w-full h-12 text-base" disabled={signingIn}>
            {signingIn ? t('home.submitting') : t('home.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
{/if}
