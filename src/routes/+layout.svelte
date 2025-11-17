<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { buildLoopbackClientId } from '@atproto/oauth-client-browser';
  import { session } from '$lib/state/session';
  import NavBar from '$lib/components/NavBar.svelte';
  import Player from '$lib/components/Player.svelte';
  import '../app.css';

  let { children } = $props();
  let ready = $state(false);

  async function initOAuth() {
    try {
      const clientId = window.location.protocol === 'https:'
        ? new URL('client-metadata.json', window.location.href).href
        : buildLoopbackClientId(window.location);

      await bskyOAuth.init(clientId);

      // Ensure OAuth callback is processed
      try { await bskyOAuth.handleCallback(); } catch (e) { console.error('OAuth callback error:', e); }

      // Try restoring existing session
      try {
        if (!bskyOAuth.session?.did) {
          const did = bskyOAuth.getStoredDid && bskyOAuth.getStoredDid();
          if (did) {
            await bskyOAuth.restoreSession(did);
          }
        }
      } catch (e) { console.error('Session restore error:', e); }

      // Lazy resolve human handle
      if (bskyOAuth.isAuthenticated()) {
        bskyOAuth.resolveHandle().then((_) => { session.refresh(); });
      }

      session.refresh();
    } catch (error) {
      console.error('OAuth initialization error:', error);
    } finally {
      ready = true;
    }
  }

  onMount(() => {
    initOAuth().catch(console.error);
  });

  const userHandle = $derived(($session && $session.handle) || '');
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/');
  const current = $derived($page.url.pathname);

  const links = $derived(
    ($session && $session.did)
      ? (userHandle
          ? [['/', 'Home'], ['/add', 'Add'], [myPath, `@${userHandle}`], ['/search', 'Search'], ['/following', 'Following'], ['/followers', 'Followers'], ['/settings', 'Settings']]
          : [['/', 'Home'], ['/add', 'Add'], ['/search', 'Search'], ['/following', 'Following'], ['/followers', 'Followers'], ['/settings', 'Settings']]
        )
      : [['/', 'Home'], ['/search', 'Search'], ['/settings', 'Settings']]
  );
</script>

{#if !ready}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
      <p class="mt-2 text-muted-foreground">Loading...</p>
    </div>
  </div>
{:else}
  <div class="flex flex-col min-h-screen">
    <NavBar {links} {current} />
    <main class="flex-1 pb-32">
      {@render children()}
    </main>
    <Player />
  </div>
{/if}
