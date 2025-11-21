<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
  import { Button, buttonVariants } from './ui/button';
  import { cn, menuItemClass } from '$lib/utils';
  import Link from '$lib/components/Link.svelte';
  import { PlayCircle, Loader2, MoreVertical, ExternalLink, Copy } from 'lucide-svelte';
  import { resolveHandle, listTracksByDid } from '$lib/services/r4-service';
  import { setPlaylist, player } from '$lib/player/store';
  import { onMount, onDestroy } from 'svelte';

  const {
    profile,
    handle,
    size = 'lg',
    class: extraClass = '',
    clickable = true,
    children
  } = $props();

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
    'border border-border bg-card animate-in transition-colors shadow-sm',
    isActiveProfile
      ? 'border-primary/40 bg-primary/5 shadow-md'
      : 'hover:bg-muted/20',
    extraClass
  )}
>
  <CardHeader class="pb-4">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {#if clickable}
        <Link
          href={`/@${handle}`}
          class="flex items-center gap-3 sm:gap-4 hover:opacity-80 transition-opacity min-w-0 w-full sm:w-auto"
        >
          <Avatar
            src={profile?.avatar}
            alt={profile?.displayName || handle}
            size={sizes.avatar}
          />
          <div class="min-w-0 flex-1">
            <CardTitle class={cn('mb-1 flex items-center gap-2', sizes.title)}>
              {profile?.displayName || handle}
            </CardTitle>
            <CardDescription class={sizes.description}>
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
        <div class="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
          <Avatar
            src={profile?.avatar}
            alt={profile?.displayName || handle}
            size={sizes.avatar}
          />
          <div class="min-w-0 flex-1">
            <CardTitle class={cn('mb-1 flex items-center gap-2', sizes.title)}>
              {profile?.displayName || handle}
            </CardTitle>
            <CardDescription class={sizes.description}>
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

      <div class="flex gap-2 sm:gap-3 items-center w-full sm:w-auto sm:shrink-0">
        <Button
          variant="primary"
          size={size === 'sm' ? 'sm' : 'lg'}
          class="flex-1 sm:flex-initial"
          onclick={playAll}
          disabled={loadingTracks}
        >
          {#if loadingTracks}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <PlayCircle class="mr-2 h-4 w-4" />
          {/if}
          Play
        </Button>

        {#if children}
          {@render children()}
        {/if}

        <div class="relative">
          <button
            bind:this={triggerRef}
            type="button"
            class={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md border transition-all",
              menuOpen
                ? "bg-primary/10 border-primary/30 text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground"
            )}
            onclick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical class="h-4 w-4" />
            <span class="sr-only">Profile actions</span>
          </button>
          {#if menuOpen}
            <div
              bind:this={menuRef}
              class="absolute right-0 z-40 mt-1.5 w-48 rounded-md border bg-popover text-popover-foreground shadow-lg"
              role="menu"
            >
              <a
                href={`https://bsky.app/profile/${normalizedHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                class={menuItemClass}
                onclick={closeMenu}
              >
                <ExternalLink class="h-4 w-4" />
                Open in Bluesky
              </a>
              <button
                type="button"
                class={menuItemClass}
                onclick={copyProfileUrl}
              >
                <Copy class="h-4 w-4" />
                Copy profile link
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </CardHeader>
</Card>
