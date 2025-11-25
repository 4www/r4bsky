<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { parseTrackUrl } from '$lib/services/url-patterns';
  import { deleteTrackByUri } from '$lib/services/r4-service';
  import { setPlaylist, player } from '$lib/player/store';
  import { session } from '$lib/state/session';
  import { buildEditHash, buildViewHash } from '$lib/services/track-uri';
  import { Button } from '$lib/components/ui/button';
  import { Play, MoreVertical, Pencil, Trash2, ExternalLink, Disc as DiscIcon, Eye } from 'lucide-svelte';
  import { clsx } from 'clsx';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { locale, translate } from '$lib/i18n';
  import Link from '$lib/components/Link.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';

  const {
    item,
    index = 0,
    items = [],
    context = null,
    editable = false,
    expandedContent,
    isDetailView = false,
    flat = false,
    onSelectTrack,
    onEditTrack,
    onremove,
    showAuthor = true
  } = $props();

  let message = $state('');
  let showDeleteConfirm = $state(false);
  let deleting = $state(false);
  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let triggerRef = $state<HTMLElement | null>(null);

  const t = (key, vars = {}) => translate($locale, key, vars);

  let playerState = $state(player.get());
  const unsubscribe = player.subscribe((value) => {
    playerState = value;
  });
  onDestroy(() => unsubscribe?.());

  const isActiveTrack = $derived.by(() => playerState?.playlist?.[playerState.index]?.uri === item?.uri);

  const safeOpenUrl = $derived.by(() => {
    try {
      const m = parseTrackUrl(item?.url || '');
      return (m && m.url) || item?.url || '#';
    } catch {
      return '#';
    }
  });

  const authorHandle = $derived.by(() => {
    const raw = context?.handle || item.authorHandle || item.author_handle || null;
    return raw?.replace?.(/^@/, '') ?? raw;
  });

  const discogsLink = $derived(item?.discogs_url ?? '');

  function play() {
    setPlaylist(items && items.length ? items : [item], items && items.length ? index : 0, context);
  }

  function editHref() {
    const handle = $session?.handle;
    return buildEditHash(handle, item.uri);
  }

  function viewHref() {
    return buildViewHash(authorHandle, item.uri);
  }

  function openEdit() {
    if (onEditTrack) {
      onEditTrack(item.uri);
      return;
    }
    const href = editHref();
    if (href) {
      goto(resolve(href), {
        state: {
          track: {
            uri: item.uri,
            url: item.url,
            title: item.title,
            description: item.description,
            discogs_url: item.discogs_url || '',
          },
          returnTo: window.location.pathname
        },
        replaceState: false,
        noScroll: true,
        keepFocus: false,
      });
    }
  }

  function openDetail(event?: Event, opts?: { forceNavigate?: boolean }) {
    event?.preventDefault?.();
    if (onSelectTrack && !opts?.forceNavigate) {
      onSelectTrack(item.uri);
      return;
    }
    const href = viewHref();
    if (href) {
      goto(resolve(href), {
        state: {
          returnTo: window.location.pathname,
          tracks: items ? JSON.parse(JSON.stringify(items)) : [],
          track: item ? JSON.parse(JSON.stringify(item)) : null,
          index,
          did: context?.key || item.authorDid || '',
          handle: authorHandle || (context?.handle?.replace?.(/^@/, '') ?? '')
        },
        replaceState: false,
        noScroll: true,
        keepFocus: false,
      });
    }
  }

  function toggleMenu() { menuOpen = !menuOpen; }
  function closeMenu() { menuOpen = false; }

  function confirmDelete() { showDeleteConfirm = true; }
  function cancelDelete() { showDeleteConfirm = false; }

  async function remove() {
    message = '';
    deleting = true;
    showDeleteConfirm = false;
    try {
      await deleteTrackByUri(item.uri);
      if (onremove) onremove({ detail: { uri: item.uri } });
    } catch (e) {
      message = e?.message || String(e);
      deleting = false;
      console.error('Failed to delete track:', e);
    }
  }

  onMount(() => {
    function handleClick(event: MouseEvent) {
      if (!menuOpen) return;
      const target = event.target as Node;
      if (menuRef?.contains(target) || triggerRef?.contains(target)) return;
      menuOpen = false;
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') menuOpen = false;
    }
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  });
</script>

<article class={clsx("track", deleting && "track--deleting", isDetailView && !flat && "track--detail")}>
  <div class="track-row">
    <Button
      variant="secondary"
      size="sm"
      class={clsx("track-play", isActiveTrack && "track-play--active")}
      disabled={isActiveTrack}
      onclick={play}
    >
      <Play class="icon" />
    </Button>

    <div class="track-info">
      <a
        href={viewHref() || '#'}
        onclick={openDetail}
        class={clsx("track-title", isActiveTrack && "track-title--active")}
      >
        {item.title || t('trackItem.untitled')}
      </a>
      {#if showAuthor && authorHandle}
        <Link href={`/@${encodeURIComponent(authorHandle)}`} class="track-author">
          @{authorHandle}
        </Link>
      {/if}
      {#if item.description}
        <p class="track-description">{item.description}</p>
      {/if}
    </div>

    <div class="track-actions">
      {#if discogsLink}
        <a
          href={discogsLink?.startsWith('http') ? discogsLink : resolve(discogsLink)}
          target="_blank"
          rel="noopener"
          class="icon-btn"
          aria-label="Open Discogs"
        >
          <DiscIcon class="icon" />
        </a>
      {/if}
      <a
        href={safeOpenUrl && safeOpenUrl !== '#' ? (safeOpenUrl.startsWith('http') ? safeOpenUrl : resolve(safeOpenUrl)) : '#'}
        target="_blank"
        rel="noopener"
        class="icon-btn"
        aria-label={t('trackItem.openExternal')}
      >
        <ExternalLink class="icon" />
      </a>

      <div class="menu-wrapper">
        <button
          bind:this={triggerRef}
          type="button"
          class={clsx("icon-btn", menuOpen && "icon-btn--active")}
          onclick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical class="icon" />
          <span class="sr-only">{t('trackItem.actions')}</span>
        </button>

        {#if menuOpen}
          <div bind:this={menuRef} class="menu" role="menu">
            {#if viewHref()}
              <button type="button" class="menu-item" onclick={(e) => { e.preventDefault(); e.stopPropagation(); closeMenu(); openDetail(e, { forceNavigate: true }); }}>
                <Eye class="icon" /> View track
              </button>
            {/if}
            {#if editable && editHref()}
              <button type="button" class="menu-item" onclick={(e) => { e.preventDefault(); closeMenu(); openEdit(); }}>
                <Pencil class="icon" /> {t('trackItem.edit')}
              </button>
            {/if}
            <a
              href={safeOpenUrl && safeOpenUrl !== '#' ? (safeOpenUrl.startsWith('http') ? safeOpenUrl : resolve(safeOpenUrl)) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              class="menu-item"
              onclick={closeMenu}
            >
              <ExternalLink class="icon" /> {t('trackItem.openMediaUrl')}
            </a>
            {#if discogsLink}
              <a
                href={discogsLink?.startsWith('http') ? discogsLink : resolve(discogsLink)}
                target="_blank"
                rel="noopener noreferrer"
                class="menu-item"
                onclick={closeMenu}
              >
                <DiscIcon class="icon" /> Open Discogs
              </a>
            {/if}
            {#if editable}
              <button type="button" class="menu-item" onclick={() => { closeMenu(); confirmDelete(); }}>
                <Trash2 class="icon" /> {t('trackItem.delete')}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if message}
    <div class="track-error">{message}</div>
  {/if}

  {#if expandedContent}
    <div class="track-expanded">{@render expandedContent()}</div>
  {/if}
</article>

{#if showDeleteConfirm}
  <Dialog title="Delete track" onClose={cancelDelete}>
    <div class="dialog-content">
      <p>Are you sure you want to delete "{item.title || t('trackItem.untitled')}"? This action cannot be undone.</p>
      <div class="dialog-actions">
        <Button variant="outline" onclick={cancelDelete}>Cancel</Button>
        <Button variant="destructive" onclick={remove}>Delete</Button>
      </div>
    </div>
  </Dialog>
{/if}

<style>
  .track {
    padding: var(--size-2) var(--size-3);
    background: var(--background);
    transition: background 150ms var(--ease-2);
  }

  .track--deleting {
    opacity: 0.5;
    pointer-events: none;
  }

  .track--detail {
    padding: var(--size-3);
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  .track-info {
    flex: 1;
    min-width: 0;
  }

  .track-title {
    display: block;
    font-weight: var(--font-weight-6);
    color: var(--foreground);
    text-decoration: none;
    transition: color 150ms var(--ease-2);

    &:hover {
      color: var(--primary);
      text-decoration: underline;
    }
  }

  .track-title--active {
    background: var(--primary);
    color: var(--background);
    padding: 0 var(--size-1);
    border-radius: var(--radius-1);
  }

  :global(.track-author) {
    color: var(--muted-foreground);

    &:hover {
      color: var(--primary);
    }
  }

  .track-description {
    color: var(--muted-foreground);
    white-space: pre-wrap;
    line-height: var(--font-lineheight-2);
    margin: 0;
  }

  .track-actions {
    display: flex;
    align-items: center;
    gap: var(--size-1);
    flex-shrink: 0;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--size-6);
    height: var(--size-6);
    border-radius: var(--radius-2);
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 150ms var(--ease-2);

    &:hover {
      background: var(--muted);
      border-color: var(--border);
      color: var(--foreground);
    }
  }

  .icon-btn--active {
    background: var(--muted);
    border-color: var(--border);
    color: var(--foreground);
  }

  .menu-wrapper {
    position: relative;
  }

  .menu {
    position: absolute;
    right: 0;
    z-index: 40;
    margin-top: var(--size-1);
    width: 12rem;
    border-radius: var(--radius-2);
    border: 1px solid var(--foreground);
    background: var(--background);
    box-shadow: var(--shadow-3);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    width: 100%;
    padding: var(--size-2) var(--size-3);
    color: var(--foreground);
    background: none;
    border: none;
    text-decoration: none;
    cursor: pointer;
    transition: background 150ms var(--ease-2);

    &:hover {
      background: var(--muted);
    }
  }

  .track-error {
    margin-top: var(--size-2);
    padding: var(--size-2);
    border-radius: var(--radius-2);
    background: color-mix(in srgb, var(--destructive) 15%, transparent);
    color: var(--destructive);
  }

  .track-expanded {
    margin-top: var(--size-2);
  }

  .dialog-content {
    display: flex;
    flex-direction: column;
    gap: var(--size-4);

    & p {
      color: var(--muted-foreground);
    }
  }

  .dialog-actions {
    display: flex;
    gap: var(--size-2);
    justify-content: flex-end;
  }

  :global(.icon) {
    width: var(--size-3);
    height: var(--size-3);
  }

  :global(.track-play) {
    flex-shrink: 0;
  }

  :global(.track-play--active) {
    background: var(--primary);
    color: var(--background);
    border-color: var(--primary);
  }

</style>
