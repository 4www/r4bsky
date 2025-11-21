<script lang="ts">
  import { onMount } from 'svelte';
  import { parseTrackUrl } from '$lib/services/url-patterns';
  import { deleteTrackByUri } from '$lib/services/r4-service';
  import { setPlaylist } from '$lib/player/store';
  import { session } from '$lib/state/session';
  import { buildEditHash, buildViewHash } from '$lib/services/track-uri';
  import { Button, buttonVariants } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Play, MoreVertical, Pencil, Trash2, ExternalLink, Disc as DiscIcon, Pause } from 'lucide-svelte';
  import { cn, menuItemClass } from '$lib/utils';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { locale, translate } from '$lib/i18n';
  import Link from '$lib/components/Link.svelte';
  import { player } from '$lib/player/store';
  import { onDestroy } from 'svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';

  const {
    item,
    index = 0,
    items = [],
    context = null,
    editable = false,
    expandedContent,
    isDetailView = false,
    onSelectTrack,
    onEditTrack,
    onremove,
    showAuthor = true
  } = $props();
  let message = $state('');
  let showDeleteConfirm = $state(false);
  let deleting = $state(false);

  const t = (key, vars = {}) => translate($locale, key, vars);
  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let triggerRef = $state<HTMLElement | null>(null);

  function play() {
    setPlaylist(items && items.length ? items : [item], items && items.length ? index : 0, context);
  }

  function confirmDelete() {
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  async function remove() {
    message = '';
    deleting = true;
    showDeleteConfirm = false;
    try {
      await deleteTrackByUri(item.uri);
      // Call the parent callback to remove from list
      if (onremove) {
        onremove({ detail: { uri: item.uri } });
      }
      // Don't reset deleting here - component should be unmounted by parent
    } catch (e) {
      message = e?.message || String(e);
      deleting = false;
      console.error('Failed to delete track:', e);
    }
  }

  function editHref() {
    const handle = $session?.handle;
    return buildEditHash(handle, item.uri);
  }

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
  const discogsLink = $derived(item?.discogsUrl ?? item?.discogs_url ?? '');
  let playerState = $state(player.get());
  const unsubscribe = player.subscribe((value) => {
    playerState = value;
  });
  onDestroy(() => unsubscribe?.());
  const isActiveTrack = $derived.by(() => playerState?.playlist?.[playerState.index]?.uri === item?.uri);

  function viewHref() {
    return buildViewHash(authorHandle, item.uri);
  }

  function openEdit() {
    // If onEditTrack callback is provided, use it instead of navigation
    if (onEditTrack) {
      onEditTrack(item.uri);
      return;
    }

    // Otherwise, navigate to edit page (legacy behavior)
    const href = editHref();
    if (href) {
      const payload = {
        uri: item.uri,
        url: item.url,
        title: item.title,
        description: item.description,
        discogsUrl: item.discogsUrl || item.discogs_url || '',
      };
      goto(resolve(href), {
        state: { track: payload, returnTo: window.location.pathname },
        replaceState: false,
        noScroll: true,
        keepFocus: false,
      });
    }
  }

  function openDetail(event?: Event) {
    event?.preventDefault?.();

    // If onSelectTrack callback is provided, use it instead of navigation
    if (onSelectTrack) {
      onSelectTrack(item.uri);
      return;
    }

    // Otherwise, navigate to detail page (legacy behavior)
    const href = viewHref();
    if (href) {
      // Clone objects to avoid Svelte proxy serialization issues
      const navState: any = {
        returnTo: window.location.pathname,
        tracks: items ? JSON.parse(JSON.stringify(items)) : [],
        track: item ? JSON.parse(JSON.stringify(item)) : null,
        index,
        did: context?.key || item.authorDid || '',
        handle: authorHandle || (context?.handle?.replace?.(/^@/, '') ?? '')
      };
      goto(resolve(href), {
        state: navState,
        replaceState: false,
        noScroll: true,
        keepFocus: false,
      });
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() { menuOpen = false; }

  onMount(() => {
    function handleClick(event: MouseEvent) {
      if (!menuOpen) return;
      const target = event.target as Node;
      if (menuRef && menuRef.contains(target)) return;
      if (triggerRef && triggerRef.contains(target)) return;
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

<Card
  class={cn(
    "border-0 border-b border-border/50 bg-background transition-colors hover:bg-muted/20 overflow-visible rounded-none",
    isActiveTrack && "bg-primary/5 border-l-2 border-l-primary",
    isDetailView && !isActiveTrack && "bg-primary/5",
    isDetailView && isActiveTrack && "bg-primary/5 border-l-2 border-l-primary",
    deleting && "opacity-50 pointer-events-none"
  )}
>
  <CardHeader class="p-1.5">
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0 space-y-1">
        <div>
          <CardTitle class="text-sm font-semibold">
            <a
              href={viewHref() || '#'}
              onclick={openDetail}
              class="hover:text-primary transition-colors hover:underline cursor-pointer"
            >
              {item.title || t('trackItem.untitled')}
            </a>
          </CardTitle>
          {#if showAuthor && authorHandle}
            <CardDescription class="text-xs flex items-center gap-1 mt-0.5">
              <span class="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-foreground text-[0.55rem] font-semibold">
                @
              </span>
              <Link href={`/@${encodeURIComponent(authorHandle)}`} class="hover:text-primary transition-colors">
                {authorHandle}
              </Link>
            </CardDescription>
          {/if}
        </div>
        {#if item.description}
          <div class="rounded-md bg-muted/20 p-1.5">
            <p class="text-xs text-muted-foreground whitespace-pre-wrap leading-snug">
              {item.description}
            </p>
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-0.5 shrink-0">
        {#if discogsLink}
          <a
            href={discogsLink?.startsWith('http') ? discogsLink : resolve(discogsLink)}
            target="_blank"
            rel="noopener"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground transition-all"
            aria-label="Open Discogs"
          >
            <DiscIcon class="h-3 w-3" />
          </a>
        {/if}
        <a
          href={
            safeOpenUrl && safeOpenUrl !== '#'
              ? (safeOpenUrl.startsWith('http') ? safeOpenUrl : resolve(safeOpenUrl))
              : '#'
          }
          target="_blank"
          rel="noopener"
          class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground transition-all"
          aria-label={t('trackItem.openExternal')}
        >
          <ExternalLink class="h-3 w-3" />
        </a>

        <Button variant="primary" size="sm" class="h-7 px-2 text-xs ml-0.5" onclick={play}>
          <Play class="h-3 w-3 mr-1" />
          {t('trackItem.play')}
        </Button>

        <div class="relative">
            <button
              bind:this={triggerRef}
              type="button"
              class={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all",
                menuOpen
                  ? "bg-primary/10 border-primary/30 text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground"
              )}
              onclick={() => toggleMenu()}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical class="h-3.5 w-3.5" />
              <span class="sr-only">{t('trackItem.actions')}</span>
            </button>
            {#if menuOpen}
              <div
                bind:this={menuRef}
                class="absolute right-0 z-40 mt-1.5 w-40 rounded-md border bg-popover text-popover-foreground shadow-lg"
                role="menu"
              >
                {#if editable && editHref()}
                  <a
                    href={editHref()}
                    class={menuItemClass}
                    onclick={(e) => { e.preventDefault(); closeMenu(); openEdit(); }}
                  >
                    <Pencil class="h-4 w-4" />
                    {t('trackItem.edit')}
                  </a>
                {/if}
                <a
                  href={safeOpenUrl && safeOpenUrl !== '#'
                    ? (safeOpenUrl.startsWith('http') ? safeOpenUrl : resolve(safeOpenUrl))
                    : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={menuItemClass}
                  onclick={closeMenu}
                >
                  <ExternalLink class="h-4 w-4" />
                  Open media URL
                </a>
                {#if discogsLink}
                  <a
                    href={discogsLink?.startsWith('http') ? discogsLink : resolve(discogsLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class={menuItemClass}
                    onclick={closeMenu}
                  >
                    <DiscIcon class="h-4 w-4" />
                    Discogs
                  </a>
                {/if}
                {#if editable}
                  <div class="my-1 border-t"></div>
                  <button
                    type="button"
                    class={cn(menuItemClass, "text-muted-foreground")}
                    onclick={() => { closeMenu(); confirmDelete(); }}
                  >
                    <Trash2 class="h-4 w-4" />
                    {t('trackItem.delete')}
                  </button>
                {/if}
              </div>
            {/if}
          </div>
      </div>
    </div>
  </CardHeader>

  {#if message}
    <CardContent class="pt-0 pb-1.5 px-1.5">
      <div class="rounded-md bg-destructive/15 p-1.5 text-xs text-destructive">
        {message}
      </div>
    </CardContent>
  {/if}

  {#if expandedContent}
    <CardContent class="pt-0 pb-1.5 px-1.5">
      {@render expandedContent()}
    </CardContent>
  {/if}
</Card>

{#if showDeleteConfirm}
  <Dialog title="Delete track" onClose={cancelDelete}>
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        Are you sure you want to delete "{item.title || t('trackItem.untitled')}"? This action cannot be undone.
      </p>
      <div class="flex gap-2 justify-end">
        <Button variant="outline" onclick={cancelDelete}>
          Cancel
        </Button>
        <Button variant="destructive" onclick={remove}>
          Delete
        </Button>
      </div>
    </div>
  </Dialog>
{/if}
