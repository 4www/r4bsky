<script lang="ts">
  import { followActor, unfollowActor, findFollowUri } from '$lib/services/r4-service'
  import { Button } from '$lib/components/ui/button'
  import { locale, translate } from '$lib/i18n'
  const { actorDid = '' } = $props()
  let followUri = $state(null)
  let error = $state('')
  let pending = $state(false)
  const t = (key, vars = {}) => translate($locale, key, vars)

  async function refreshState() {
    if (!actorDid) { followUri = null; return }
    try {
      followUri = await findFollowUri(actorDid)
    } catch (e) {
      error = e?.message || String(e)
    }
  }

  $effect(() => { refreshState() })

  async function toggle() {
    error = ''
    pending = true
    try {
      if (followUri) {
        await unfollowActor(followUri)
        followUri = null
      } else {
        const res = await followActor(actorDid)
        followUri = res?.uri || null
      }
      await refreshState()
    } catch (e) {
      error = e?.message || String(e)
    } finally {
      pending = false
    }
  }
</script>

<Button onclick={toggle} disabled={pending} variant={followUri ? 'outline' : 'default'} size="sm">
  {followUri ? t('follow.unfollow') : t('follow.follow')}
</Button>
{#if error}<div class="mt-2 text-sm text-destructive">{t('follow.error', { message: error })}</div>{/if}
