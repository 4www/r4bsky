<script lang="ts">
  import { resolveHandle } from '$lib/services/r4-service';
  import { setContext } from 'svelte';
  import { useLiveQuery } from '@tanstack/svelte-db';
  import { profilesCollection, loadProfile, getProfileFromCache } from '$lib/stores/profiles-db';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import ProfileNav from '$lib/components/ProfileNav.svelte';
  import TrackEditDialogContent from '$lib/components/TrackEditDialogContent.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Loader2, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import SeoHead from '$lib/components/SeoHead.svelte';

  const { data, children } = $props();
  const handle = $derived(data?.handle ? data.handle.replace(/^@/, '') : '');
  const normalizedHandle = $derived(handle || '');
  const profileTitle = $derived(profile?.displayName || profile?.handle || (handle ? `@${handle}` : 'Profile'));
  const profileDescription = $derived(profile?.description || t('profile.viewFormDescription'));
  const profileImage = $derived(profile?.avatar || profile?.banner || '');
  const profileFavicon = $derived(profile?.avatar || '/favicon.png');

  // Check if we're on an edit route
  const isEditRoute = $derived($page.url.pathname.includes('/edit'));
  const editRkey = $derived.by(() => {
    if (!isEditRoute) return '';
    const parts = $page.url.pathname.split('/');
    const editIndex = parts.indexOf('edit');
    return editIndex > 0 ? parts[editIndex - 1] : '';
  });

  let did = $state('');
  let status = $state('');
  let loading = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  // Use reactive query to get profile from cache
  const profilesQuery = useLiveQuery(
    (q) => q.from({ profiles: profilesCollection }),
    []
  );

  // Get profile from query results, filtering by handle
  const profile = $derived.by(() => {
    if (!handle) return null;
    const profiles = profilesQuery.data || [];
    return profiles.find(p =>
      p.handle === handle ||
      p.handle === `@${handle}` ||
      p.did === did
    ) || null;
  });

  // Set context so child pages can access profile and did
  setContext('profile', {
    get profile() { return profile; },
    get did() { return did || ''; },
    get handle() { return normalizedHandle; }
  });

  function refreshProfile() {
    if (handle) {
      loadProfileData(handle);
    }
  }

  async function loadProfileData(currentHandle: string) {
    loading = true;
    status = '';
    did = '';

    try {
      // Resolve DID first
      const resolvedDid = await resolveHandle(currentHandle);
      did = resolvedDid;

      // Load profile into cache (will update reactive query automatically)
      await loadProfile(currentHandle);
    } catch (err) {
      status = (err as Error)?.message || String(err);
    } finally {
      loading = false;
    }
  }

  function closeEditDialog() {
    const userHandle = handle || $session?.handle || '';
    const fallback = userHandle ? `/@${encodeURIComponent(userHandle)}` : '/';
    goto(resolve(fallback), { replaceState: false, noScroll: true, keepFocus: true });
  }

  // Load profile when handle changes
  $effect(() => {
    if (handle) {
      // Check cache first for instant load
      const cached = getProfileFromCache(handle);
      if (cached) {
        did = cached.did;
      }
      // Always load fresh data (will update cache if changed)
      loadProfileData(handle);
    }
  });
</script>

<SeoHead
  title={profileTitle}
  description={profileDescription}
  image={profileImage}
  favicon={profileFavicon}
  type="profile"
/>

{#if !isEditRoute}
<div class="profile-layout">
  {#if handle}
    {#if loading}
      <div class="state-centered">
        <StateCard
          icon={Loader2}
          loading={true}
          title={t('profile.loadingTitle')}
          description={t('profile.loadingDescription')}
        />
      </div>
    {:else if status}
      <div class="state-centered">
        <StateCard
          icon={AlertCircle}
          title={t('profile.errorTitle')}
          description={status}
        >
          {#snippet actions()}
            <Button variant="outline" onclick={refreshProfile}>
              {t('buttons.tryAgain')}
            </Button>
          {/snippet}
        </StateCard>
      </div>
    {:else}
      <div class="profile-content">
        <header class="profile-sticky-header">
          <ProfileHeader {profile} {handle} size="lg" clickable={false}>
            {#snippet children()}
              <div class="profile-actions">
                {#if did && $session?.did !== did}
                  <FollowButton actorDid={did} />
                {/if}
              </div>
            {/snippet}
          </ProfileHeader>
        </header>

        <ProfileNav {handle} />

        {#if !isEditRoute}
          <div class="profile-main">
            {@render children()}
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.viewFormTitle')}</CardTitle>
        <CardDescription>{t('profile.viewFormDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="profile-form">
          <div class="field-group">
            <Label for="author-handle">{t('profile.formLabel')}</Label>
            <Input
              id="author-handle"
              name="handle"
              type="text"
              placeholder={t('profile.formPlaceholder')}
              required
            />
          </div>
          <Button type="submit" class="full-width">
            {t('profile.formSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  {/if}
</div>
{/if}

{#if isEditRoute && editRkey}
  <Dialog title={t('editTrack.title')} onClose={closeEditDialog}>
    <TrackEditDialogContent
      {handle}
      repo={did}
      rkey={editRkey}
      onsaved={closeEditDialog}
    />
  </Dialog>
{/if}

<style>
  .profile-layout {
    max-width: 56rem;
    margin-inline: auto;
    width: 100%;
  }

  .state-centered {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    gap: var(--size-fluid-2);
  }

  .profile-sticky-header {
    position: sticky;
    top: var(--size-2);
    z-index: 20;
    background: var(--background);
  }

  @media (min-width: 1024px) {
    .profile-sticky-header {
      top: var(--size-4);
    }
  }

  .profile-actions {
    display: flex;
    gap: var(--size-3);
    flex-wrap: wrap;
  }

  .profile-main {
    padding-top: var(--size-2);
  }

  .profile-form {
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  :global(.full-width) {
    width: 100%;
  }
</style>
