<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { buildLoopbackClientId } from '@atproto/oauth-client-browser';
  import { session } from '$lib/state/session';
  import Player from '$lib/components/Player.svelte';
  import '../app.css';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Loader2, Menu, X, Home, Plus, User, Search, Settings, AtSign, Play, Pause, LayoutList } from 'lucide-svelte';
  import { player, toggle } from '$lib/player/store';
  import { locale, translate } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import { resolveHandle } from '$lib/services/r4-service';
  import Link from '$lib/components/Link.svelte';
  import { base } from '$app/paths';

  let { children } = $props();
  let ready = $state(false);
  let hasDesktopPlayer = $state(false);
  let playerVisible = $state(true);
  let mobilePanelOpen = $state(false);
  let playerState = $state({ playing: false, playlist: [] });
  // Legacy modal placeholders to avoid runtime errors from stale navigation state
  let viewModal = $state(null);
  let editModal = $state(null);

  async function initOAuth() {
    try {
      const metadataFile = window.location.hostname === '4000.radio'
        ? 'client-metadata.production.json'
        : 'client-metadata.json';
      const clientId = window.location.protocol === 'https:'
        ? new URL(metadataFile, window.location.origin + '/').href
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
      playerState = state;
    });

    return () => {
      unsubscribe();
    };
  });

  const userHandle = $derived(($session && $session.handle) || '');
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/');
  const addPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}/add` : '/');

  const links = $derived(
    ($session && $session.did)
      ? (userHandle
          ? [['/', t('nav.links.home'), Home], [myPath, userHandle, AtSign], [addPath, t('nav.links.add'), Plus], ['/settings', t('nav.links.settings'), Settings]]
          : [['/', t('nav.links.home'), Home], ['/settings', t('nav.links.settings'), Settings]]
        )
      : [['/', t('nav.links.home'), Home], ['/settings', t('nav.links.settings'), Settings]]
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
  <div class="min-h-screen bg-background flex flex-col">
    <div class="flex flex-col flex-1 lg:flex-row lg:items-start lg:gap-4 px-2 sm:px-3 lg:px-4">
      <Player
        visible={playerVisible}
        bind:mobilePanelOpen={mobilePanelOpen}
        class={cn(
          "order-1 w-full lg:order-2 lg:w-[26rem] lg:top-4",
          (!playerVisible && hasDesktopPlayer) ? "hidden lg:block" : "block"
        )}
      />
      <main class="relative order-2 lg:order-1 flex-1 pt-2 pb-3">
        <div class="relative z-30 bg-background rounded-2xl">{@render children()}</div>
      </main>
    </div>

    <nav class="sticky bottom-0 left-0 right-0 z-40 pb-1 px-2 sm:px-3">
      <div class="flex items-center justify-center gap-2">
        <!-- Navigation links -->
        <div class="inline-flex gap-1 p-1 rounded-full bg-background/95 backdrop-blur-xl border-2 border-primary/20">
          {#each links as [href, title, iconComponent]}
            {#key href}
              {@const Icon = iconComponent}
              {@const isActive = $page.url.pathname === (base + href) || $page.url.pathname === href}
              <Link
                href={href}
                class={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label={title}
              >
                <Icon class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">{title}</span>
              </Link>
            {/key}
          {/each}
        </div>

        <!-- Player mini controls -->
        {#if playerState.playlist?.length > 0}
          <div class="inline-flex gap-1 p-1 rounded-full bg-background/95 backdrop-blur-xl border-2 border-primary/20">
            <button
              type="button"
              onclick={toggle}
              class={cn(
                "flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
                playerState.playing
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={playerState.playing ? 'Pause' : 'Play'}
            >
              {#if playerState.playing}
                <Pause class="h-3.5 w-3.5" />
              {:else}
                <Play class="h-3.5 w-3.5" />
              {/if}
            </button>
            <button
              type="button"
              onclick={() => {
                if (window.innerWidth < 1024) {
                  mobilePanelOpen = !mobilePanelOpen;
                  playerVisible = mobilePanelOpen;
                } else {
                  playerVisible = !playerVisible;
                }
              }}
              class={cn(
                "flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
                (playerVisible || mobilePanelOpen)
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label="Toggle player"
            >
              <LayoutList class="h-3.5 w-3.5" />
            </button>
          </div>
        {/if}
      </div>
    </nav>
  </div>
{/if}
