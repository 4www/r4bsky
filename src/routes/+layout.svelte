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
    const stopNavigate = beforeNavigate((nav) => {
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
      stopNavigate();
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
    <aside class="hidden lg:flex lg:flex-col lg:w-64 border-r bg-background">
      <div class="px-6 py-6 text-2xl font-bold">{t('nav.brand')}</div>
      <nav class="flex-1 px-4 pb-6 space-y-1">
        {#each links as [href, title]}
          {#key href}
            {@const isActive = $page.url.pathname === href}
            <a
              {href}
              class={cn(
                "block rounded-md px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
            >
              {title}
            </a>
          {/key}
        {/each}
      </nav>
    </aside>
    <div class="flex-1 flex flex-col min-h-screen relative">
      <main class={cn("flex-1 pb-32 transition-[padding] px-4 sm:px-6", hasDesktopPlayer ? "lg:pr-[28rem]" : "")}>
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
    class="lg:hidden fixed top-4 left-4 z-50 inline-flex items-center justify-center rounded-full border bg-background/95 backdrop-blur px-3 py-2 shadow"
    type="button"
    onclick={toggleNav}
    aria-label={t('nav.toggle')}
  >
    <Menu class="h-5 w-5" />
  </button>
  {#if mobileNavOpen}
    <div class="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onclick={closeNav}></div>
    <div class="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background border-r shadow-xl flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 border-b">
        <span class="font-semibold">{t('nav.brand')}</span>
        <button class="p-2 rounded-md hover:bg-muted" onclick={closeNav} aria-label="Close menu">
          <X class="h-4 w-4" />
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {#each links as [href, title]}
          {#key href}
            {@const isActive = $page.url.pathname === href}
            <a
              {href}
              onclick={closeNav}
              class={cn(
                "block rounded-md px-3 py-2 text-sm font-medium hover:text-primary hover:bg-primary/5",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
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
