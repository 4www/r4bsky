<script>
  import { bskyOAuth } from '../../libs/bsky-oauth.js'
  import { session } from '../state/session.js'
  let working = false
  let handle = ''
  async function signOut() {
    try {
      working = true
      await bskyOAuth.signOut()
      session.refresh()
      location.hash = '#/'
    } catch (e) {
      console.error(e)
    } finally {
      working = false
    }
  }
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
  {#if $session?.did}
    <button disabled={working} on:click={signOut}>Logout</button>
  {/if}
  {#if !$session?.did}
    <h3>Sign in</h3>
    <form on:submit|preventDefault={async () => { if (handle) { await bskyOAuth.signIn(handle); session.refresh() } }}>
      <label>
        Handle
        <input type="text" bind:value={handle} placeholder="your-handle.bsky.social" />
      </label>
      <button type="submit">Sign in</button>
    </form>
  {/if}
</div>
