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
  import { Loader2, Menu, X } from 'lucide-svelte';
  import { player } from '$lib/player/store';
  import { locale, translate } from '$lib/i18n';
  import { cn } from '$lib/utils';
  import TrackEditDialogContent from '$lib/components/TrackEditDialogContent.svelte';
  import { Dialog } from '$lib/components/ui/dialog/index';
  import { resolveHandle, getTrackByUri } from '$lib/services/r4-service';

  let { children } = $props();
  let ready = $state(false);
  let hasDesktopPlayer = $state(false);
  let editModal = $state({
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
    });

    // beforeNavigate returns a cleanup function that removes the navigation listener
    beforeNavigate((nav) => {
      if (!nav.to || nav.to.route?.id !== '/[handle]/[rkey]/edit' || !nav.to.state?.modal) return;
      nav.cancel();
      openEditModal({
        handle: nav.to.params?.handle,
        rkey: nav.to.params?.rkey,
        track: nav.to.state?.track,
      }).catch(console.error);
    });

    return () => {
      unsubscribe();
    };
  });

  const userHandle = $derived(($session && $session.handle) || '');
  const myPath = $derived(userHandle ? `/@${encodeURIComponent(userHandle)}` : '/');

  const links = $derived(
    ($session && $session.did)
      ? (userHandle
          ? [['/', t('nav.links.home')], ['/add', t('nav.links.add')], [myPath, `@${userHandle}`], ['/search', t('nav.links.search')], ['/following', t('nav.links.following')], ['/followers', t('nav.links.followers')], ['/settings', t('nav.links.settings')]]
          : [['/', t('nav.links.home')], ['/add', t('nav.links.add')], ['/search', t('nav.links.search')], ['/following', t('nav.links.following')], ['/followers', t('nav.links.followers')], ['/settings', t('nav.links.settings')]]
        )
      : [['/', t('nav.links.home')], ['/search', t('nav.links.search')], ['/settings', t('nav.links.settings')]]
  );
  let mobileNavOpen = $state(false);
  function toggleNav() { mobileNavOpen = !mobileNavOpen; }
  function closeNav() { mobileNavOpen = false; }
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
  <Player />
  <div class="flex min-h-screen bg-background">
    <aside class="hidden lg:flex lg:flex-col lg:w-72 border-r-2 border-primary/10 bg-gradient-to-b from-background to-muted/20">
      <div class="px-6 py-8">
        <h1 class="text-3xl font-bold text-gradient">{t('nav.brand')}</h1>
      </div>
      <nav class="flex-1 px-4 pb-6 space-y-2">
        {#each links as [href, title]}
          {#key href}
            {@const isActive = $page.url.pathname === href}
            <a
              {href}
              class={cn(
                "block rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                isActive
                  ? "text-primary bg-gradient-to-r from-primary/20 to-purple-500/20 shadow-sm border-l-4 border-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:pl-5"
              )}
            >
              {title}
            </a>
          {/key}
        {/each}
      </nav>
    </aside>
    <div class="flex-1 flex flex-col min-h-screen relative">
      <main class={cn("flex-1 pb-32 transition-[padding] px-4 sm:px-6 lg:px-8", hasDesktopPlayer ? "lg:pr-[28rem]" : "")}>
        {@render children()}
      </main>
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

  <button
    class="lg:hidden fixed top-4 left-4 z-50 inline-flex items-center justify-center rounded-xl border-2 border-primary/20 bg-background/95 backdrop-blur-xl px-4 py-3 shadow-lg transition-transform hover:scale-105"
    type="button"
    onclick={toggleNav}
    aria-label={t('nav.toggle')}
  >
    <Menu class="h-5 w-5 text-primary" />
  </button>
  {#if mobileNavOpen}
    <div class="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in" onclick={closeNav}></div>
    <div class="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-background to-muted/20 border-r-2 border-primary/20 shadow-2xl flex flex-col animate-in">
      <div class="flex items-center justify-between px-6 py-6 border-b-2 border-primary/10">
        <span class="text-xl font-bold text-gradient">{t('nav.brand')}</span>
        <button class="p-2 rounded-lg hover:bg-primary/10 transition-colors" onclick={closeNav} aria-label="Close menu">
          <X class="h-5 w-5 text-primary" />
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {#each links as [href, title]}
          {#key href}
            {@const isActive = $page.url.pathname === href}
            <a
              {href}
              onclick={closeNav}
              class={cn(
                "block rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                isActive
                  ? "text-primary bg-gradient-to-r from-primary/20 to-purple-500/20 shadow-sm border-l-4 border-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:pl-5"
              )}
            >
              {title}
            </a>
          {/key}
        {/each}
      </nav>
    </div>
  {/if}
{/if}
