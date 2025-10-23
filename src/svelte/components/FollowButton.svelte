<script>
  import { followActor, unfollowActor, findFollowUri } from '../../libs/r4-service.js'
  const { actorDid = '' } = $props()
  let followUri = $state(null)
  let error = $state('')
  let pending = $state(false)

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

<button onclick={toggle} disabled={pending}>{followUri ? 'Unfollow' : 'Follow'}</button>
{#if error}<div>{error}</div>{/if}
