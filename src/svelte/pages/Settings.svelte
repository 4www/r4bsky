<script>
  import { bskyOAuth } from '../../libs/bsky-oauth.js'
  import { session } from '../state/session.js'
  import Button from '../ui/Button.svelte'
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
  <Button disabled={working} onclick={managePermissions}>Manage permissions</Button>
  {#if $session?.did}
    <Button disabled={working} onclick={signOut}>Logout</Button>
  {/if}
  {#if !$session?.did}
    <h3>Sign in</h3>
    <form onsubmit={async (e) => { e.preventDefault(); if (handle) { await bskyOAuth.signIn(handle); session.refresh() } }}>
      <fieldset>
        <legend><label for="signin-handle">Handle</label></legend>
        <input id="signin-handle" name="handle" type="text" bind:value={handle} placeholder="your-handle.bsky.social" />
      </fieldset>
      <fieldset>
        <Button type="submit">Sign in</Button>
      </fieldset>
    </form>
  {/if}
</div>
