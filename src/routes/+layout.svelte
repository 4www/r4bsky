<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { bskyOAuth } from '$lib/services/bsky-oauth';
  import { buildLoopbackClientId } from '@atproto/oauth-client-browser';
  import { session } from '$lib/state/session';
  import { theme } from '$lib/state/theme';
  import { getR4Profile } from '$lib/services/r4-service';
  import Player from '$lib/components/Player.svelte';
  import '../app.css';
  import StateCard from '$lib/components/ui/state-card.svelte';
  import { Loader2, Menu, X, Home, Plus, User, Search, Settings, AtSign, Play, Pause, LayoutList } from 'lucide-svelte';
  import { player, toggle } from '$lib/player/store';
  import { locale, translate } from '$lib/i18n';
  import { clsx } from 'clsx';
  import { resolveHandle } from '$lib/services/r4-service';
  import NavTabs from '$lib/components/NavTabs.svelte';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';
  import ToastContainer from '$lib/components/ui/toast/ToastContainer.svelte';

  let { children } = $props();
  let ready = $state(false);
  let hasDesktopPlayer = $state(false);
  let playerVisible = $state(true);
  let mobilePanelOpen = $state(true);
  let playerState = $state({ playing: false, customPlaylist: [], context: null, index: -1, isShuffled: false });
  // Legacy modal placeholders to avoid runtime errors from stale navigation state
  let viewModal = $state(null);
  let editModal = $state(null);

  async function initOAuth() {
    try {
      const metadataFile = 'client-metadata.json';
      let clientId: string;
      let useFallback = false;

      // Determine which client ID to use
      if (window.location.protocol === 'https:') {
        // For HTTPS, first check if we can reach the metadata
        const metadataUrl = new URL(metadataFile, window.location.origin + base + '/').href;

        try {
          // Quick check if metadata is accessible
          const response = await fetch(metadataUrl, { method: 'HEAD', cache: 'no-cache' });
          if (response.ok) {
            clientId = metadataUrl;
          } else {
            console.warn(`Metadata not accessible (${response.status}), using loopback client`);
            useFallback = true;
          }
        } catch (error) {
          console.warn('Cannot reach metadata URL, using loopback client:', error);
          useFallback = true;
        }

        if (useFallback) {
          clientId = buildLoopbackClientId(window.location);
        }
      } else {
        // For HTTP (localhost), always use loopback client
        clientId = buildLoopbackClientId(window.location);
      }

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

  // Load theme settings from profile
  async function loadThemeFromProfile() {
    if (!$session?.did) {
      console.log('[loadThemeFromProfile] No session DID, skipping');
      return;
    }

    console.log('[loadThemeFromProfile] Loading profile for DID:', $session.did);

    try {
      const profile = await getR4Profile($session.did);
      console.log('[loadThemeFromProfile] Profile loaded:', profile);

      if (profile) {
        console.log('[loadThemeFromProfile] Applying theme from profile');
        theme.setMode(profile.mode);
        theme.setLightColors({
          background: profile.lightBackground,
          foreground: profile.lightForeground,
          accent: profile.lightAccent,
        });
        theme.setDarkColors({
          background: profile.darkBackground,
          foreground: profile.darkForeground,
          accent: profile.darkAccent,
        });
        console.log('[loadThemeFromProfile] Theme applied successfully');
      } else {
        console.log('[loadThemeFromProfile] No profile found, using defaults');
      }
    } catch (error) {
      console.error('[loadThemeFromProfile] Failed to load theme from profile:', error);
    }
  }

  // Apply theme to document using only background/foreground colors
  function applyTheme() {
    if (!browser) return;

    const effectiveMode = $theme.mode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : $theme.mode;

    // Apply dark class
    if (effectiveMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply custom colors (only background/foreground)
    const colors = effectiveMode === 'dark' ? $theme.darkColors : $theme.lightColors;

    const set = (name: string, value: string) => {
      document.documentElement.style.setProperty(name, value);
    };

    set('--background', colors.background);
    set('--foreground', colors.foreground);

    // Map all other tokens to either background or foreground
    set('--muted', colors.background);
    set('--card', colors.background);
    set('--popover', colors.background);
    set('--secondary', colors.background);
    set('--accent', colors.foreground);
    set('--primary', colors.foreground);
    set('--destructive', colors.foreground);
    set('--border', colors.foreground);
    set('--input', colors.foreground);
    set('--ring', colors.foreground);

    set('--card-foreground', colors.foreground);
    set('--popover-foreground', colors.foreground);
    set('--muted-foreground', colors.foreground);
    set('--secondary-foreground', colors.foreground);
    set('--accent-foreground', colors.background);
    set('--primary-foreground', colors.background);
    set('--destructive-foreground', colors.background);
  }

  onMount(() => {
    initOAuth().catch(console.error);
    const unsubscribe = player.subscribe((state) => {
      // Player is active if we have a context (profile/author/discogs) or custom playlist
      hasDesktopPlayer = (state.context !== null || state.customPlaylist?.length > 0) && state.index >= 0;
      playerState = state;
    });

    // Apply theme on mount
    applyTheme();

    // Watch for theme changes
    const themeUnsubscribe = theme.subscribe(() => {
      applyTheme();
    });

    // Watch for session changes to load profile (only way to load)
    const sessionUnsubscribe = session.subscribe((s) => {
      if (s?.did) {
        console.log('[session subscribe] Session updated, loading profile');
        loadThemeFromProfile();
      }
    });

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if ($theme.mode === 'auto') {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      unsubscribe();
      themeUnsubscribe();
      sessionUnsubscribe();
      mediaQuery.removeEventListener('change', handleChange);
    };
  });

  const t = (key, vars = {}) => translate($locale, key, vars);

  const userHandle = $derived(($session && $session.handle) || '');
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/');
  const addPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}/add` : '/');

  const navItems = $derived.by(() => {
    const currentPath = $page.url.pathname;
    const checkActive = (href: string) => currentPath === (base + href) || currentPath === href;

    const baseItems = [
      { href: '/', label: t('nav.links.home'), icon: Home, isActive: checkActive('/') }
    ];

    if ($session?.did && userHandle) {
      baseItems.push(
        { href: myPath, label: userHandle, icon: AtSign, isActive: checkActive(myPath) },
        { href: addPath, label: t('nav.links.add'), icon: Plus, isActive: checkActive(addPath) }
      );
    }

    baseItems.push(
      { href: '/search', label: t('nav.links.search'), icon: Search, isActive: currentPath.startsWith('/search') },
      { href: '/settings', label: t('nav.links.settings'), icon: Settings, isActive: currentPath.startsWith('/settings') }
    );

    return baseItems;
  });
  const hasPlayback = $derived(
    (playerState.customPlaylist?.length > 0 || playerState.context !== null) &&
    playerState.index >= 0
  );
  const playbackCollapsed = $derived(!hasPlayback || !playerVisible);
</script>

{#if !ready}
  <div class="loading-screen">
    <StateCard
      icon={Loader2}
      loading={true}
      title={t('app.loadingTitle')}
      description={t('app.loadingDescription')}
    />
  </div>
{:else}

  <div class="app-shell">
    <div class="app-container">
      <div class="layout-grid">
        {#if hasPlayback}
        <section
          class={clsx("layout-playback", playbackCollapsed && "hidden")}
          aria-label="layout-playback"
        >
          <div class="playback-inner">
            <Player
              visible={!playbackCollapsed}
              bind:mobilePanelOpen={mobilePanelOpen}
            />
          </div>
        </section>
        {/if}

        <section
          class={clsx("layout-panel", playbackCollapsed && "panel-centered")}
          aria-label="layout-panel"
        >
          <main class="main-content">
            {@render children()}
          </main>

          <nav class="bottom-nav card">
            <div class="nav-inner">
              <NavTabs items={navItems} variant="pills" />

              {#if hasPlayback}
                <div class="playback-controls">
                  <button
                    type="button"
                    onclick={toggle}
                    class={clsx("control-btn", playerState.playing && "active")}
                    aria-label={playerState.playing ? 'Pause' : 'Play'}
                  >
                    {#if playerState.playing}
                      <Pause class="icon" />
                    {:else}
                      <Play class="icon" />
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
                    class={clsx("control-btn", (playerVisible || mobilePanelOpen) && "active")}
                    aria-label="Toggle player visibility"
                  >
                    <LayoutList class="icon" />
                  </button>
               </div>
             {/if}
            </div>
          </nav>
        </section>

      </div>
    </div>
  </div>
{/if}

<ToastContainer />

<style>
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: var(--size-4);
  }

  .app-shell {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--background);
    display: flex;
    flex-direction: column;
  }

  .app-container {
    flex: 1;
    padding-inline: var(--size-1);
  }

  .layout-grid {
    display: flex;
    flex-direction: column;
    gap: var(--size-2);
  }

  @media (min-width: 1024px) {
    .layout-grid {
      flex-direction: row;
      align-items: flex-start;
      justify-content: center;
      gap: var(--size-4);
    }
  }

  .layout-playback {
    order: 1;
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 10;
    height: 100vh;
    height: 100dvh;
    transition: all 200ms var(--ease-2);
  }

  .layout-playback.hidden {
    display: none;
  }

  @media (min-width: 1024px) {
    .layout-playback {
      order: 2;
      max-width: 32rem;
    }
  }

  .playback-inner {
    height: 100%;
    border-radius: var(--radius-3);
    background: var(--background);
    padding: var(--size-2);
    box-shadow: var(--shadow-1);
  }

  @media (min-width: 1024px) {
    .playback-inner {
      padding: var(--size-3);
    }
  }

  .layout-panel {
    position: relative;
    z-index: 20;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
    order: 2;
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    background: var(--background);
    border-radius: var(--radius-3);
  }

  @media (min-width: 1024px) {
    .layout-panel {
      order: 1;
    }

    .layout-panel.panel-centered {
      max-width: 64rem;
      margin-inline: auto;
    }
  }

  .main-content {
    flex: 1;
    min-height: 0;
    border-radius: var(--radius-4);
  }

  .bottom-nav {
    margin-top: var(--size-2);
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 40;
    padding: var(--size-2);
    background: var(--background);
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    flex-wrap: wrap;
  }

  .playback-controls {
    display: inline-flex;
    gap: var(--size-1);
    border-radius: var(--radius-round);
    background: var(--background);
    border: var(--r4-border-size) solid var(--border);
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--size-2) var(--size-3);
    border-radius: var(--radius-round);
    font-size: var(--font-size-0);
    font-weight: var(--font-weight-5);
    transition: all 200ms var(--ease-2);
    color: var(--foreground);
    border: var(--r4-border-size) solid var(--foreground);
    background: transparent;
    cursor: pointer;
  }

  .control-btn:hover {
    background: var(--foreground);
    color: var(--background);
    border-color: var(--background);
  }

  .control-btn.active {
    color: var(--background);
    background: var(--foreground);
    border-color: var(--foreground);
    box-shadow: var(--shadow-1);
  }

  .control-btn.active:hover {
    border-color: var(--background);
  }

  .control-btn :global(.icon) {
    width: 0.875rem;
    height: 0.875rem;
  }
</style>
