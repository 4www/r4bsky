<script lang="ts">
  import { MoreVertical, Eye, Pencil, Trash2, ExternalLink, Disc as DiscIcon } from 'lucide-svelte';
  import { clsx } from 'clsx';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { locale, translate } from '$lib/i18n';
  import { session } from '$lib/state/session';
  import { buildEditHash, buildViewHash } from '$lib/services/track-uri';

  const {
    track,
    index = 0,
    isActive = false,
    context = null,
    onplay,
    ondelete
  } = $props();

  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let triggerRef = $state<HTMLElement | null>(null);

  const t = (key: string, vars = {}) => translate($locale, key, vars);

  const trackHandle = $derived((track?.authorHandle || track?.author_handle || context?.handle || '').replace(/^@/, ''));
  const trackHref = $derived(track?.uri && trackHandle ? buildViewHash(trackHandle, track.uri) : null);
  const trackDid = $derived(track?.authorDid || track?.author_did || '');
  const isEditable = $derived($session?.did && trackDid && $session.did === trackDid);
  const discogsLink = $derived(track?.discogsUrl || track?.discogs_url || '');

  function toggleMenu() { menuOpen = !menuOpen; }
  function closeMenu() { menuOpen = false; }

  function handleClick(e: MouseEvent) {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      onplay?.();
    }
  }
</script>

<svelte:window
  onclick={(e) => {
    if (!menuOpen) return;
    const target = e.target as Node;
    if (menuRef?.contains(target) || triggerRef?.contains(target)) return;
    menuOpen = false;
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') menuOpen = false;
  }}
/>

<article class="track">
  <div class="track-row">
    <a href={trackHref || '#'} class="track-info" onclick={handleClick}>
      <span class={clsx("track-title", isActive && "track-title--active")}>
        {track.title || t('trackItem.untitled')}
      </span>
      {#if track.description}
        <p class="track-description">{track.description}</p>
      {/if}
    </a>
    <div class="track-actions">
      <div class="menu-wrapper">
        <button
          bind:this={triggerRef}
          type="button"
          class={clsx("icon-btn", menuOpen && "icon-btn--active")}
          onclick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(); }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical class="icon" />
          <span class="sr-only">{t('trackItem.actions')}</span>
        </button>
        {#if menuOpen}
          <div bind:this={menuRef} class="menu" role="menu">
            <button
              type="button"
              class="menu-item"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
                if (trackHref) goto(resolve(trackHref));
              }}
            >
              <Eye class="icon" />
              {t('trackItem.view')}
            </button>
            {#if isEditable && track.uri && trackHandle}
              <button
                type="button"
                class="menu-item"
                onclick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeMenu();
                  const href = buildEditHash(trackHandle, track.uri);
                  if (href) goto(resolve(href));
                }}
              >
                <Pencil class="icon" />
                {t('trackItem.edit')}
              </button>
            {/if}
            {#if track.url}
              <button
                type="button"
                class="menu-item"
                onclick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeMenu();
                  window.open(track.url, '_blank', 'noopener');
                }}
              >
                <ExternalLink class="icon" />
                {t('trackItem.openMediaUrl')}
              </button>
            {/if}
            {#if discogsLink}
              <button
                type="button"
                class="menu-item"
                onclick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeMenu();
                  window.open(discogsLink, '_blank', 'noopener');
                }}
              >
                <DiscIcon class="icon" />
                Open Discogs
              </button>
            {/if}
            {#if isEditable && ondelete}
              <button
                type="button"
                class="menu-item menu-item--destructive"
                onclick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${track.title || 'Untitled'}"?`)) {
                    ondelete(track.uri);
                  } else {
                    closeMenu();
                  }
                }}
              >
                <Trash2 class="icon" />
                {t('trackItem.delete')}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</article>

<style>
  .track {
    padding: var(--size-2) var(--size-3);
    background: var(--color-background);
    border-bottom: 1px solid var(--color-foreground);
    transition: background 150ms var(--ease-2);
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: var(--size-2);
  }

  .track-info {
    flex: 1;
    min-width: 0;
    text-decoration: none;
    color: inherit;
  }

  .track-title {
    display: block;
    font-weight: var(--font-weight-6);
    color: var(--color-foreground);
    transition: color 150ms var(--ease-2);
  }

  .track-info:hover .track-title {
    color: var(--color-primary);
    text-decoration: underline;
  }

  .track-title--active {
    background: var(--color-primary);
    color: var(--color-background);
    padding: 0 var(--size-1);
    border-radius: var(--radius-1);
  }

  .track-info:hover .track-title--active {
    color: var(--color-background);
    text-decoration: none;
  }

  .track-description {
    color: var(--color-muted-foreground);
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
    color: var(--color-muted-foreground);
    cursor: pointer;
    transition: all 150ms var(--ease-2);
  }

  .icon-btn:hover {
    background: var(--color-muted);
    border-color: var(--color-border);
    color: var(--color-foreground);
  }

  .icon-btn--active {
    background: var(--color-muted);
    border-color: var(--color-border);
    color: var(--color-foreground);
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
    border: 1px solid var(--color-foreground);
    background: var(--color-background);
    box-shadow: var(--shadow-3);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    width: 100%;
    padding: var(--size-2) var(--size-3);
    color: var(--color-foreground);
    background: none;
    border: none;
    text-decoration: none;
    cursor: pointer;
    transition: background 150ms var(--ease-2);
  }

  .menu-item:hover {
    background: var(--color-muted);
  }

  .menu-item--destructive {
    color: var(--color-destructive);
  }

  .menu-item--destructive:hover {
    color: var(--color-destructive);
  }

  .icon {
    width: var(--size-3);
    height: var(--size-3);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
