<script lang="ts">
  import { page } from '$app/stores';
  import Link from '$lib/components/Link.svelte';
  import { cn } from '$lib/utils';
  import { locale, translate } from '$lib/i18n';
  import { Music, Users, Plus } from 'lucide-svelte';
  import { base } from '$app/paths';
  import { session } from '$lib/state/session';

  const { handle } = $props();
  const t = (key, vars = {}) => translate($locale, key, vars);

  const currentPath = $derived($page.url.pathname);
  const profilePath = `/@${handle}`;
  const followingPath = `/@${handle}/favorites`;
  const addPath = `/@${handle}/add`;

  const isTracksActive = $derived(currentPath === (base + profilePath) || currentPath === profilePath);
  const isFollowingActive = $derived(currentPath === (base + followingPath) || currentPath === followingPath);
  const isAddActive = $derived(currentPath === (base + addPath) || currentPath === addPath);

  const isOwnProfile = $derived($session?.handle === handle);

  const linkClass = (active: boolean) => cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border-2',
    active
      ? 'text-foreground border-primary shadow-sm'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground border-transparent'
  );
</script>

<nav class="flex gap-2 mb-4 justify-center">
  <div class="inline-flex gap-1.5 p-1.5 rounded-full bg-muted/40 border border-muted">
    <Link href={profilePath} class={linkClass(isTracksActive)}>
      <Music class="h-3.5 w-3.5" />
      {t('profileNav.tracks')}
    </Link>
    <Link href={followingPath} class={linkClass(isFollowingActive)}>
      <Users class="h-3.5 w-3.5" />
      {t('profileNav.following')}
    </Link>
    {#if isOwnProfile}
      <Link href={addPath} class={linkClass(isAddActive)}>
        <Plus class="h-3.5 w-3.5" />
        {t('nav.links.add')}
      </Link>
    {/if}
  </div>
</nav>
