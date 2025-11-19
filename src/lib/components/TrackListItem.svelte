<script lang="ts">
  import { onMount } from 'svelte';
  import { parseTrackUrl } from '$lib/services/url-patterns';
  import { deleteTrackByUri } from '$lib/services/r4-service';
  import { setPlaylist } from '$lib/player/store';
  import { session } from '$lib/state/session';
  import { buildEditHash, buildViewHash } from '$lib/services/track-uri';
  import { createEventDispatcher } from 'svelte';
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

  const {
    item,
    index = 0,
    items = [],
    context = null,
    editable = false,
  } = $props();
  let message = $state('');
  const dispatch = createEventDispatcher();

  const t = (key, vars = {}) => translate($locale, key, vars);
  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let triggerRef = $state<HTMLElement | null>(null);

  function play() {
    setPlaylist(items && items.length ? items : [item], items && items.length ? index : 0, context);
  }

  async function remove() {
    message = '';
    try {
      await deleteTrackByUri(item.uri);
      dispatch('remove', { uri: item.uri });
    } catch (e) {
      message = e?.message || String(e);
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

  const authorHandle = $derived(context?.handle ?? item.authorHandle ?? null);
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
    const href = viewHref();
    if (href) {
      goto(resolve(href), {
        state: { returnTo: window.location.pathname },
        replaceState: false,
        noScroll: true,
        keepFocus: false,
      });
    }
  }

  function openExternalUrl() {
    const url = safeOpenUrl;
    if (!url || url === '#') return;
    window.open(url, '_blank', 'noopener');
  }

  function openDiscogs() {
    const link = discogsLink;
    if (!link) return;
    window.open(link, '_blank', 'noopener');
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
    "border border-border bg-background transition-colors shadow-sm hover:bg-muted/20",
    isActiveTrack ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-lg shadow-primary/20" : ""
  )}
>
  <CardHeader class="p-2 pb-1">
    <div class="flex items-start justify-between gap-1.5">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1 mb-0.5">
          {#if isActiveTrack}
            <div class="shrink-0 text-primary">
              <DiscIcon class="h-4 w-4 animate-spin" style="animation-duration: 3s;" />
            </div>
          {/if}
          <CardTitle class="text-sm flex-1 min-w-0 font-semibold">
            <Link href={viewHref() || '/'} class={cn("hover:text-primary transition-colors", isActiveTrack ? "text-primary" : "")} onclick={openDetail}>
              {item.title || t('trackItem.untitled')}
            </Link>
          </CardTitle>
          <div class="flex items-center gap-1 shrink-0">
            {#if discogsLink}
              <a
                href={discogsLink?.startsWith('http') ? discogsLink : resolve(discogsLink)}
                target="_blank"
                rel="noopener"
                class="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Open Discogs"
              >
                <DiscIcon class="h-3.5 w-3.5" />
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
              class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label={t('trackItem.openExternal')}
            >
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        {#if authorHandle}
            <CardDescription class="text-xs flex items-center gap-1">
              <span class="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[0.55rem] font-semibold">
                @
              </span>
              <Link href={`/@${encodeURIComponent(authorHandle)}`} class="hover:text-primary transition-colors">
                {authorHandle}
              </Link>
            </CardDescription>
          {/if}
      </div>

      <div class="flex items-center gap-1">
        <Button size="sm" class="shadow h-7 px-2 text-xs" onclick={play}>
          <Play class="h-3 w-3 mr-1" />
          {t('trackItem.play')}
        </Button>

        {#if editable}
          <div class="relative">
            <button
              bind:this={triggerRef}
              type="button"
              class={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border-2 transition-all",
                menuOpen
                  ? "border-primary text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
              onclick={() => toggleMenu()}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical class="h-4 w-4" />
              <span class="sr-only">{t('trackItem.actions')}</span>
            </button>
            {#if menuOpen}
              <div
                bind:this={menuRef}
                class="absolute right-0 z-40 mt-1.5 w-40 rounded-md border bg-popover text-popover-foreground shadow-lg"
                role="menu"
              >
                {#if editHref()}
                  <button
                    type="button"
                    class={menuItemClass}
                    onclick={() => { closeMenu(); openEdit(); }}
                  >
                    <Pencil class="h-4 w-4" />
                    {t('trackItem.edit')}
                  </button>
                {/if}
                <button
                  type="button"
                  class={menuItemClass}
                  onclick={() => { closeMenu(); openExternalUrl(); }}
                >
                  <ExternalLink class="h-4 w-4" />
                  {t('trackItem.openUrl')}
                </button>
                {#if discogsLink}
                  <button
                    type="button"
                    class={menuItemClass}
                    onclick={() => { closeMenu(); openDiscogs(); }}
                  >
                    <DiscIcon class="h-4 w-4" />
                    Discogs
                  </button>
                {/if}
                <div class="my-1 border-t"></div>
                <button
                  type="button"
                  class={cn(menuItemClass, "text-muted-foreground")}
                  onclick={() => { closeMenu(); remove(); }}
                >
                  <Trash2 class="h-4 w-4" />
                  {t('trackItem.delete')}
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </CardHeader>

  {#if item.description}
    <CardContent class="pt-0 pb-2 px-2">
      <div class="rounded-md bg-muted/30 border border-muted/60 p-1.5">
        <p class="text-xs text-muted-foreground whitespace-pre-wrap leading-snug">
          {item.description}
        </p>
      </div>
    </CardContent>
  {/if}

  {#if message}
    <CardContent class="pt-0 pb-2 px-2">
      <div class="rounded-md bg-destructive/15 p-1.5 text-xs text-destructive">
        {message}
      </div>
    </CardContent>
  {/if}
</Card>
