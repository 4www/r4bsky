<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
  import { Button, buttonVariants } from './ui/button';
  import { cn, menuItemClass } from '$lib/utils';
  import Link from '$lib/components/Link.svelte';
  import { PlayCircle, Loader2, Disc as DiscIcon, MoreVertical, ExternalLink, Copy } from 'lucide-svelte';
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
        setPlaylist(tracks, 0);
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

  function openInBluesky() {
    const url = `https://bsky.app/profile/${normalizedHandle}`;
    window.open(url, '_blank', 'noopener');
    closeMenu();
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
    'border border-border bg-background animate-in transition-colors shadow-sm hover:bg-muted/20',
    isActiveProfile ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-lg shadow-primary/20' : '',
    extraClass
  )}
>
  <CardHeader class="pb-4">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      {#if clickable}
        <Link
          href={`/@${handle}`}
          class="flex items-center gap-4 hover:opacity-80 transition-opacity min-w-0"
        >
          <Avatar
            src={profile?.avatar}
            alt={profile?.displayName || handle}
            size={sizes.avatar}
          />
          <div class="min-w-0">
            <CardTitle class={cn('mb-1 flex items-center gap-2', sizes.title)}>
              {#if isActiveProfile}
                <DiscIcon class="h-5 w-5 text-primary animate-spin" style="animation-duration: 3s;" />
              {/if}
              <span class={isActiveProfile ? "text-primary" : ""}>
                {profile?.displayName || handle}
              </span>
            </CardTitle>
            <CardDescription class={sizes.description}>
              @{handle}
            </CardDescription>
            {#if profile?.description && size === 'lg'}
              <p class="text-sm text-muted-foreground mt-2 max-w-xl">
                {profile.description}
              </p>
            {/if}
          </div>
        </Link>
      {:else}
        <div class="flex items-center gap-4 min-w-0">
          <Avatar
            src={profile?.avatar}
            alt={profile?.displayName || handle}
            size={sizes.avatar}
          />
          <div class="min-w-0">
            <CardTitle class={cn('mb-1 flex items-center gap-2', sizes.title)}>
              {#if isActiveProfile}
                <DiscIcon class="h-5 w-5 text-primary animate-spin" style="animation-duration: 3s;" />
              {/if}
              <span class={isActiveProfile ? "text-primary" : ""}>
                {profile?.displayName || handle}
              </span>
            </CardTitle>
            <CardDescription class={sizes.description}>
              @{handle}
            </CardDescription>
            {#if profile?.description && size === 'lg'}
              <p class="text-sm text-muted-foreground mt-2 max-w-xl">
                {profile.description}
              </p>
            {/if}
          </div>
        </div>
      {/if}

      <div class={cn('shrink-0 flex gap-3 flex-wrap items-center', isActiveProfile ? 'text-primary' : '')}>
        <Button
          size={size === 'sm' ? 'sm' : 'lg'}
          class="shadow-md"
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
            class={buttonVariants({ variant: 'ghost', size: 'icon' })}
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
              <button
                type="button"
                class={menuItemClass}
                onclick={openInBluesky}
              >
                <ExternalLink class="h-4 w-4" />
                Open in Bluesky
              </button>
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
