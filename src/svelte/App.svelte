<script>
  import { onMount } from 'svelte'
  import { bskyOAuth } from '../libs/bsky-oauth.js'
  import { buildLoopbackClientId } from '@atproto/oauth-client-browser'
  import Router from './Router.svelte'
  import { session } from './state/session.js'

  let ready = false
  let handle = ''

  async function initOAuth() {
    const clientId = window.location.protocol === 'https:'
      ? new URL('client-metadata.json', window.location.href).href
      : buildLoopbackClientId(window.location)
    await bskyOAuth.init(clientId)
    // Ensure OAuth callback is processed (in case client.init didn't hydrate)
    try { await bskyOAuth.handleCallback() } catch {}
    // handleCallback not needed if client.init() already processed
    // Lazy resolve human handle (avoid eager network on hydration)
    if (bskyOAuth.isAuthenticated()) {
      bskyOAuth.resolveHandle().then((_) => { session.refresh() })
      // Keep current route unless clearly invalid; allow dynamic /@ and /t paths
      const hashPath = (location.hash || '').replace(/^#/, '') || '/'
      const isAllowed = (
        hashPath === '/' ||
        hashPath === '/timeline' ||
        hashPath === '/add' ||
        hashPath === '/search' ||
        hashPath === '/followers' ||
        hashPath === '/following' ||
        hashPath === '/settings' ||
        hashPath.startsWith('/@') ||
        hashPath.startsWith('/t/')
      )
      if (!isAllowed) {
        const me = bskyOAuth.session?.handle || bskyOAuth.session?.did
        if (me) location.hash = `#/@${encodeURIComponent(me)}`
        else location.hash = '#/'
      }
    }
    session.refresh()
    ready = true
  }

  onMount(() => {
    initOAuth()
  })

  async function signIn() {
    if (!handle) return
    await bskyOAuth.signIn(handle)
    session.refresh()
  }

  async function signOut() {
    await bskyOAuth.signOut()
    session.refresh()
  }
</script>

{#if !ready}
  <div>Loading…</div>
{:else}
  {#if !$session?.did}
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
    <Router on:logout={signOut} />
  {/if}
{/if}
