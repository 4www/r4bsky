<script>
  import { onMount } from 'svelte'
  import { bskyOAuth } from '../libs/bsky-oauth.js'
  import { buildLoopbackClientId } from '@atproto/oauth-client-browser'
  import TrackCreate from './TrackCreate.svelte'
  import UserTracks from './UserTracks.svelte'
  import Router from './Router.svelte'

  let ready = false
  let handle = ''
  let userHandle = ''

  async function initOAuth() {
    const clientId = window.location.protocol === 'https:'
      ? new URL('client-metadata.json', window.location.href).href
      : buildLoopbackClientId(window.location)
    await bskyOAuth.init(clientId)
    // handleCallback not needed if client.init() already processed
    if (bskyOAuth.session?.handle) userHandle = bskyOAuth.session.handle
    // Lazy resolve human handle (avoid eager network on hydration)
    if (bskyOAuth.isAuthenticated()) {
      bskyOAuth.resolveHandle().then((h) => { if (h) userHandle = h })
      // Ensure we land on a known route after login
      const allowed = new Set(['/', '/my', '/author', '/timeline', '/search', '/followers', '/following', '/permissions'])
      const hashPath = (location.hash || '').replace(/^#/, '') || '/'
      if (!allowed.has(hashPath)) {
        location.hash = '#/'
      }
    }
    ready = true
  }

  onMount(() => {
    initOAuth()
  })

  async function signIn() {
    if (!handle) return
    await bskyOAuth.signIn(handle)
  }

  async function signOut() {
    await bskyOAuth.signOut()
    userHandle = ''
  }
</script>

{#if !ready}
  <div>Loading…</div>
{:else}
  {#if !bskyOAuth.isAuthenticated()}
    <section>
      <h2>Sign in with Bluesky</h2>
      <form on:submit|preventDefault={signIn}>
        <label>
          Handle
          <input type="text" bind:value={handle} placeholder="your-handle.bsky.social" required />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </section>
  {:else}
    <Router {userHandle} on:logout={signOut} />
  {/if}
{/if}
