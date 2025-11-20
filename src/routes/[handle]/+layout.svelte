<script lang="ts">
  import { resolveHandle, getProfile } from '$lib/services/r4-service';
  import { setContext } from 'svelte';
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

  const { data, children } = $props();
  const handle = $derived(data?.handle ? data.handle.replace(/^@/, '') : '');
  const normalizedHandle = $derived(handle || '');

  // Check if we're on an edit route
  const isEditRoute = $derived($page.url.pathname.includes('/edit'));
  const editRkey = $derived.by(() => {
    if (!isEditRoute) return '';
    const parts = $page.url.pathname.split('/');
    const editIndex = parts.indexOf('edit');
    return editIndex > 0 ? parts[editIndex - 1] : '';
  });

  let did = $state('');
  let profile = $state(null);

  // Set context so child pages can access profile and did
  setContext('profile', {
    get profile() { return profile; },
    get did() { return did || ''; },
    get handle() { return normalizedHandle; }
  });

  let status = $state('');
  let loading = $state(false);
  let loadRequestId = 0;
  const t = (key, vars = {}) => translate($locale, key, vars);

  function refreshProfile() {
    if (handle) {
      loadProfile(handle);
    }
  }

  async function loadProfile(currentHandle: string) {
    const requestId = ++loadRequestId;
    loading = true;
    status = '';
    did = '';
    profile = null;

    (async () => {
      try {
        const resolvedDid = await resolveHandle(currentHandle);
        if (requestId !== loadRequestId) return;
        did = resolvedDid;

        const profileData = await getProfile(currentHandle);
        if (requestId !== loadRequestId) return;
        profile = profileData;
      } catch (err) {
        if (requestId === loadRequestId) status = (err as Error)?.message || String(err);
      } finally {
        if (requestId === loadRequestId) loading = false;
      }
    })();
  }

  function closeEditDialog() {
    const userHandle = handle || $session?.handle || '';
    const fallback = userHandle ? `/@${encodeURIComponent(userHandle)}` : '/';
    goto(resolve(fallback), { replaceState: false, noScroll: true, keepFocus: true });
  }

  $effect(() => {
    if (handle) {
      loadProfile(handle);
    }
  });
</script>

{#if !isEditRoute}
<div class="max-w-4xl mx-auto w-full">
  {#if handle}
    {#if loading}
      <div class="flex items-center justify-center min-h-[50vh]">
        <StateCard
          icon={Loader2}
          loading={true}
          title={t('profile.loadingTitle')}
          description={t('profile.loadingDescription')}
        />
      </div>
    {:else if status}
      <div class="flex items-center justify-center min-h-[50vh]">
        <StateCard
          icon={AlertCircle}
          title={t('profile.errorTitle')}
          description={status}
          class="mb-6"
        >
          {#snippet actions()}
            <Button variant="outline" onclick={refreshProfile}>
              {t('buttons.tryAgain')}
            </Button>
          {/snippet}
        </StateCard>
      </div>
    {:else}
      <div class="space-y-6">
        <div class="sticky top-2 lg:top-4 z-20">
          <div class="rounded-2xl border border-border/40 bg-background/90 backdrop-blur p-4 lg:p-6">
            <ProfileHeader {profile} {handle} size="lg" class="m-0" clickable={false}>
              {#snippet children()}
                <div class="flex gap-3 flex-wrap">
                  {#if did && $session?.did !== did}
                    <FollowButton actorDid={did} />
                  {/if}
                </div>
              {/snippet}
            </ProfileHeader>
          </div>
        </div>

        <ProfileNav {handle} />

        {#if !isEditRoute}
          <div class="pt-2">
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
