<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { buildLoopbackClientId } from '@atproto/oauth-client-browser';
  import { session } from '$lib/state/session';
  import NavBar from '$lib/components/NavBar.svelte';
  import Player from '$lib/components/Player.svelte';
  import '../app.css';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Loader2 } from 'lucide-svelte';
  import { player } from '$lib/player/store';
  import { locale, translate } from '$lib/i18n';
  import { cn } from '$lib/utils';

  let { children } = $props();
  let ready = $state(false);
  let hasDesktopPlayer = $state(false);

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
    const unsubscribe = player.subscribe((state) => {
      hasDesktopPlayer = state.playlist?.length > 0 && state.index >= 0;
    });
    return () => unsubscribe();
  });

  const userHandle = $derived(($session && $session.handle) || '');
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/');
  const current = $derived($page.url.pathname);

  const links = $derived(
    ($session && $session.did)
      ? (userHandle
          ? [['/', t('nav.links.home')], ['/add', t('nav.links.add')], [myPath, `@${userHandle}`], ['/search', t('nav.links.search')], ['/following', t('nav.links.following')], ['/followers', t('nav.links.followers')], ['/settings', t('nav.links.settings')]]
          : [['/', t('nav.links.home')], ['/add', t('nav.links.add')], ['/search', t('nav.links.search')], ['/following', t('nav.links.following')], ['/followers', t('nav.links.followers')], ['/settings', t('nav.links.settings')]]
        )
      : [['/', t('nav.links.home')], ['/search', t('nav.links.search')], ['/settings', t('nav.links.settings')]]
  );
  const t = (key, vars = {}) => translate($locale, key, vars);
</script>

{#if !ready}
  <div class="flex items-center justify-center min-h-screen p-4">
    <StateCard
      icon={Loader2}
      title={t('app.loadingTitle')}
      description={t('app.loadingDescription')}
    />
  </div>
{:else}
  <div class="flex flex-col min-h-screen">
    <NavBar {links} {current} />
    <Player />
    <main class={cn("flex-1 pb-12 transition-[padding]", hasDesktopPlayer ? "lg:pr-[28rem]" : "")}>
      {@render children()}
    </main>
  </div>
{/if}
