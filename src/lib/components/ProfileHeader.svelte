<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
  import { Button } from './ui/button';
  import { cn } from '$lib/utils';
  import Link from '$lib/components/Link.svelte';
  import { PlayCircle, Loader2 } from 'lucide-svelte';
  import { resolveHandle, listTracksByDid } from '$lib/services/r4-service';
  import { setPlaylist } from '$lib/player/store';

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
</script>

<Card class={cn('border-2 shadow-lg animate-in', extraClass)}>
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
            <CardTitle class={cn('mb-1', sizes.title)}>
              {profile?.displayName || handle}
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
            <CardTitle class={cn('mb-1', sizes.title)}>
              {profile?.displayName || handle}
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

      <div class="shrink-0 flex gap-3 flex-wrap items-center">
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
      </div>
    </div>
  </CardHeader>
</Card>
