<script lang="ts">
  import { resolveHandle, getProfile } from '$lib/services/r4-service';
  import { onMount, setContext } from 'svelte';
  import FollowButton from '$lib/components/FollowButton.svelte';
  import ProfileHeader from '$lib/components/ProfileHeader.svelte';
  import ProfileNav from '$lib/components/ProfileNav.svelte';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Loader2, AlertCircle } from 'lucide-svelte';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { locale, translate } from '$lib/i18n';

  const { data, children } = $props();
  const handle = $derived(data?.handle ? data.handle.replace(/^@/, '') : '');

  let did = $state('');
  let profile = $state(null);

  // Set context so child pages can access profile and did
  setContext('profile', {
    get profile() { return profile; },
    get did() { return did; }
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

  onMount(() => {
    if (handle) {
      loadProfile(handle);
    }
  });
</script>

<div class="container max-w-4xl py-8 lg:py-12">
  {#if handle}
    {#if loading}
      <StateCard
        icon={Loader2}
        title={t('profile.loadingTitle')}
        description={t('profile.loadingDescription')}
      />
    {:else if status}
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
    {:else}
      <ProfileHeader {profile} {handle} size="lg" class="mb-8" clickable={false}>
        {#snippet children()}
          <div class="flex gap-3 flex-wrap">
            {#if did && $session?.did !== did}
              <FollowButton actorDid={did} />
            {/if}
          </div>
        {/snippet}
      </ProfileHeader>

      <ProfileNav {handle} />

      {@render children()}
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
