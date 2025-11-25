<script lang="ts">
  import { session } from '$lib/state/session';
  import { getProfile, listR4FavoritesByDid, getProfiles } from '$lib/services/r4-service';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import SignInForm from '$lib/components/SignInForm.svelte';
  import { Loader2 } from 'lucide-svelte';
  import { locale, translate } from '$lib/i18n';
  import SeoHead from '$lib/components/SeoHead.svelte';

  let myProfile = $state(null);
  let follows = $state([]);
  let followProfiles = $state(new Map());
  let loadingHome = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

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

<SeoHead title={t('home.title')} description={t('home.subtitle')} />

{#if isAuthenticated}
  <div class="page">
    {#if loadingHome}
      <div class="center">
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
        />
      {/if}

      {#if follows.length > 0}
        <div class="follows">
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
        <Card>
          <CardHeader>
            <CardTitle>No favorites yet</CardTitle>
            <CardDescription>
              Start adding Radio4000 favorites to see them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button href="/search">{t('home.exploreProfiles')}</Button>
          </CardContent>
        </Card>
      {/if}
    {/if}
  </div>
{:else}
  <div class="container">
    <header class="animate-in">
      <h1>{t('home.title')}</h1>
      <p>{t('home.subtitle')}</p>
    </header>
    <SignInForm variant="default" />
  </div>
{/if}

<style>
  .page {
    max-width: 56rem;
    margin-inline: auto;
    display: grid;
    gap: var(--size-fluid-2);
  }
  .container {
    display: grid;
    gap: var(--size-fluid-2);
    padding: var(--size-fluid-2);
  }
  .center {
    display: grid;
    place-items: center;
    min-height: 50vh;
  }
  .follows {
    display: grid;
    gap: var(--size-3);
  }
  header {
    text-align: center;
  }
  header p {
    color: var(--muted-foreground);
  }
</style>
