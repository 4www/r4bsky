<script>
  import { followActor, unfollowActor, findFollowUri } from '../../libs/r4-service.js'
  export let actorDid = ''
  let followUri = null
  let error = ''

  $: (async () => {
    if (!actorDid) return
    try {
      followUri = await findFollowUri(actorDid)
    } catch (e) {
      error = e?.message || String(e)
    }
  })()

  async function toggle() {
    error = ''
    try {
      if (followUri) {
        await unfollowActor(followUri)
        followUri = null
      } else {
        const res = await followActor(actorDid)
        followUri = res?.uri || null
      }
    } catch (e) {
      error = e?.message || String(e)
    }
  }
</script>

<button on:click={toggle}>{followUri ? 'Unfollow' : 'Follow'}</button>
{#if error}<div>{error}</div>{/if}

