<script>
  import { bskyOAuth } from '../../libs/bsky-oauth.js'
  import { session } from '../state/session.js'
  let working = false
  let clientIdInput = ''
  $: currentClientId = (() => {
    try { return localStorage.getItem('bsky-client-id') || '' } catch { return '' }
  })()
  $: clientIdInput = currentClientId
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

  function saveClientId(e) {
    e.preventDefault()
    try {
      if (clientIdInput) localStorage.setItem('bsky-client-id', clientIdInput)
      else localStorage.removeItem('bsky-client-id')
      alert('Saved. Please reload and sign in again to apply.')
    } catch (e) {
      console.error(e)
    }
  }
</script>

<h2>Settings</h2>
<div>
  <div>Logged in as: {$session?.handle || $session?.did}</div>
  <button disabled={working} on:click={managePermissions}>Manage permissions</button>
  <h3>Client metadata (advanced)</h3>
  <form on:submit={saveClientId}>
    <label>
      Client metadata URL
      <input type="url" bind:value={clientIdInput} placeholder="https://your.domain/client-metadata.json" />
    </label>
    <button type="submit">Save</button>
    <div><small>Use this to force HTTPS client metadata in dev for proper repo scopes.</small></div>
  </form>
</div>
