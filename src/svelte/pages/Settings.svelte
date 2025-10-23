<script>
  import { bskyOAuth } from '../../libs/bsky-oauth.js'
  import { session } from '../state/session.js'
  let working = false
  async function managePermissions() {
    try {
      working = true
      await bskyOAuth.requestScopes()
    } catch (e) {
      // surfaced by redirect usually
      console.error(e)
    } finally {
      working = false
    }
  }
</script>

<h2>Settings</h2>
<div>
  <div>Logged in as: {$session?.handle || $session?.did}</div>
  <button disabled={working} on:click={managePermissions}>Manage permissions</button>
</div>
