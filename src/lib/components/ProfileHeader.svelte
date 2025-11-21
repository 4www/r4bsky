<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
  import { Button, buttonVariants } from './ui/button';
  import { cn, menuItemClass, menuTriggerClass } from '$lib/utils';
  import Link from '$lib/components/Link.svelte';
  import { PlayCircle, Loader2, MoreVertical, ExternalLink, Copy, Eye } from 'lucide-svelte';
  import { resolveHandle, listTracksByDid } from '$lib/services/r4-service';
  import { setPlaylist, player } from '$lib/player/store';
  import { onMount, onDestroy } from 'svelte';
  import { locale, translate } from '$lib/i18n';

  const {
    profile,
    handle,
    size = 'lg',
    class: extraClass = '',
    clickable = true,
    children
  } = $props();

  const t = (key, vars = {}) => translate($locale, key, vars);

  const sizeMap = {
    sm: { avatar: 'md', title: 'text-xl', description: 'text-sm' },
    md: { avatar: 'lg', title: 'text-2xl', description: 'text-base' },
    lg: { avatar: 'xl', title: 'text-3xl', description: 'text-base' },
  };

  const sizes = sizeMap[size] || sizeMap.lg;

  let loadingTracks = $state(false);
  let playerState = $state(player.get());
  const unsubscribe = player.subscribe((value) => {
    playerState = value;
  });
  onDestroy(() => unsubscribe?.());

  let menuOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let triggerRef = $state<HTMLElement | null>(null);

  const normalizedHandle = $derived(handle?.replace(/^@/, '') ?? '');
  const currentHandle = $derived.by(() => {
    const contextHandle = playerState?.context?.handle;
    const trackHandle = playerState?.playlist?.[playerState.index]?.authorHandle
      ?? playerState?.playlist?.[playerState.index]?.author_handle;
    const raw = contextHandle || trackHandle || '';
    return raw?.replace?.(/^@/, '') ?? '';
  });
  const isActiveProfile = $derived.by(() => normalizedHandle && currentHandle
    ? normalizedHandle.toLowerCase() === currentHandle.toLowerCase()
    : false);

  async function playAll(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (loadingTracks) return;
    loadingTracks = true;

    try {
      const did = await resolveHandle(handle);
      const { tracks } = await listTracksByDid(did);

      if (tracks.length > 0) {
        setPlaylist(tracks, 0, { type: 'profile', key: did, handle: normalizedHandle });
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
    } finally {
      loadingTracks = false;
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function copyProfileUrl() {
    const url = window.location.origin + `/@${normalizedHandle}`;
    navigator.clipboard.writeText(url);
    closeMenu();
  }

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
    'border border-border bg-card animate-in transition-colors shadow-sm hover:bg-muted/20',
    extraClass
  )}
>
  <CardHeader class="pb-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      {#if clickable}
        <Link
          href={`/@${handle}`}
          class="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0 flex-1"
        >
          <Avatar
            src={profile?.avatar}
            alt={profile?.displayName || handle}
            size={sizes.avatar}
          />
          <div class="min-w-0 flex-1">
            <CardTitle class={cn('flex items-center gap-2', sizes.title)}>
              <span class={cn(
                "inline-block px-1.5 py-0.5 rounded transition-colors",
                isActiveProfile ? "bg-primary text-background" : ""
              )}>
                {profile?.displayName || handle}
              </span>
            </CardTitle>
            <CardDescription class={cn(sizes.description, "mt-0")}>
              <Link href={`/@${handle}`} class="hover:text-primary transition-colors">
                @{handle}
              </Link>
            </CardDescription>
            {#if profile?.description && size === 'lg'}
              <p class="text-sm text-muted-foreground mt-2 max-w-xl">
                {profile.description}
              </p>
            {/if}
          </div>
        </Link>
      {:else}
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <Avatar
            src={profile?.avatar}
            alt={profile?.displayName || handle}
            size={sizes.avatar}
          />
          <div class="min-w-0 flex-1">
            <CardTitle class={cn('flex items-center gap-2', sizes.title)}>
              <span class={cn(
                "inline-block px-1.5 py-0.5 rounded transition-colors",
                isActiveProfile ? "bg-primary text-background" : ""
              )}>
                {profile?.displayName || handle}
              </span>
            </CardTitle>
            <CardDescription class={cn(sizes.description, "mt-0")}>
              <Link href={`/@${handle}`} class="hover:text-primary transition-colors">
                @{handle}
              </Link>
            </CardDescription>
            {#if profile?.description && size === 'lg'}
              <p class="text-sm text-muted-foreground mt-2 max-w-xl">
                {profile.description}
              </p>
            {/if}
          </div>
        </div>
      {/if}

      <div class="flex gap-2 items-center shrink-0">
        <Button
          variant="secondary"
          size="default"
          class={cn(
            isActiveProfile && "bg-primary text-background border border-primary shadow-sm hover:bg-primary/90"
          )}
          onclick={playAll}
          disabled={loadingTracks || isActiveProfile}
        >
          {#if loadingTracks}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <PlayCircle class="mr-1.5 h-4 w-4" />
          {/if}
          {t('trackItem.play')}
        </Button>

        {#if children}
          {@render children()}
        {/if}

        <div class="relative">
          <button
            bind:this={triggerRef}
            type="button"
            class={cn(menuTriggerClass(menuOpen), "h-9 w-9")}
            onclick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical class="h-4 w-4 text-current" />
            <span class="sr-only">{t('profile.actions')}</span>
          </button>
          {#if menuOpen}
            <div
              bind:this={menuRef}
              class="absolute right-0 z-40 mt-1.5 w-48 rounded-md border border-foreground bg-background text-foreground shadow-lg"
              role="menu"
            >
              <a
                href={`/@${normalizedHandle}`}
                class={menuItemClass}
                onclick={closeMenu}
              >
                <Eye class="h-4 w-4" />
                {t('profile.viewProfile')}
              </a>
              <a
                href={`https://bsky.app/profile/${normalizedHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                class={menuItemClass}
                onclick={closeMenu}
              >
                <ExternalLink class="h-4 w-4" />
                {t('profile.openInBluesky')}
              </a>
              <button
                type="button"
                class={menuItemClass}
                onclick={copyProfileUrl}
              >
                <Copy class="h-4 w-4" />
                {t('profile.copyLink')}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </CardHeader>
</Card>
