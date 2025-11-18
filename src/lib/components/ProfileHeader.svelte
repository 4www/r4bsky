<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
  import { resolve } from '$app/paths';
  import { cn } from '$lib/utils';

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
</script>

<Card class={cn('border-2 shadow-lg animate-in', extraClass)}>
  <CardHeader class="pb-4">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      {#if clickable}
        <a
          href={resolve(`/@${handle}`)}
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
        </a>
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

      {#if children}
        <div class="shrink-0">
          {@render children()}
        </div>
      {/if}
    </div>
  </CardHeader>
</Card>
