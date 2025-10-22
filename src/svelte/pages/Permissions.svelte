<script>
  import { bskyOAuth } from '../../libs/bsky-oauth.js'
  let error = ''
  async function request() {
    error = ''
    try {
      await bskyOAuth.requestScopes()
    } catch (e) {
      error = e?.message || String(e)
    }
  }
</script>

<h2>Permissions</h2>
<p>Request permissions needed to save tracks and follow users.</p>
<button on:click={request}>Grant Permissions</button>
{#if error}<div>{error}</div>{/if}

