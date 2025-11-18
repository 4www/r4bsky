<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { beforeNavigate } from '$app/navigation';
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
  import TrackEditDialogContent from '$lib/components/TrackEditDialogContent.svelte';
  import { Dialog } from '$lib/components/ui/dialog/index';
  import { resolveHandle, getTrackByUri } from '$lib/services/r4-service';
  import Link from '$lib/components/Link.svelte';
  import { base } from '$app/paths';

  let { children } = $props();
  let ready = $state(false);
  let hasDesktopPlayer = $state(false);
  let playerVisible = $state(true);
  let playerState = $state({ playing: false, playlist: [] });
  let editModal = $state({
    open: false,
    handle: '',
    repo: '',
    rkey: '',
    track: null,
    loading: false,
    error: '',
  });
  let viewModal = $state({
    open: false,
    handle: '',
    repo: '',
    rkey: '',
    track: null,
    loading: false,
    error: '',
  });

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

  function closeEditModal() {
    editModal = { open: false, handle: '', repo: '', rkey: '', track: null, loading: false, error: '' };
  }

  function closeViewModal() {
    viewModal = { open: false, handle: '', repo: '', rkey: '', track: null, loading: false, error: '' };
  }

  async function openViewModal(params: { handle?: string; rkey?: string; track?: any }) {
    const handleParam = params.handle || '';
    const rkeyParam = params.rkey || '';
    viewModal = { ...viewModal, open: true, loading: true, error: '', handle: handleParam, rkey: rkeyParam, track: null };
    let repo = '';
    try {
      const normalized = handleParam?.replace(/^@/, '') || '';
      if (normalized.startsWith('did:')) repo = normalized;
      else if (normalized) repo = (await resolveHandle(normalized)) || '';
    } catch (e) {
      viewModal = { ...viewModal, open: true, loading: false, error: (e as Error)?.message || 'Unable to resolve handle', repo: '' };
      return;
    }
    let track = params.track || null;
    if (!track && repo && rkeyParam) {
      try {
        track = await getTrackByUri(`at://${repo}/com.radio4000.track/${rkeyParam}`);
      } catch (e) {
        viewModal = { ...viewModal, open: true, loading: false, error: (e as Error)?.message || 'Unable to load track', repo };
        return;
      }
    }
    viewModal = { open: true, loading: false, error: '', handle: handleParam, repo, rkey: rkeyParam, track };
  }

  async function openEditModal(params: { handle?: string; rkey?: string; track?: any }) {
    const handleParam = params.handle || '';
    const rkeyParam = params.rkey || '';
    editModal = { ...editModal, open: true, loading: true, error: '', handle: handleParam, rkey: rkeyParam, track: null };
    let repo = '';
    try {
      const normalized = handleParam?.replace(/^@/, '') || '';
      if (normalized.startsWith('did:')) repo = normalized;
      else if (normalized) repo = (await resolveHandle(normalized)) || '';
    } catch (e) {
      editModal = { ...editModal, open: true, loading: false, error: (e as Error)?.message || 'Unable to resolve handle', repo: '' };
      return;
    }
    let track = params.track || null;
    if (!track && repo && rkeyParam) {
      try {
        track = await getTrackByUri(`at://${repo}/com.radio4000.track/${rkeyParam}`);
      } catch (e) {
        editModal = { ...editModal, open: true, loading: false, error: (e as Error)?.message || 'Unable to load track', repo };
        return;
      }
    }
    editModal = { open: true, loading: false, error: '', handle: handleParam, repo, rkey: rkeyParam, track };
  }

  onMount(() => {
    initOAuth().catch(console.error);
    const unsubscribe = player.subscribe((state) => {
      hasDesktopPlayer = state.playlist?.length > 0 && state.index >= 0;
      playerState = state;
    });

    // beforeNavigate returns a cleanup function that removes the navigation listener
    beforeNavigate((nav) => {
      // Handle edit modal
      if (nav.to?.route?.id === '/[handle]/[rkey]/edit' && nav.to.state?.modal) {
        nav.cancel();
        openEditModal({
          handle: nav.to.params?.handle,
          rkey: nav.to.params?.rkey,
          track: nav.to.state?.track,
        }).catch(console.error);
        return;
      }
      // Handle view modal
      if (nav.to?.route?.id === '/[handle]/[rkey]') {
        nav.cancel();
        openViewModal({
          handle: nav.to.params?.handle,
          rkey: nav.to.params?.rkey,
          track: nav.to.state?.track,
        }).catch(console.error);
        return;
      }
    });

    return () => {
      unsubscribe();
    };
  });

  const userHandle = $derived(($session && $session.handle) || '');
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/');

  const iconMap = {
    '/': Home,
    '/add': Plus,
    '/search': Search,
    '/settings': Settings,
  };

  const links = $derived(
    ($session && $session.did)
      ? (userHandle
          ? [['/', t('nav.links.home'), Home], ['/add', t('nav.links.add'), Plus], [myPath, userHandle, AtSign], ['/settings', t('nav.links.settings'), Settings]]
          : [['/', t('nav.links.home'), Home], ['/add', t('nav.links.add'), Plus], ['/settings', t('nav.links.settings'), Settings]]
        )
      : [['/', t('nav.links.home'), Home], ['/settings', t('nav.links.settings'), Settings]]
  );
  const t = (key, vars = {}) => translate($locale, key, vars);
</script>

{#if !ready}
  <div class="flex items-center justify-center min-h-screen p-6">
    <StateCard
      icon={Loader2}
      title={t('app.loadingTitle')}
      description={t('app.loadingDescription')}
    />
  </div>
{:else}
  <Player visible={playerVisible} />
  <div class="min-h-screen bg-background">
    <!-- Bottom navigation for all screen sizes -->
    <nav class="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4 px-4 pointer-events-none">
      <div class="pointer-events-auto inline-flex items-center justify-between gap-3 p-1.5 rounded-full bg-background/95 backdrop-blur-xl border-2 border-primary/20 shadow-2xl max-w-3xl w-full">
        <!-- Navigation links -->
        <div class="inline-flex gap-1.5">
          {#each links as [href, title, icon]}
            {#key href}
              {@const isActive = $page.url.pathname === (base + href) || $page.url.pathname === href}
              <Link
                href={href}
                class={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label={title}
              >
                <svelte:component this={icon} class="h-4 w-4" />
                <span class="hidden sm:inline">{title}</span>
              </Link>
            {/key}
          {/each}
        </div>

        <!-- Player mini controls -->
        {#if playerState.playlist?.length > 0}
          <div class="inline-flex gap-1.5 border-l-2 border-primary/20 pl-3">
            <button
              type="button"
              onclick={toggle}
              class={cn(
                "flex items-center justify-center px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                playerState.playing
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={playerState.playing ? 'Pause' : 'Play'}
            >
              {#if playerState.playing}
                <Pause class="h-4 w-4" />
              {:else}
                <Play class="h-4 w-4" />
              {/if}
            </button>
            <button
              type="button"
              onclick={() => { playerVisible = !playerVisible; }}
              class={cn(
                "flex items-center justify-center px-3 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                playerVisible
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label="Toggle player"
            >
              <LayoutList class="h-4 w-4" />
            </button>
          </div>
        {/if}
      </div>
    </nav>
    <div class="flex-1 flex flex-col min-h-screen relative">
      <main class={cn("flex-1 pb-20 transition-[padding] px-4 sm:px-6 lg:px-8", (hasDesktopPlayer && playerVisible) ? "lg:pr-[28rem]" : "")}>
        {@render children()}
      </main>
      {#if viewModal.open}
        <Dialog title={viewModal.track?.title || t('trackItem.untitled')} onClose={closeViewModal}>
          {#if viewModal.error}
            <div class="text-sm text-destructive">{viewModal.error}</div>
          {:else if viewModal.loading}
            <div class="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 class="h-4 w-4 animate-spin" />
              {t('profile.loadingDescription')}
            </div>
          {:else if viewModal.track}
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-semibold mb-2">{t('forms.trackUrl')}</h3>
                <a href={viewModal.track.url} target="_blank" rel="noopener" class="text-sm text-primary hover:underline break-all">
                  {viewModal.track.url}
                </a>
              </div>
              {#if viewModal.track.description}
                <div>
                  <h3 class="text-sm font-semibold mb-2">{t('forms.description')}</h3>
                  <p class="text-sm text-muted-foreground whitespace-pre-wrap">{viewModal.track.description}</p>
                </div>
              {/if}
              {#if viewModal.track.discogsUrl || viewModal.track.discogs_url}
                <div>
                  <h3 class="text-sm font-semibold mb-2">Discogs</h3>
                  <a href={viewModal.track.discogsUrl || viewModal.track.discogs_url} target="_blank" rel="noopener" class="text-sm text-primary hover:underline break-all">
                    {viewModal.track.discogsUrl || viewModal.track.discogs_url}
                  </a>
                </div>
              {/if}
              {#if viewModal.handle}
                <div>
                  <h3 class="text-sm font-semibold mb-2">Channel</h3>
                  <Link href={`/@${viewModal.handle}`} class="text-sm text-primary hover:underline">
                    @{viewModal.handle}
                  </Link>
                </div>
              {/if}
            </div>
          {/if}
        </Dialog>
      {/if}
      {#if editModal.open}
        <Dialog title={t('editTrack.title')} onClose={closeEditModal}>
          {#if editModal.error}
            <div class="text-sm text-destructive">{editModal.error}</div>
          {:else if editModal.loading}
            <div class="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 class="h-4 w-4 animate-spin" />
              {t('profile.loadingDescription')}
            </div>
          {:else}
            <TrackEditDialogContent
              handle={editModal.handle}
              repo={editModal.repo}
              rkey={editModal.rkey}
              track={editModal.track}
            />
          {/if}
        </Dialog>
      {/if}
    </div>
  </div>

{/if}
