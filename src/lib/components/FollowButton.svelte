<script lang="ts">
  import {
    followActor,
    unfollowActor,
    findFollowUri,
    createR4Favorite,
    deleteR4Favorite,
  } from '$lib/services/r4-service';
  import { session } from '$lib/state/session';
  import { Button } from '$lib/components/ui/button';
  import { locale, translate } from '$lib/i18n';
  const { actorDid = '' } = $props();
  let followUri = $state(null);
  let error = $state('');
  let pending = $state(false);
  const t = (key, vars = {}) => translate($locale, key, vars);

  async function refreshState() {
    if (!actorDid || !$session?.did) { followUri = null; return; }
    try {
      followUri = await findFollowUri(actorDid);
    } catch (e) {
      error = e?.message || String(e);
    }
  }

  $effect(() => { refreshState(); });

  async function toggle() {
    if (!$session?.did) {
      error = t('follow.error', { message: 'Not authenticated' });
      return;
    }
    error = '';
    pending = true;
    try {
      if (followUri) {
        await unfollowActor(followUri);
        await deleteR4Favorite(actorDid);
        followUri = null;
      } else {
        const res = await followActor(actorDid);
        followUri = res?.uri || null;
        await createR4Favorite(actorDid);
      }
      await refreshState();
    } catch (e) {
      error = e?.message || String(e);
    } finally {
      pending = false;
    }
  }
</script>

{#if $session?.did}
  <Button onclick={toggle} disabled={pending} variant={followUri ? 'outline' : 'default'} size="sm">
    {followUri ? t('follow.unfollow') : t('follow.follow')}
  </Button>
{:else}
  <Button variant="outline" size="sm" disabled>
    {t('follow.follow')}
  </Button>
{/if}
{#if error}<div class="mt-2 text-sm text-destructive">{t('follow.error', { message: error })}</div>{/if}
