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
  import { Play, MoreVertical, Pencil, Trash2, ExternalLink, Disc as DiscIcon } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { locale, translate } from '$lib/i18n';
  import Link from '$lib/components/Link.svelte';

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
        state: { track: payload, modal: true },
        replaceState: false,
        noScroll: false,
        keepFocus: false,
      });
    }
  }

  function openDetail(event?: Event) {
    event?.preventDefault?.();
    const href = viewHref();
    if (href) {
      goto(resolve(href));
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

<Card class="border-2">
  <CardHeader class="pb-4">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <CardTitle class="text-xl flex-1 min-w-0">
            <Link href={viewHref() || '/'} class="hover:text-primary transition-colors font-bold" onclick={openDetail}>
              {item.title || t('trackItem.untitled')}
            </Link>
          </CardTitle>
          <div class="flex items-center gap-1 shrink-0">
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
            {#if discogsLink}
              <a
                href={discogsLink?.startsWith('http') ? discogsLink : resolve(discogsLink)}
                target="_blank"
                rel="noopener"
                class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Open Discogs"
              >
                <DiscIcon class="h-3.5 w-3.5" />
              </a>
            {/if}
          </div>
        </div>
        {#if authorHandle}
          <CardDescription class="text-base flex items-center gap-2">
            <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              @
            </span>
            <Link href={`/@${encodeURIComponent(authorHandle)}`} class="hover:text-primary transition-colors">
              {authorHandle}
            </Link>
          </CardDescription>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <Button size="default" class="shadow-md" onclick={play}>
          <Play class="h-4 w-4 mr-2" />
          {t('trackItem.play')}
        </Button>

        {#if editable}
          <div class="relative">
            <button
              bind:this={triggerRef}
              type="button"
              class={buttonVariants({ variant: 'ghost', size: 'icon' })}
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
                class="absolute right-0 z-40 mt-2 w-44 rounded-md border bg-popover text-popover-foreground shadow-lg"
                role="menu"
              >
                {#if editHref()}
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onclick={() => { closeMenu(); openEdit(); }}
                  >
                    <Pencil class="h-4 w-4" />
                    {t('trackItem.edit')}
                  </button>
                {/if}
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onclick={() => { closeMenu(); openExternalUrl(); }}
                >
                  <ExternalLink class="h-4 w-4" />
                  {t('trackItem.openUrl')}
                </button>
                {#if discogsLink}
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onclick={() => { closeMenu(); openDiscogs(); }}
                  >
                    <DiscIcon class="h-4 w-4" />
                    Discogs
                  </button>
                {/if}
                <div class="my-1 border-t"></div>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
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
    <CardContent class="pt-0">
      <div class="rounded-lg bg-muted/30 border border-muted p-4">
        <p class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {item.description}
        </p>
      </div>
    </CardContent>
  {/if}

  {#if message}
    <CardContent class="pt-0">
      <div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
        {message}
      </div>
    </CardContent>
  {/if}
</Card>
