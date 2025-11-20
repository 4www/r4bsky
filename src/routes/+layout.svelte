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
  import { cn } from '$lib/utils';
  import { resolveHandle } from '$lib/services/r4-service';
  import NavTabs from '$lib/components/NavTabs.svelte';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';

  let { children } = $props();
  let ready = $state(false);
  let hasDesktopPlayer = $state(false);
  let playerVisible = $state(true);
  let mobilePanelOpen = $state(true);
  let playerState = $state({ playing: false, playlist: [] });
  // Legacy modal placeholders to avoid runtime errors from stale navigation state
  let viewModal = $state(null);
  let editModal = $state(null);

  async function initOAuth() {
    try {
      const metadataFile = 'client-metadata.json';
      const clientId = window.location.protocol === 'https:'
        ? new URL(metadataFile, window.location.origin + base + '/').href
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

  // Apply theme to document
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

    // Apply custom colors
    const colors = effectiveMode === 'dark' ? $theme.darkColors : $theme.lightColors;
    const [h, s, l] = colors.background.split(' ').map((v) => parseFloat(v.replace('%', '')));

    // Calculate derived colors
    const isDark = effectiveMode === 'dark';
    const mutedL = isDark ? Math.min(l + 3, 100) : Math.max(l - 5, 0);
    const cardL = isDark ? Math.min(l + 2, 100) : Math.max(l - 3, 0);
    const borderL = isDark ? Math.min(l + 10, 100) : Math.max(l - 15, 0);

    document.documentElement.style.setProperty('--background', colors.background);
    document.documentElement.style.setProperty('--foreground', colors.foreground);

    // Derived backgrounds with subtle variations
    document.documentElement.style.setProperty('--muted', `${h} ${s}% ${mutedL}%`);
    document.documentElement.style.setProperty('--card', `${h} ${s}% ${cardL}%`);
    document.documentElement.style.setProperty('--popover', `${h} ${s}% ${cardL}%`);

    // Border color
    document.documentElement.style.setProperty('--border', `${h} ${Math.max(s - 10, 0)}% ${borderL}%`);
    document.documentElement.style.setProperty('--input', `${h} ${Math.max(s - 10, 0)}% ${borderL}%`);

    // Apply foreground to all foreground-related variables
    document.documentElement.style.setProperty('--card-foreground', colors.foreground);
    document.documentElement.style.setProperty('--popover-foreground', colors.foreground);
    document.documentElement.style.setProperty('--muted-foreground', colors.foreground);
    document.documentElement.style.setProperty('--secondary-foreground', colors.foreground);

    // Apply accent to primary and accent variables
    document.documentElement.style.setProperty('--primary', colors.accent);
    document.documentElement.style.setProperty('--primary-foreground', colors.foreground);
    document.documentElement.style.setProperty('--accent', colors.accent);
    document.documentElement.style.setProperty('--accent-foreground', colors.foreground);
    document.documentElement.style.setProperty('--ring', colors.accent);
  }

  onMount(() => {
    initOAuth().catch(console.error);
    const unsubscribe = player.subscribe((state) => {
      hasDesktopPlayer = state.playlist?.length > 0 && state.index >= 0;
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
  const hasPlayback = $derived(playerState.playlist?.length > 0);
  const playbackCollapsed = $derived(!hasPlayback || !playerVisible);
</script>

{#if !ready}
  <div class="flex items-center justify-center min-h-screen p-4">
    <StateCard
      icon={Loader2}
      loading={true}
      title={t('app.loadingTitle')}
      description={t('app.loadingDescription')}
    />
  </div>
{:else}

  <div class="min-h-screen bg-background flex flex-col">
    <div class="flex-1 px-2 sm:px-3 lg:px-6 py-2">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
        {#if !playbackCollapsed}
          <section
            class="layout-playback order-1 w-full sticky top-0 z-10 lg:order-2 lg:w-auto lg:min-w-[24rem] lg:max-w-xl lg:h-screen"
            aria-label="layout-playback"
          >
            <div class="w-full bg-background/95 border border-border/60 rounded-2xl shadow-sm lg:h-screen">
              <Player
                visible={true}
                bind:mobilePanelOpen={mobilePanelOpen}
                class="w-full lg:h-full"
              />
            </div>
          </section>
        {/if}

        <section
          class={cn(
            "layout-panel relative z-20 flex-1 min-w-0 flex flex-col gap-4 order-2 lg:order-1 min-h-screen w-full",
            playbackCollapsed ? "lg:max-w-5xl lg:mx-auto" : ""
          )}
          aria-label="layout-panel"
        >
          <main class="flex-1 min-h-0">
            <div class="bg-background/95 rounded-2xl border border-border/60 shadow-sm">{@render children()}</div>
          </main>

          <nav class="mt-2 sticky bottom-0 left-0 right-0 z-40 border border-border/60 bg-background/95 backdrop-blur rounded-2xl px-2 sm:px-3 py-2">
            <div class="flex items-center justify-center gap-2 flex-wrap">
              <NavTabs items={navItems} variant="pills" />

              {#if playerState.playlist?.length > 0}
                <div class="inline-flex gap-1 p-1 rounded-full bg-background/95 backdrop-blur-xl border-2 border-primary/20">
                  <button
                    type="button"
                    onclick={toggle}
                    class={cn(
                      "flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      playerState.playing
                        ? "text-foreground border-2 border-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground border-2 border-transparent"
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
                        ? "text-foreground border-2 border-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground border-2 border-transparent"
                    )}
                    aria-label="Toggle player"
                  >
                    <LayoutList class="h-3.5 w-3.5" />
                  </button>
                </div>
              {/if}
            </div>
          </nav>
        </section>

        {#if !playbackCollapsed}
          <div class="hidden lg:block" aria-hidden="true"></div>
        {/if}

      </div>
    </div>
  </div>
{/if}
